import { describe, expect, it } from "vitest";
import { createTaskmarketCliRunner } from "./cli";

const itPosix = process.platform === "win32" ? it.skip : it;

describe("createTaskmarketCliRunner", () => {
  itPosix("passes arguments without a shell", async () => {
    const runner = createTaskmarketCliRunner({ binary: process.execPath });
    const value = "literal;$(printf unsafe)";
    const output = await runner.run(["-e", "process.stdout.write(process.argv[1])", value]);
    expect(output).toMatchObject({ exitCode: 0, timedOut: false, outputLimitExceeded: false });
    expect(output.stdout).toBe(value);
  });

  itPosix("pins the API and inherits no unrelated secret or idempotency variables", async () => {
    const previousApiUrl = process.env.TASKMARKET_API_URL;
    const previousIdempotencyKey = process.env.TASKMARKET_IDEMPOTENCY_KEY;
    const previousApiKey = process.env.UNRELATED_API_KEY;
    process.env.TASKMARKET_API_URL = "https://untrusted.invalid";
    process.env.TASKMARKET_IDEMPOTENCY_KEY = "11111111-1111-4111-8111-111111111111";
    process.env.UNRELATED_API_KEY = "must-not-reach-the-cli";
    try {
      const runner = createTaskmarketCliRunner({ binary: process.execPath });
      const output = await runner.run([
        "-e",
        "process.stdout.write(`${process.env.TASKMARKET_API_URL}\\n${process.env.TASKMARKET_IDEMPOTENCY_KEY ?? ''}\\n${process.env.UNRELATED_API_KEY ?? ''}`)",
      ]);

      expect(output.stdout.split("\n")).toEqual(["https://api.taskmarket.dev", "", ""]);
    } finally {
      if (previousApiUrl === undefined) Reflect.deleteProperty(process.env, "TASKMARKET_API_URL");
      else process.env.TASKMARKET_API_URL = previousApiUrl;
      if (previousIdempotencyKey === undefined)
        Reflect.deleteProperty(process.env, "TASKMARKET_IDEMPOTENCY_KEY");
      else process.env.TASKMARKET_IDEMPOTENCY_KEY = previousIdempotencyKey;
      if (previousApiKey === undefined) Reflect.deleteProperty(process.env, "UNRELATED_API_KEY");
      else process.env.UNRELATED_API_KEY = previousApiKey;
    }
  });

  itPosix("fails closed when output exceeds the configured bound", async () => {
    const runner = createTaskmarketCliRunner({
      binary: process.execPath,
      maxOutputBytes: 4096,
    });
    const output = await runner.run(["-e", "process.stdout.write('x'.repeat(5000))"]);
    expect(output.outputLimitExceeded).toBe(true);
    expect(output.stdout).toBe("x".repeat(4096));
    expect(Buffer.byteLength(output.stdout)).toBe(4096);
  });

  itPosix("omits an incomplete UTF-8 sequence at the output bound", async () => {
    const runner = createTaskmarketCliRunner({
      binary: process.execPath,
      maxOutputBytes: 4096,
    });
    const output = await runner.run(["-e", 'process.stdout.write(`x${"é".repeat(2048)}`)']);

    expect(output.outputLimitExceeded).toBe(true);
    expect(output.stdout).toBe(`x${"é".repeat(2047)}`);
    expect(output.stdout).not.toContain("�");
    expect(Buffer.byteLength(output.stdout)).toBe(4095);
  });

  itPosix("terminates descendants that inherit CLI pipes on timeout", async () => {
    const runner = createTaskmarketCliRunner({
      binary: process.execPath,
      timeoutMs: 1000,
    });
    const startedAt = Date.now();
    const output = await runner.run([
      "-e",
      [
        'const { spawn } = require("node:child_process");',
        'const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"],',
        '  { stdio: ["ignore", "inherit", "inherit"] });',
        'process.stdout.write(String(child.pid ?? ""));',
        "setInterval(() => {}, 1000);",
      ].join("\n"),
    ]);

    expect(output.timedOut).toBe(true);
    expect(output.outputLimitExceeded).toBe(false);
    expect(output.stdout).toMatch(/^\d+$/u);
    expect(Date.now() - startedAt).toBeLessThan(5000);
  });

  it("validates runner resource limits", () => {
    expect(() => createTaskmarketCliRunner({ timeoutMs: 999 })).toThrow("timeout");
    expect(() => createTaskmarketCliRunner({ maxOutputBytes: 4095 })).toThrow("output limit");
  });

  it("fails closed on Windows unless the host injects a Job Object-backed runner", () => {
    const descriptor = Object.getOwnPropertyDescriptor(process, "platform");
    Object.defineProperty(process, "platform", { configurable: true, value: "win32" });
    try {
      expect(() => createTaskmarketCliRunner()).toThrow("kill-on-close Job Object");
    } finally {
      if (descriptor) Object.defineProperty(process, "platform", descriptor);
    }
  });
});
