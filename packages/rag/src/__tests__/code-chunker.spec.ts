import { describe, expect, it } from "vitest";
import { CodeChunker } from "../chunkers/code-chunker";
import { registerCodeParser } from "../utils/code-parser-registry";

describe("CodeChunker", () => {
  it("keeps fenced code blocks intact", () => {
    const text = `Some intro.
\`\`\`js
function add(a, b) {
  return a + b;
}
\`\`\`
Some trailing notes.`;

    const chunker = new CodeChunker();
    const chunks = chunker.chunk(text, { maxTokens: 50 });

    const code = chunks.find((c) => c.metadata?.type === "code");
    expect(code?.content).toContain("function add");
    expect(chunks.some((c) => c.content.includes("Some intro."))).toBe(true);
    expect(chunks.some((c) => c.content.includes("Some trailing notes"))).toBe(true);
  });

  it("splits oversized code blocks using token chunking", () => {
    const bigCode = `\`\`\`js\n${"line\n".repeat(100)}\`\`\``;
    const chunker = new CodeChunker();
    const chunks = chunker.chunk(bigCode, { maxTokens: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.metadata?.type === "code")).toBe(true);
  });

  it("handles multiple fenced code sections", () => {
    const text = "Text\n```py\nprint('a')\n```\nMiddle\n```sql\nSELECT 1;\n```";
    const chunker = new CodeChunker();
    const chunks = chunker.chunk(text, { maxTokens: 20 });
    expect(chunks.filter((c) => c.metadata?.type === "code").length).toBe(2);
    expect(chunks.some((c) => c.content.includes("Middle"))).toBe(true);
  });

  it("uses AST for JS/TS code to chunk by blocks", () => {
    const text = "```ts\nfunction foo() { return 1; }\nclass Bar { baz(){ return 2; }}\n```";
    const chunker = new CodeChunker();
    const chunks = chunker.chunk(text, { maxTokens: 50, label: "code" });
    const hasFunction = chunks.some(
      (c) => c.metadata?.blockKind === "function" || c.content.includes("function foo"),
    );
    const hasClass = chunks.some(
      (c) => c.metadata?.blockKind === "class" || c.content.includes("class Bar"),
    );
    expect(hasFunction).toBe(true);
    expect(hasClass).toBe(true);
  });

  it("attaches block paths when parser provides hierarchy", () => {
    // Fake parser returning predefined blocks (no tree-sitter dependency)
    const fakeParser = () => [
      { kind: "class", name: "A", start: 0, end: 20, path: ["A"] },
      { kind: "method", name: "methodB", start: 7, end: 19, path: ["A", "methodB"] },
    ];
    registerCodeParser("js", fakeParser);
    const text = "```js\nclass A { methodB() { function inner() { return 1; } } }\n```";
    const chunker = new CodeChunker();
    const chunks = chunker.chunk(text, { maxTokens: 200 });
    const method = chunks.find((c) => c.metadata?.blockKind === "method");
    expect(method?.metadata?.blockPath).toEqual(["A", "methodB"]);
  });
});
