import { describe, expect, it } from "vitest";
import { createTaskmarketCliRunner } from "./cli";

describe("createTaskmarketCliRunner", () => {
  it("passes arguments without a shell", async () => {
    const runner = createTaskmarketCliRunner({ binary: process.execPath });
    const value = "literal;$(printf unsafe)";
    const output = await runner.run(["-e", "process.stdout.write(process.argv[1])", value]);
    expect(output).toMatchObject({ exitCode: 0, timedOut: false, outputLimitExceeded: false });
    expect(output.stdout).toBe(value);
  });

  it("pins the API and inherits no unrelated secret or idempotency variables", async () => {
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

  it("fails closed when output exceeds the configured bound", async () => {
    const runner = createTaskmarketCliRunner({
      binary: process.execPath,
      maxOutputBytes: 4096,
    });
    const output = await runner.run(["-e", "process.stdout.write('x'.repeat(5000))"]);
    expect(output.outputLimitExceeded).toBe(true);
    expect(Buffer.byteLength(output.stdout)).toBeLessThanOrEqual(4096);
  });

  it("validates runner resource limits", () => {
    expect(() => createTaskmarketCliRunner({ timeoutMs: 999 })).toThrow("timeout");
    expect(() => createTaskmarketCliRunner({ maxOutputBytes: 4095 })).toThrow("output limit");
  });
});
