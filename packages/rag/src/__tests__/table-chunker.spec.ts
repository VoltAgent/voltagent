import { describe, expect, it } from "vitest";
import { TableChunker } from "../chunkers/table-chunker";

describe("TableChunker", () => {
  it("extracts tables separately from prose", () => {
    const text = `Intro text before table.
| col1 | col2 |
| val1 | val2 |
| val3 | val4 |

Closing paragraph after.`;

    const chunker = new TableChunker();
    const chunks = chunker.chunk(text, { maxTokens: 50 });

    const tableChunk = chunks.find((c) => c.metadata?.type === "table");
    const proseChunks = chunks.filter((c) => c.metadata?.type !== "table");

    expect(tableChunk?.content.trim().startsWith("| col1")).toBe(true);
    expect(proseChunks.some((c) => c.content.includes("Intro text before table"))).toBe(true);
    expect(proseChunks.some((c) => c.content.includes("Closing paragraph"))).toBe(true);
  });

  it("ignores non-table lines and handles CSV-style tables", () => {
    const text = `Hello world
name,age,city
alice,30,rome
bob,25,london
Trailing text`;
    const chunker = new TableChunker();
    const chunks = chunker.chunk(text, { maxTokens: 20 });
    expect(chunks.some((c) => c.metadata?.type === "table")).toBe(true);
    expect(chunks.some((c) => c.content.includes("Hello world"))).toBe(true);
  });
});
