import { describe, expectTypeOf } from "vitest";
import type { AbortError } from "./abort-error";

describe("AbortError", () => {
  it("should have a base Error compatible API", () => {
    expectTypeOf<AbortError>().toExtend<Error>();
  });
});
