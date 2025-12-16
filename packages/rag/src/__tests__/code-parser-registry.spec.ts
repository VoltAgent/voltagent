import { describe, expect, it } from "vitest";
import { getCodeParser, registerCodeParser } from "../utils/code-parser-registry";

describe("Code parser registry", () => {
  it("allows registering custom parsers", () => {
    const mockParser = (source: string) => [
      { kind: "function" as const, start: 0, end: source.length, name: "mock" },
    ];
    registerCodeParser("python", mockParser);
    const parser = getCodeParser("python");
    expect(parser).toBeDefined();
    const blocks = parser?.("print('hi')");
    expect(blocks?.[0]?.name).toBe("mock");
  });
});
