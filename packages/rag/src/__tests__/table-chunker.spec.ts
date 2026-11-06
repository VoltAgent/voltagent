import { describe, expect, it } from "vitest";
import { TableChunker } from "../chunkers/table-chunker";
import { whitespaceTokenizer } from "../utils/tokenizer";

describe("TableChunker", () => {
  it.each([4, 50])("keeps source offsets and positions with a %i-token budget", (maxTokens) => {
    const text = "Intro.\n| name | value |\n| apple | green |\nClosing sentence.";
    const chunks = new TableChunker(whitespaceTokenizer).chunk(text, { maxTokens });

    for (const chunk of chunks) {
      expect(text.slice(chunk.start, chunk.end)).toBe(chunk.content);
    }
    const closing = chunks.find((chunk) => chunk.content === "Closing sentence.");
    expect(closing?.start).toBe(text.indexOf("Closing sentence."));
    expect(closing?.metadata?.position).toEqual({
      start: { line: 4, column: 1 },
      end: { line: 4, column: 18 },
    });
    const table = chunks.find((chunk) => chunk.metadata?.type === "table");
    expect(table?.metadata?.position).toMatchObject({ start: { line: 2, column: 1 } });
  });

  it.each(["\n", "\r\n"])(
    "keeps source ranges across repeated table/prose blocks with %j",
    (newline) => {
      const text = ["First.", "| a | b |", "Middle.", "| c | d |", "Last."].join(newline);
      const chunks = new TableChunker(whitespaceTokenizer).chunk(text, { maxTokens: 3 });

      expect(chunks.length).toBeGreaterThan(5);
      for (const chunk of chunks) {
        expect(text.slice(chunk.start, chunk.end).trim()).toBe(chunk.content.trim());
      }
    },
  );

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
