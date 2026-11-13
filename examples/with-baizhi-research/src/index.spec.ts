import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ openResearchSession: vi.fn() }));
vi.mock("./session.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./session.js")>()),
  openResearchSession: mocks.openResearchSession,
}));

const originalArgv = process.argv;
const originalExitCode = process.exitCode;
beforeEach(() => {
  vi.resetModules();
  mocks.openResearchSession.mockReset();
  process.argv = ["node", "index.js", "Compare official requirements"];
  process.exitCode = undefined;
  vi.stubEnv("BAIZHI_API_KEY", "synthetic-baizhi-key");
  vi.stubEnv("OPENAI_API_KEY", "synthetic-model-key");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network request in CLI test");
    }),
  );
});
afterEach(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("research CLI failure messages", () => {
  it.each(["SIGINT", "SIGTERM", "deadline"] as const)(
    "distinguishes %s from credentials failures",
    async (stop) => {
      vi.useFakeTimers();
      let notifyStarted: () => void = () => undefined;
      const started = new Promise<void>((resolve) => {
        notifyStarted = resolve;
      });
      mocks.openResearchSession.mockImplementation((_key: string, signal: AbortSignal) => {
        notifyStarted();
        return new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        });
      });
      const execution = import("./index.js");
      await started;
      if (stop === "deadline") await vi.advanceTimersByTimeAsync(120_000);
      else process.emit(stop);
      await execution;
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          stop === "deadline" ? "timed out after 120 seconds" : "Research cancelled",
        ),
      );
      expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining("Check credentials"));
      expect(process.exitCode).toBe(1);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each(["page-limit", "missing-tools"] as const)(
    "preserves the safe %s discovery explanation",
    async (reason) => {
      const { ResearchDiscoveryError } = await import("./session.js");
      const error = new ResearchDiscoveryError(reason);
      mocks.openResearchSession.mockRejectedValue(error);
      await import("./index.js");
      expect(console.error).toHaveBeenCalledWith(error.message);
      expect(process.exitCode).toBe(1);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("does not print an unknown remote exception", async () => {
    mocks.openResearchSession.mockRejectedValue(new Error("synthetic-baizhi-key"));
    await import("./index.js");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Check credentials"));
    expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining("synthetic-baizhi-key"));
    expect(fetch).not.toHaveBeenCalled();
  });
});
