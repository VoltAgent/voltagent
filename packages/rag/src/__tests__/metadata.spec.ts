import { describe, expect, it } from "vitest";
import { HtmlChunker } from "../chunkers/html-chunker";
import { TableChunker } from "../chunkers/table-chunker";
import { buildMetadata } from "../utils/metadata";

describe("buildMetadata", () => {
  it("keeps chunker-specific extras without overriding the core identifiers", () => {
    const meta = buildMetadata({
      format: "html",
      sourceType: "html",
      extra: { format: "text", sourceType: "sentence", paragraphIndex: 2 },
    });

    expect(meta.format).toBe("html");
    expect(meta.sourceType).toBe("html");
    expect(meta.paragraphIndex).toBe(2);
  });

  it("still lets extras provide new fields", () => {
    const meta = buildMetadata({
      format: "table",
      sourceType: "table",
      extra: { type: "table", blockKind: "row" },
    });

    expect(meta).toEqual({ format: "table", sourceType: "table", type: "table", blockKind: "row" });
  });
});

describe("delegating chunkers", () => {
  it("HtmlChunker reports html even though it delegates to the recursive chunker", () => {
    const html = "<div><h1>Heading</h1><p>First para.</p><p>Second para.</p></div>";
    const chunks = new HtmlChunker().chunk(html, { maxTokens: 5 });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((chunk) => chunk.metadata?.format === "html")).toBe(true);
    expect(chunks.every((chunk) => chunk.metadata?.sourceType === "html")).toBe(true);
  });

  it("TableChunker reports table for prose split below the token limit", () => {
    const text = `Intro text before table.
| col1 | col2 |
| val1 | val2 |
| val3 | val4 |

Closing paragraph after.`;
    const chunks = new TableChunker().chunk(text, { maxTokens: 5 });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((chunk) => chunk.metadata?.format === "table")).toBe(true);

    const prose = chunks.filter((chunk) => chunk.id.includes("-text-"));
    const table = chunks.filter((chunk) => !chunk.id.includes("-text-"));
    expect(prose.length).toBeGreaterThan(0);
    expect(table.length).toBeGreaterThan(0);
    expect(prose.every((chunk) => chunk.metadata?.sourceType === "text")).toBe(true);
    expect(table.every((chunk) => chunk.metadata?.sourceType === "table")).toBe(true);
  });
});
