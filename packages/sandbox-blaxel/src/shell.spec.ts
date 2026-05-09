import { afterEach, describe, expect, it } from "vitest";
import { applyEnvBindings } from "./shell";

describe("applyEnvBindings", () => {
  afterEach(() => {
    // biome-ignore lint/performance/noDelete: clean up env mutations between tests.
    delete process.env.TEST_BLAXEL_A;
    // biome-ignore lint/performance/noDelete: clean up env mutations between tests.
    delete process.env.TEST_BLAXEL_B;
    // biome-ignore lint/performance/noDelete: clean up env mutations between tests.
    delete process.env.TEST_BLAXEL_C;
    // biome-ignore lint/performance/noDelete: clean up env mutations between tests.
    delete process.env.TEST_BLAXEL_D;
  });

  it("writes non-nil bindings to process.env", () => {
    applyEnvBindings({ TEST_BLAXEL_A: "one", TEST_BLAXEL_B: "two" });
    expect(process.env.TEST_BLAXEL_A).toBe("one");
    expect(process.env.TEST_BLAXEL_B).toBe("two");
  });

  it("skips bindings whose value is null or undefined", () => {
    applyEnvBindings({
      TEST_BLAXEL_A: "set",
      TEST_BLAXEL_B: undefined,
      TEST_BLAXEL_C: null as unknown as string,
      TEST_BLAXEL_D: "",
    });
    expect(process.env.TEST_BLAXEL_A).toBe("set");
    expect(process.env.TEST_BLAXEL_D).toBe("");
    expect(process.env).not.toHaveProperty("TEST_BLAXEL_B");
    expect(process.env).not.toHaveProperty("TEST_BLAXEL_C");
  });

  it("does not delete existing process.env keys when binding value is nullish", () => {
    process.env.TEST_BLAXEL_A = "preset";
    applyEnvBindings({ TEST_BLAXEL_A: undefined });
    expect(process.env.TEST_BLAXEL_A).toBe("preset");
  });
});
