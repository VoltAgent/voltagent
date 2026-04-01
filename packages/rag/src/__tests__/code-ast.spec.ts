import { describe, expect, it } from "vitest";
import { extractCodeBlocks } from "../utils/code-ast";

describe("extractCodeBlocks", () => {
  it("finds functions and classes in TS/JS code", () => {
    const code = `
      function foo() { return 1; }
      class Bar {
        baz() { return 2; }
      }
    `;
    const blocks = extractCodeBlocks(code);
    expect(blocks.some((b) => b.kind === "function" && b.name === "foo")).toBe(true);
    expect(blocks.some((b) => b.kind === "class" && b.name === "Bar")).toBe(true);
    expect(blocks.some((b) => b.kind === "method" && b.name === "baz")).toBe(true);
  });
});
