import { CommandTimeoutError } from "@tenkicloud/sandbox";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_OUTPUT_BYTES,
  DEFAULT_TIMEOUT_MS,
  abortedResult,
  appendOutput,
  appendRunDiagnostic,
  decodeBytes,
  extractSignal,
  formatRunDiagnostic,
  initOutputBuffer,
  isCommandTimeoutError,
  normalizeEnv,
  resolveOutput,
  stringToReadableStream,
  timedOutResult,
  truncateOutput,
} from "./utils";

const enc = new TextEncoder();

describe("constants", () => {
  it("exposes sane defaults", () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(60_000);
    expect(DEFAULT_MAX_OUTPUT_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe("decodeBytes", () => {
  it("passes strings through", () => {
    expect(decodeBytes("hello")).toBe("hello");
  });

  it("decodes Uint8Array", () => {
    expect(decodeBytes(enc.encode("héllo"))).toBe("héllo");
  });

  it("coerces other values and handles nullish", () => {
    expect(decodeBytes(42)).toBe("42");
    expect(decodeBytes(null)).toBe("");
    expect(decodeBytes(undefined)).toBe("");
  });
});

describe("OutputBuffer", () => {
  it("accumulates string, Buffer, and Uint8Array chunks", () => {
    const buffer = initOutputBuffer();
    appendOutput(buffer, "a", 100);
    appendOutput(buffer, Buffer.from("b"), 100);
    appendOutput(buffer, enc.encode("c"), 100);
    const resolved = resolveOutput(buffer, undefined, 100);
    expect(resolved.content).toBe("abc");
    expect(resolved.truncated).toBe(false);
  });

  it("coerces unknown chunk types", () => {
    const buffer = initOutputBuffer();
    appendOutput(buffer, 123, 100);
    expect(resolveOutput(buffer, undefined, 100).content).toBe("123");
  });

  it("flags truncation when maxBytes is 0", () => {
    const buffer = initOutputBuffer();
    appendOutput(buffer, "x", 0);
    expect(buffer.truncated).toBe(true);
    expect(resolveOutput(buffer, undefined, 0).truncated).toBe(true);
  });

  it("truncates a chunk that overflows the remaining budget", () => {
    const buffer = initOutputBuffer();
    appendOutput(buffer, "abcdef", 3);
    const resolved = resolveOutput(buffer, undefined, 3);
    expect(resolved.content).toBe("abc");
    expect(resolved.truncated).toBe(true);
  });

  it("drops a multi-byte code point split by the byte cap", () => {
    const buffer = initOutputBuffer();
    // "😀" (U+1F600) = F0 9F 98 80 (4 bytes); a 2-byte cap lands mid-code-point.
    appendOutput(buffer, new Uint8Array([0xf0, 0x9f, 0x98, 0x80]), 2);
    const resolved = resolveOutput(buffer, undefined, 2);
    expect(resolved.truncated).toBe(true);
    // The partial code point is dropped, not decoded to a 3-byte "�" that would
    // overshoot the 2-byte cap.
    expect(resolved.content).toBe("");
    expect(Buffer.byteLength(resolved.content, "utf-8")).toBeLessThanOrEqual(2);
  });

  it("keeps whole code points before a byte-cap truncation", () => {
    const buffer = initOutputBuffer();
    // "a😀" = 61 F0 9F 98 80 (5 bytes); a 3-byte cap keeps "a", drops the emoji.
    appendOutput(buffer, new Uint8Array([0x61, 0xf0, 0x9f, 0x98, 0x80]), 3);
    const resolved = resolveOutput(buffer, undefined, 3);
    expect(resolved.content).toBe("a");
    expect(resolved.truncated).toBe(true);
    expect(Buffer.byteLength(resolved.content, "utf-8")).toBeLessThanOrEqual(3);
  });

  it("marks truncation once the budget is already exhausted", () => {
    const buffer = initOutputBuffer();
    appendOutput(buffer, "abc", 3);
    appendOutput(buffer, "d", 3);
    expect(buffer.truncated).toBe(true);
  });

  it("returns empty for an untouched buffer with no fallback", () => {
    const resolved = resolveOutput(initOutputBuffer(), undefined, 100);
    expect(resolved).toEqual({ content: "", truncated: false });
  });

  it("falls back to the provided string when nothing was streamed", () => {
    const resolved = resolveOutput(initOutputBuffer(), "fallback", 100);
    expect(resolved.content).toBe("fallback");
  });

  // A pump that died mid-stream holds only a prefix of the real output, so the
  // completed run's aggregate is the more complete source.
  it("prefers the aggregate when the pump failed mid-stream", () => {
    const buffer = initOutputBuffer();
    appendOutput(buffer, "partial", 100);
    buffer.failed = true;
    expect(resolveOutput(buffer, "partial output, complete", 100)).toEqual({
      content: "partial output, complete",
      truncated: false,
    });
  });

  it("still applies the byte cap to the aggregate after a failed pump", () => {
    const buffer = initOutputBuffer();
    appendOutput(buffer, "par", 100);
    buffer.failed = true;
    expect(resolveOutput(buffer, "partial output", 3)).toEqual({ content: "par", truncated: true });
  });

  it("flags truncation when the pump failed and there is no aggregate", () => {
    const buffer = initOutputBuffer();
    appendOutput(buffer, "partial", 100);
    buffer.failed = true;
    expect(resolveOutput(buffer, undefined, 100)).toEqual({
      content: "partial",
      truncated: true,
    });
  });

  it("resolves to empty when every captured chunk was zero-length", () => {
    const buffer = initOutputBuffer();
    appendOutput(buffer, "", 100);
    appendOutput(buffer, "x", 0);
    // Truncated with nothing buffered: the buffer wins over the fallback.
    expect(resolveOutput(buffer, "fallback", 100)).toEqual({ content: "", truncated: true });
  });

  it("drops a run of stray continuation bytes", () => {
    const buffer = initOutputBuffer();
    // 0x80 0x80 is a code point tail with no lead byte — malformed all the way
    // back to the start of the buffer.
    appendOutput(buffer, new Uint8Array([0x80, 0x80]), 100);
    expect(resolveOutput(buffer, undefined, 100).content).toBe("");
  });

  it("drops a trailing invalid lead byte", () => {
    const buffer = initOutputBuffer();
    // 0xF8 is not a valid UTF-8 lead byte in any length class.
    appendOutput(buffer, new Uint8Array([0x61, 0xf8]), 100);
    expect(resolveOutput(buffer, undefined, 100).content).toBe("a");
  });
});

describe("truncateOutput", () => {
  it("returns empty input untouched", () => {
    expect(truncateOutput("", 10)).toEqual({ content: "", truncated: false });
  });

  it("truncates everything when maxBytes is 0", () => {
    expect(truncateOutput("abc", 0)).toEqual({ content: "", truncated: true });
  });

  it("returns short strings intact", () => {
    expect(truncateOutput("abc", 10)).toEqual({ content: "abc", truncated: false });
  });

  it("walks back to a codepoint boundary", () => {
    // "€" is 3 bytes; cutting at 2 bytes must not split it.
    const result = truncateOutput("a€b", 2);
    expect(result.truncated).toBe(true);
    expect(result.content).toBe("a");
  });

  it("walks back past a split two-byte codepoint", () => {
    // "é" is 2 bytes (C3 A9); a 2-byte cap lands on its lead byte.
    const result = truncateOutput("aé", 2);
    expect(result.truncated).toBe(true);
    expect(result.content).toBe("a");
  });
});

describe("normalizeEnv", () => {
  it("returns empty object for undefined", () => {
    expect(normalizeEnv(undefined)).toEqual({});
  });

  it("drops nullish and coerces values", () => {
    expect(normalizeEnv({ A: "1", B: undefined, C: "3" })).toEqual({ A: "1", C: "3" });
  });
});

describe("stringToReadableStream", () => {
  const readAll = async (stream: ReadableStream<Uint8Array>): Promise<string> => {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
  };

  it("streams the string contents", async () => {
    expect(await readAll(stringToReadableStream("hello"))).toBe("hello");
  });

  it("closes immediately for empty input", async () => {
    expect(await readAll(stringToReadableStream(""))).toBe("");
  });
});

describe("extractSignal", () => {
  it("returns the signal string when present", () => {
    expect(extractSignal({ signal: "SIGKILL" })).toBe("SIGKILL");
  });

  it("returns undefined for empty/missing/non-object", () => {
    expect(extractSignal({ signal: "" })).toBeUndefined();
    expect(extractSignal({})).toBeUndefined();
    expect(extractSignal(null)).toBeUndefined();
    expect(extractSignal("nope")).toBeUndefined();
  });
});

describe("formatRunDiagnostic", () => {
  it("names a known errno", () => {
    expect(formatRunDiagnostic({ exitCode: 127, errno: 2, reason: "exec_failed" })).toBe(
      "tenki: exec failed: ENOENT (errno 2), reason=exec_failed",
    );
  });

  it("falls back to the raw number for an unmapped errno", () => {
    expect(formatRunDiagnostic({ exitCode: -1, errno: 999, reason: "exit" })).toBe(
      "tenki: exec failed: errno 999",
    );
  });

  it("reports an errno failure even when the exit looks normal", () => {
    // A wait-stage errno can arrive with exitCode 0; the failure still matters.
    expect(formatRunDiagnostic({ exitCode: 0, errno: 13, reason: "" })).toBe(
      "tenki: exec failed: EACCES (errno 13)",
    );
  });

  it("stays silent on a successful run", () => {
    expect(formatRunDiagnostic({ exitCode: 0, errno: 0, reason: "exit" })).toBeUndefined();
  });

  it("stays silent for an unrecognized reason on a successful run", () => {
    // `reason` is free-form guest-agent text — it must not decorate every result.
    expect(formatRunDiagnostic({ exitCode: 0, errno: 0, reason: "whatever" })).toBeUndefined();
  });

  it("surfaces an unrecognized reason when the run failed", () => {
    expect(formatRunDiagnostic({ exitCode: 137, errno: 0, reason: "oom_killed" })).toBe(
      "tenki: run ended: reason=oom_killed",
    );
  });

  // The diagnostic is documented as one line and is folded into stderr, so a
  // multi-line guest-agent reason must not break it across lines.
  it("collapses a multiline reason into a single line", () => {
    expect(
      formatRunDiagnostic({ exitCode: 127, errno: 2, reason: "exec failed:\n  no such file\r\nx" }),
    ).toBe("tenki: exec failed: ENOENT (errno 2), reason=exec failed: no such file x");
  });

  it("collapses a multiline reason with no errno", () => {
    expect(formatRunDiagnostic({ exitCode: 137, errno: 0, reason: "oom\nkilled" })).toBe(
      "tenki: run ended: reason=oom killed",
    );
  });

  it("surfaces an unrecognized reason when the run was signaled", () => {
    expect(formatRunDiagnostic({ exitCode: 0, signal: "KILL", reason: "engine_terminated" })).toBe(
      "tenki: run ended: reason=engine_terminated",
    );
  });

  it("ignores reasons already covered by exitCode/signal", () => {
    expect(formatRunDiagnostic({ exitCode: 2, errno: 0, reason: "exit" })).toBeUndefined();
    expect(
      formatRunDiagnostic({ exitCode: 0, signal: "TERM", reason: "signaled" }),
    ).toBeUndefined();
  });

  it("returns undefined for a missing or non-object result", () => {
    expect(formatRunDiagnostic(undefined)).toBeUndefined();
    expect(formatRunDiagnostic(null)).toBeUndefined();
    expect(formatRunDiagnostic("nope")).toBeUndefined();
    expect(formatRunDiagnostic({})).toBeUndefined();
  });
});

describe("appendRunDiagnostic", () => {
  it("returns stderr untouched when there is no diagnostic", () => {
    expect(appendRunDiagnostic("boom\n", undefined)).toBe("boom\n");
    expect(appendRunDiagnostic("", undefined)).toBe("");
  });

  it("stands alone when stderr is empty", () => {
    expect(appendRunDiagnostic("", "tenki: x")).toBe("tenki: x\n");
  });

  it("appends after existing stderr without doubling newlines", () => {
    expect(appendRunDiagnostic("boom\n", "tenki: x")).toBe("boom\ntenki: x\n");
    expect(appendRunDiagnostic("boom", "tenki: x")).toBe("boom\ntenki: x\n");
  });
});

describe("isCommandTimeoutError", () => {
  it("recognizes CommandTimeoutError", () => {
    expect(isCommandTimeoutError(new CommandTimeoutError("boom"))).toBe(true);
  });

  it("rejects other errors", () => {
    expect(isCommandTimeoutError(new Error("boom"))).toBe(false);
    expect(isCommandTimeoutError("boom")).toBe(false);
  });
});

describe("result builders", () => {
  it("abortedResult carries the aborted flag and duration", () => {
    expect(abortedResult(12)).toEqual({
      stdout: "",
      stderr: "",
      exitCode: null,
      durationMs: 12,
      timedOut: false,
      aborted: true,
      stdoutTruncated: false,
      stderrTruncated: false,
    });
  });

  it("timedOutResult carries the timedOut flag and duration", () => {
    expect(timedOutResult(34)).toEqual({
      stdout: "",
      stderr: "",
      exitCode: null,
      durationMs: 34,
      timedOut: true,
      aborted: false,
      stdoutTruncated: false,
      stderrTruncated: false,
    });
  });
});
