import { describe, expect, it } from "vitest";
import { HtmlChunker } from "../chunkers/html-chunker";

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
});
