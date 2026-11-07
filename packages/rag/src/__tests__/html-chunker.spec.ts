import { describe, expect, it } from "vitest";
import { HtmlChunker } from "../chunkers/html-chunker";
import { whitespaceTokenizer } from "../utils/tokenizer";

describe("HtmlChunker", () => {
  it("strips tags and chunks text content", () => {
    const html = "<div><h1>Heading</h1><p>First para.</p><p>Second para.</p></div>";
    const chunker = new HtmlChunker();
    const chunks = chunker.chunk(html, { maxTokens: 5 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.content).toContain("Heading");
    expect(chunks.some((c) => c.content.includes("Second"))).toBe(true);
  });

  it("decodes entities and removes scripts/styles", () => {
    const html = "<style>.x{}</style><script>alert(1)</script><p>Tom &amp; Jerry</p>";
    const chunker = new HtmlChunker();
    const chunks = chunker.chunk(html, { maxTokens: 5 });
    expect(chunks[0]?.content).toContain("Tom & Jerry");
    expect(chunks.every((c) => !c.content.includes("alert(1)"))).toBe(true);
  });

  it.each([
    ["&#128640;", "\u{1f680}"],
    ["&#x1F680;", "\u{1f680}"],
    ["&#131072;", "\u{20000}"],
    ["&#x20000;", "\u{20000}"],
    ["&#1114111;", "\u{10ffff}"],
    ["&#x10FFFF;", "\u{10ffff}"],
    ["&#233;", "é"],
    ["&#xE9;", "é"],
    ["&#0;", "\ufffd"],
    ["&#x0;", "\ufffd"],
    ["&#55296;", "\ufffd"],
    ["&#xDFFF;", "\ufffd"],
    ["&#1114112;", "\ufffd"],
    ["&#x110000;", "\ufffd"],
    ["&#999999999999999999999999999999;", "\ufffd"],
  ])("decodes numeric reference %s without corrupting surrounding text", (reference, expected) => {
    const chunker = new HtmlChunker(whitespaceTokenizer);
    const chunks = chunker.chunk(`<p>Before ${reference} after</p>`, { maxTokens: 100 });

    expect(chunks.map((chunk) => chunk.content)).toEqual([`Before ${expected} after`]);
  });
});
