import { describe, expectTypeOf } from "vitest";
import type { VoltAgentError } from "./voltagent-error";

describe("VoltAgentError", () => {
  it("should have a base Error compatible API", () => {
    expectTypeOf<VoltAgentError>().toExtend<Error>();
  });
});
