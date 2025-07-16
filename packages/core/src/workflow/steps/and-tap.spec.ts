import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import { describe, it } from "vitest";
import { andTap } from "./and-tap";

describe("andTap", () => {
  it("should always return the original data", async () => {
    const step = andTap<DangerouslyAllowAny, DangerouslyAllowAny, DangerouslyAllowAny>({
      id: "test-tap-step",
      name: "Test tap step",
      execute: async () => {
        return null;
      },
    });

    expect(
      await step.execute({
        data: { foobar: "foobar" } as DangerouslyAllowAny,
        state: {} as DangerouslyAllowAny,
        getStepData: () => undefined,
      }),
    ).toEqual({ foobar: "foobar" });
  });

  it("should NEVER throw an error", async () => {
    const step = andTap<DangerouslyAllowAny, DangerouslyAllowAny, DangerouslyAllowAny>({
      id: "test-error-tap",
      name: "Test error tap",
      execute: async () => {
        throw new Error("test");
      },
    });

    expect(async () => {
      await step.execute({
        data: {} as DangerouslyAllowAny,
        state: {} as DangerouslyAllowAny,
        getStepData: () => undefined,
      });
    }).not.toThrow();
  });

  it("should call the execute function", async () => {
    const mockExecute = vi.fn();
    const step = andTap<DangerouslyAllowAny, DangerouslyAllowAny, DangerouslyAllowAny>({
      id: "test-mock-tap",
      name: "Test mock tap",
      execute: mockExecute,
    });
    await step.execute({
      data: {} as DangerouslyAllowAny,
      state: {} as DangerouslyAllowAny,
      getStepData: () => undefined,
    });
    expect(mockExecute).toHaveBeenCalledOnce();
  });
});
