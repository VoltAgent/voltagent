import { CommandTimeoutError } from "@tenkicloud/sandbox";
import type { WorkspaceSandboxResult } from "@voltagent/core";

/**
 * Default per-command timeout (ms) when the caller does not provide one.
 */
export const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Default cap (bytes) on stdout/stderr kept per stream before truncation.
 */
export const DEFAULT_MAX_OUTPUT_BYTES = 5 * 1024 * 1024;

const decoder = new TextDecoder();
const encoder = new TextEncoder();

/**
 * Decode a chunk of bytes coming off a Tenki `run` output stream into a string.
 * Tenki delivers `Uint8Array` chunks; anything else is coerced defensively.
 */
export const decodeBytes = (chunk: unknown): string => {
  if (typeof chunk === "string") {
    return chunk;
  }
  if (chunk instanceof Uint8Array) {
    return decoder.decode(chunk);
  }
  return String(chunk ?? "");
};

/**
 * Byte-bounded accumulator for a single output stream. Mirrors the E2B
 * provider's buffering so `maxOutputBytes` truncation is enforced client-side.
 */
export type OutputBuffer = {
  chunks: Buffer[];
  size: number;
  truncated: boolean;
  /**
   * The pump reading into this buffer died mid-stream, so the buffered bytes
   * may be silently short of what the process actually wrote.
   */
  failed: boolean;
};

export const initOutputBuffer = (): OutputBuffer => ({
  chunks: [],
  size: 0,
  truncated: false,
  failed: false,
});

export const appendOutput = (buffer: OutputBuffer, chunk: unknown, maxBytes: number): void => {
  if (maxBytes <= 0) {
    buffer.truncated = true;
    return;
  }

  const data =
    typeof chunk === "string"
      ? Buffer.from(chunk, "utf-8")
      : Buffer.isBuffer(chunk)
        ? chunk
        : chunk instanceof Uint8Array
          ? Buffer.from(chunk)
          : Buffer.from(String(chunk), "utf-8");

  const remaining = maxBytes - buffer.size;
  if (remaining <= 0) {
    buffer.truncated = true;
    return;
  }

  if (data.length > remaining) {
    buffer.chunks.push(data.subarray(0, remaining));
    buffer.size += remaining;
    buffer.truncated = true;
    return;
  }

  buffer.chunks.push(data);
  buffer.size += data.length;
};

/**
 * Return the largest length `<= end` at which `buffer` ends on a complete UTF-8
 * code point. A byte-level cap (`appendOutput`) or a mid-stream truncation can
 * land inside a multi-byte sequence; slicing at the returned index instead of a
 * raw byte offset drops the incomplete trailing code point rather than decoding
 * it to a 3-byte `�` replacement character (which would also overshoot the
 * requested byte cap). Assumes bytes before the final code point are valid.
 */
const validUtf8End = (buffer: Buffer, end: number): number => {
  if (end <= 0) {
    return 0;
  }
  // Walk back from the last included byte to the lead byte of its code point
  // (continuation bytes match 0b10xxxxxx).
  let start = end - 1;
  while (start >= 0 && (buffer[start] & 0xc0) === 0x80) {
    start -= 1;
  }
  if (start < 0) {
    return 0;
  }
  const lead = buffer[start];
  let expected: number;
  if ((lead & 0x80) === 0x00) {
    expected = 1; // 0xxxxxxx
  } else if ((lead & 0xe0) === 0xc0) {
    expected = 2; // 110xxxxx
  } else if ((lead & 0xf0) === 0xe0) {
    expected = 3; // 1110xxxx
  } else if ((lead & 0xf8) === 0xf0) {
    expected = 4; // 11110xxx
  } else {
    return start; // invalid lead byte — drop it
  }
  // Keep the final code point only if all of its bytes are present.
  return end - start >= expected ? end : start;
};

const toOutputString = (buffer: OutputBuffer): string => {
  if (buffer.chunks.length === 0) {
    return "";
  }
  const bytes = Buffer.concat(buffer.chunks, buffer.size);
  return bytes.subarray(0, validUtf8End(bytes, bytes.length)).toString("utf-8");
};

/**
 * Truncate a UTF-8 string to at most `maxBytes`, walking the cut point back to a
 * codepoint boundary so the result is always valid UTF-8.
 */
export const truncateOutput = (
  value: string,
  maxBytes: number,
): { content: string; truncated: boolean } => {
  if (!value) {
    return { content: "", truncated: false };
  }
  if (maxBytes <= 0) {
    return { content: "", truncated: true };
  }
  const buffer = Buffer.from(value, "utf-8");
  if (buffer.length <= maxBytes) {
    return { content: value, truncated: false };
  }
  const end = validUtf8End(buffer, maxBytes);
  return { content: buffer.subarray(0, end).toString("utf-8"), truncated: true };
};

/**
 * Resolve the final output for a stream: prefer the streamed buffer when we
 * captured anything, otherwise fall back to the aggregated bytes on the result.
 * A buffer whose pump failed mid-stream may be silently short, so when the run
 * resolved (its aggregate output is complete) the aggregate wins instead.
 */
export const resolveOutput = (
  buffer: OutputBuffer,
  fallback: string | undefined,
  maxBytes: number,
): { content: string; truncated: boolean } => {
  if (buffer.failed && fallback !== undefined) {
    return truncateOutput(fallback, maxBytes);
  }
  if (buffer.size > 0 || buffer.truncated) {
    return { content: toOutputString(buffer), truncated: buffer.truncated };
  }
  if (!fallback) {
    return { content: "", truncated: false };
  }
  return truncateOutput(fallback, maxBytes);
};

/**
 * Drop nullish entries and string-coerce the rest of an env map.
 */
export const normalizeEnv = (env?: Record<string, string | undefined>): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!env) {
    return result;
  }
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || value === null) {
      continue;
    }
    result[key] = String(value);
  }
  return result;
};

/**
 * Turn a stdin string into a `ReadableStream<Uint8Array>` for Tenki's
 * `run({ stdin })`. An empty string yields a stream that closes immediately,
 * which signals EOF to the process (matching how `exec` closes stdin).
 */
export const stringToReadableStream = (value: string): ReadableStream<Uint8Array> => {
  const bytes = value.length > 0 ? encoder.encode(value) : undefined;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (bytes) {
        controller.enqueue(bytes);
      }
      controller.close();
    },
  });
};

/**
 * Read a signal name off a Tenki `ProcessRunResult` if the process was killed.
 */
export const extractSignal = (result: unknown): string | undefined => {
  if (!result || typeof result !== "object") {
    return undefined;
  }
  const signal = (result as Record<string, unknown>).signal;
  return typeof signal === "string" && signal.length > 0 ? signal : undefined;
};

/**
 * Linux errno names for the fork/exec/wait failures Tenki reports on
 * `ProcessRunResult.errno`. The guest is always Linux, so these are the Linux
 * ABI numbers; anything unmapped falls back to the raw value.
 */
const ERRNO_NAMES: Record<number, string> = {
  1: "EPERM",
  2: "ENOENT",
  5: "EIO",
  7: "E2BIG",
  8: "ENOEXEC",
  11: "EAGAIN",
  12: "ENOMEM",
  13: "EACCES",
  20: "ENOTDIR",
  21: "EISDIR",
  22: "EINVAL",
  23: "ENFILE",
  24: "EMFILE",
  26: "ETXTBSY",
  36: "ENAMETOOLONG",
  40: "ELOOP",
};

/**
 * Exit `reason` values that say nothing beyond what `exitCode` / `signal`
 * already report.
 */
const BENIGN_RUN_REASONS = new Set(["exit", "exited", "signaled", "signal", "killed"]);

/**
 * Build a one-line diagnostic for the parts of Tenki's `ProcessRunResult` that
 * `WorkspaceSandboxResult` has no field for: `errno` (raw errno when the guest
 * agent could not fork/exec/wait the process) and `reason` (the guest agent's
 * description of how the run ended).
 *
 * This matters because Tenki reports an exec failure as a *resolved* run whose
 * stderr is empty — the process never wrote anything — so without the errno the
 * caller sees a non-zero exit code and no output, and cannot tell "command not
 * found" from "ran and failed silently". The local provider does not lose this:
 * a spawn failure rejects there, so the errno rides along in the error message.
 *
 * `reason` is free-form guest-agent text, so it is only appended when the run
 * also looks abnormal (non-zero exit or a signal) and the value is not one this
 * adapter already covers — a successful command never picks up a diagnostic.
 *
 * Returns `undefined` when there is nothing worth reporting.
 */
export const formatRunDiagnostic = (result: unknown): string | undefined => {
  if (!result || typeof result !== "object") {
    return undefined;
  }
  const record = result as Record<string, unknown>;
  // `errno` is a non-optional proto scalar, so it arrives as 0 (not absent)
  // whenever the guest agent has nothing to report.
  const errno = typeof record.errno === "number" && record.errno !== 0 ? record.errno : undefined;
  // `reason` is free-form guest-agent text folded into a single stderr line;
  // collapse CR/LF so one diagnostic cannot inject extra lines.
  const rawReason =
    typeof record.reason === "string" ? record.reason.replace(/[\r\n]+/g, " ").trim() : "";
  const reason = BENIGN_RUN_REASONS.has(rawReason.toLowerCase())
    ? undefined
    : rawReason || undefined;

  if (errno !== undefined) {
    const name = ERRNO_NAMES[errno];
    const label = name ? `${name} (errno ${errno})` : `errno ${errno}`;
    return reason
      ? `tenki: exec failed: ${label}, reason=${reason}`
      : `tenki: exec failed: ${label}`;
  }

  if (!reason) {
    return undefined;
  }
  const exitCode = record.exitCode;
  const abnormal =
    (typeof exitCode === "number" && exitCode !== 0) || extractSignal(result) !== undefined;
  return abnormal ? `tenki: run ended: reason=${reason}` : undefined;
};

/**
 * Append {@link formatRunDiagnostic}'s line to a resolved stderr payload,
 * newline-separated. The diagnostic is adapter metadata rather than process
 * output, so it is added after truncation and is not counted against
 * `maxOutputBytes` — an errno failure means the process never ran, so there is
 * nothing to crowd out in practice.
 */
export const appendRunDiagnostic = (stderr: string, diagnostic?: string): string => {
  if (!diagnostic) {
    return stderr;
  }
  if (!stderr) {
    return `${diagnostic}\n`;
  }
  return stderr.endsWith("\n") ? `${stderr}${diagnostic}\n` : `${stderr}\n${diagnostic}\n`;
};

/**
 * Await `operation`, rejecting with `message` if it has not settled within
 * `timeoutMs`. The operation itself is not (and cannot be) canceled — this
 * bounds how long a caller waits on it, and the race keeps a late settlement
 * observed. The deadline timer is unref'd where the runtime supports it so a
 * never-settling operation does not keep the process alive.
 */
export const resolveWithin = async <T>(
  operation: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
    timeoutId.unref?.();
  });
  try {
    return await Promise.race([operation, deadline]);
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Is this the SDK's per-command timeout error?
 */
export const isCommandTimeoutError = (error: unknown): boolean =>
  error instanceof CommandTimeoutError;

/**
 * Empty result returned when a command is aborted before or during execution.
 */
export const abortedResult = (durationMs: number): WorkspaceSandboxResult => ({
  stdout: "",
  stderr: "",
  exitCode: null,
  durationMs,
  timedOut: false,
  aborted: true,
  stdoutTruncated: false,
  stderrTruncated: false,
});

/**
 * Empty result returned when a command times out before producing a result.
 */
export const timedOutResult = (durationMs: number): WorkspaceSandboxResult => ({
  stdout: "",
  stderr: "",
  exitCode: null,
  durationMs,
  timedOut: true,
  aborted: false,
  stdoutTruncated: false,
  stderrTruncated: false,
});
