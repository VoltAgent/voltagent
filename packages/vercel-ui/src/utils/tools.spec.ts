import { describe, expect, it } from "vitest";
import { removeAgentPrefix } from "./tools";

describe("removeAgentPrefix", () => {
  it("should remove agent name prefix from tool name with space after colon", () => {
    expect(removeAgentPrefix("CodeResearcher: summarizeCode")).toBe("summarizeCode");
    expect(removeAgentPrefix("BlogReader: fetchLatestPosts")).toBe("fetchLatestPosts");
    expect(removeAgentPrefix("DataMiner: extractData")).toBe("extractData");
  });

  it("should remove agent name prefix from tool name without space after colon", () => {
    expect(removeAgentPrefix("CodeResearcher:summarizeCode")).toBe("summarizeCode");
    expect(removeAgentPrefix("BlogReader:fetchLatestPosts")).toBe("fetchLatestPosts");
    expect(removeAgentPrefix("DataMiner:extractData")).toBe("extractData");
  });

  it("should handle agent names with underscores, hyphens, and numbers", () => {
    expect(removeAgentPrefix("Agent_One: toolA")).toBe("toolA");
    expect(removeAgentPrefix("Agent-Two: toolB")).toBe("toolB");
    expect(removeAgentPrefix("Agent123: toolC")).toBe("toolC");
  });

  it("should return the original name if no prefix is present", () => {
    expect(removeAgentPrefix("simpleTool")).toBe("simpleTool");
    expect(removeAgentPrefix("tool-with-hyphens")).toBe("tool-with-hyphens");
    expect(removeAgentPrefix("tool")).toBe("tool");
  });

  it("should handle empty string", () => {
    expect(removeAgentPrefix("")).toBe("");
  });

  it("should handle string with only prefix", () => {
    expect(removeAgentPrefix("CodeResearcher:")).toBe("");
    expect(removeAgentPrefix("BlogReader: ")).toBe("");
  });

  it("should handle whitespace around the tool name", () => {
    expect(removeAgentPrefix("  CodeResearcher: summarizeCode  ")).toBe(
      "CodeResearcher: summarizeCode",
    );
    expect(removeAgentPrefix("BlogReader:  fetchLatestPosts  ")).toBe("fetchLatestPosts");
    expect(removeAgentPrefix("  DataMiner:  extractData  ")).toBe("DataMiner:  extractData");
  });

  it("should handle complex tool names with special characters", () => {
    expect(removeAgentPrefix("CodeResearcher: tool@version")).toBe("tool@version");
    expect(removeAgentPrefix("BlogReader: tool/function")).toBe("tool/function");
    expect(removeAgentPrefix("DataMiner: tool.sub.function")).toBe("tool.sub.function");
  });

  it("should handle multiple colons in the name", () => {
    expect(removeAgentPrefix("CodeResearcher: tool:function")).toBe("tool:function");
    expect(removeAgentPrefix("BlogReader: tool:sub:function")).toBe("tool:sub:function");
  });

  it("should handle edge cases with special characters in agent name", () => {
    expect(removeAgentPrefix("Agent-Name: tool")).toBe("tool");
    expect(removeAgentPrefix("Agent_Name: tool")).toBe("tool");
    expect(removeAgentPrefix("Agent123: tool")).toBe("tool");
  });
});
