import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import { describe, it } from "vitest";
import { andTap } from "./and-tap";

describe("andTap", () => {
  it("should always return the original data", async () => {
    const step = andTap<DangerouslyAllowAny, DangerouslyAllowAny, DangerouslyAllowAny>({
      execute: async () => {
        return null;
      },
    });

    expect(
      await step.execute({ foobar: "foobar" } as DangerouslyAllowAny, {} as DangerouslyAllowAny),
    ).toEqual({ foobar: "foobar" });
  });

  it("should NEVER throw an error", async () => {
    const step = andTap<DangerouslyAllowAny, DangerouslyAllowAny, DangerouslyAllowAny>({
      execute: async () => {
        throw new Error("test");
      },
    });

    expect(async () => {
      await step.execute({} as DangerouslyAllowAny, {} as DangerouslyAllowAny);
    }).not.toThrow();
  });

  it("should call the execute function", async () => {
    const mockExecute = vi.fn();
    const step = andTap<DangerouslyAllowAny, DangerouslyAllowAny, DangerouslyAllowAny>({
      execute: mockExecute,
    });
    await step.execute({} as DangerouslyAllowAny, {} as DangerouslyAllowAny);
    expect(mockExecute).toHaveBeenCalledOnce();
  });
});
