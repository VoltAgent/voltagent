import { describe, expect, it } from "vitest";
import {
  type ObservabilityFlushState,
  flushObservability,
  getObservabilityErrorInfo,
  logObservabilityFlushError,
} from "./utils";

describe("getObservabilityErrorInfo", () => {
  it("detects auth errors by status code", () => {
    const info = getObservabilityErrorInfo({ code: 401 });
    expect(info.isAuthError).toBe(true);
    expect(info.statusCode).toBe(401);
  });

  it("detects auth errors by message text", () => {
    const info = getObservabilityErrorInfo(new Error("Unauthorized"));
    expect(info.isAuthError).toBe(true);
    expect(info.statusCode).toBeUndefined();
  });

  it("detects auth errors by response data", () => {
    const info = getObservabilityErrorInfo({
      statusCode: 401,
      data: "API keys are required",
    });
    expect(info.isAuthError).toBe(true);
    expect(info.statusCode).toBe(401);
  });

  it("returns non-auth for other errors", () => {
    const info = getObservabilityErrorInfo({ code: 500, data: "server error" });
    expect(info.isAuthError).toBe(false);
    expect(info.statusCode).toBe(500);
  });
});

describe("logObservabilityFlushError", () => {
  it("logs auth warnings only once", () => {
    const warnings: string[] = [];
    const debug: string[] = [];
    const state: ObservabilityFlushState = { authWarningLogged: false };

    const logger = {
      warn: (message: string) => warnings.push(message),
      debug: (message: string) => debug.push(message),
    };

    logObservabilityFlushError({ code: 401 }, logger, state, "phase-one");
    logObservabilityFlushError({ code: 401 }, logger, state, "phase-two");

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("observability export unauthorized");
    expect(debug).toHaveLength(0);
  });

  it("logs debug output for non-auth errors", () => {
    const warnings: string[] = [];
    const debug: string[] = [];
    const state: ObservabilityFlushState = { authWarningLogged: false };

    const logger = {
      warn: (message: string) => warnings.push(message),
      debug: (message: string) => debug.push(message),
    };

    logObservabilityFlushError({ code: 500 }, logger, state, "phase");

    expect(warnings).toHaveLength(0);
    expect(debug).toHaveLength(1);
  });
});

describe("flushObservability", () => {
  it("logs failure details when flush fails", async () => {
    const warnings: string[] = [];
    const debug: string[] = [];
    const state: ObservabilityFlushState = { authWarningLogged: false };

    const logger = {
      warn: (message: string) => warnings.push(message),
      debug: (message: string) => debug.push(message),
    };

    await flushObservability(
      {
        flushOnFinish: async () => {
          throw new Error("boom");
        },
      },
      logger,
      state,
      "flush-phase",
    );

    expect(warnings).toHaveLength(0);
    expect(debug).toHaveLength(1);
  });
});
