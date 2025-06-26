import { describe, expect, it } from "vitest";
import { isSubAgent } from "./guards";

describe("utils", () => {
  describe("isSubAgent", () => {
    it("should return true for valid sub-agent stream parts", () => {
      const subAgentPart = {
        type: "text-delta",
        textDelta: "test",
        subAgentId: "agent-1",
        subAgentName: "TestAgent",
      };

      expect(isSubAgent(subAgentPart)).toBe(true);
    });

    it("should return false for regular stream parts", () => {
      const regularPart = {
        type: "text-delta",
        textDelta: "test",
      };

      expect(isSubAgent(regularPart)).toBe(false);
    });

    it("should return false for stream parts with missing sub-agent properties", () => {
      const incompletePart = {
        type: "text-delta",
        textDelta: "test",
        subAgentId: "agent-1",
        // missing subAgentName
      } as any;

      expect(isSubAgent(incompletePart)).toBe(false);
    });
  });
});
