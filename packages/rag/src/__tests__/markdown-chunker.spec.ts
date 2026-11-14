import { describe, expect, it } from "vitest";
import { MarkdownChunker } from "../chunkers/markdown-chunker";
import { buildLineMap, positionForRange } from "../utils/position";
import { whitespaceTokenizer } from "../utils/tokenizer";

describe("MarkdownChunker", () => {
  it("splits markdown by headings and chunks sections", () => {
    const md = `# Title
Intro paragraph.

## Details
More text here.`;

    const chunker = new MarkdownChunker();
    const chunks = chunker.chunk(md, { maxTokens: 5 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.metadata?.headingPath).toContain("Title");
    expect(
      chunks.some((c) => (c.metadata?.headingPath as string[] | undefined)?.includes("Details")),
    ).toBe(true);
  });

  it("detects lists, quotes, and code blocks with metadata", () => {
    const md = `
# Top
- item one
> quote line
\`\`\`js
console.log("hi");
\`\`\`
`;
    const chunker = new MarkdownChunker();
    const chunks = chunker.chunk(md, { maxTokens: 10 });
    expect(chunks.some((c) => c.metadata?.blockType === "list")).toBe(true);
    expect(chunks.some((c) => c.metadata?.blockType === "blockquote")).toBe(true);
    expect(
      chunks.some((c) => c.metadata?.blockType === "code" && c.metadata?.language === "js"),
    ).toBe(true);
  });
});

describe("MarkdownChunker source offsets (#1542)", () => {
  const chunker = new MarkdownChunker(whitespaceTokenizer);

  it("maps separate sections to their original document ranges", () => {
    const md = "# Intro\n\nFirst section.\n\n## Details\n\nSecond section.";
    const chunks = chunker.chunk(md, { maxTokens: 50 });
    expect(chunks.map(({ start, end }) => [start, end])).toEqual([
      [9, 23],
      [37, 52],
    ]);
    for (const chunk of chunks) {
      expect(md.slice(chunk.start, chunk.end)).toBe(chunk.content);
      expect(chunk.metadata?.position).toEqual(
        positionForRange(chunk.start, chunk.end, buildLineMap(md)).position,
      );
    }
  });

  it("keeps raw CRLF, whitespace and Unicode offsets, including repeated content", () => {
    const md =
      "  \r\n# Heading\r\n\r\n  cafe\u0301 here.  \r\n\r\n## Next\r\n\r\n  cafe\u0301 here.  ";
    const chunks = chunker.chunk(md, { maxTokens: 50 });
    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.start).toBe(md.indexOf("cafe"));
    expect(chunks[1]?.start).toBe(md.lastIndexOf("cafe"));
    for (const chunk of chunks) {
      expect(md.slice(chunk.start, chunk.end)).toBe(chunk.content);
    }
  });

  it("maps joined paragraph, list and quote content back to source spans", () => {
    const md =
      "# Heading\nfirst line\nsecond line\n\n- first item\n- second item\n\n> first quote\n> second quote";
    const chunks = chunker.chunk(md, { maxTokens: 50 });
    expect(chunks.map(({ content }) => content)).toEqual([
      "first line second line",
      "first item second item",
      "first quote second quote",
    ]);
    expect(chunks.map(({ start, end }) => md.slice(start, end))).toEqual([
      "first line\nsecond line",
      "first item\n- second item",
      "first quote\n> second quote",
    ]);
  });

  it("maps token-split list items after removed markers, even when text repeats a marker", () => {
    const md = "# Heading\n- - alpha beta\n- gamma delta epsilon";
    const chunks = chunker.chunk(md, { maxTokens: 1 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.start).toBe(md.indexOf("- alpha"));
    for (const chunk of chunks) {
      expect(md.slice(chunk.start, chunk.end).trim()).toBe(chunk.content.trim());
    }
  });

  it("maps code chunks to the original fenced block and keeps indentation", () => {
    const md = "# Code\r\n\r\n```ts\r\n  const alpha = 1;\r\n  const beta = 2;\r\n```";
    for (const maxTokens of [50, 2]) {
      const chunks = chunker.chunk(md, { maxTokens });
      expect(chunks.length).toBeGreaterThan(0);
      for (const chunk of chunks) {
        expect(chunk.metadata?.blockType).toBe("code");
        expect(md.slice(chunk.start, chunk.end).replace(/\r\n/g, "\n")).toBe(chunk.content);
        expect(chunk.start).toBeGreaterThan(md.indexOf("```ts"));
      }
    }
  });
});
