import { describe, expect, it } from "vitest";
import { LatexChunker } from "../chunkers/latex-chunker";
import { whitespaceTokenizer } from "../utils/tokenizer";

describe("LatexChunker", () => {
  it("splits by section commands and chunks content", () => {
    const tex = "\\section{Intro} Some intro text. \\subsection{Details} Detailed text here.";
    const chunker = new LatexChunker();
    const chunks = chunker.chunk(tex, { maxTokens: 8 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some((c) => c.metadata?.heading === "Intro")).toBe(true);
  });

  it.each([
    ["\\section{Intro}\nFirst body.\n\\subsection{Next}\nSecond body.", 100],
    [
      "  Preamble\r\n\r\n\\section*{One}\r\n  repeated text  \r\n\\subsection{Two}\n\trepeated text\n",
      100,
    ],
    [" \r\n  unsectioned body \n ", 100],
    ["\\section{Long}\nalpha beta gamma delta epsilon zeta", 2],
    ["\\section{Long}\nOne. Two. alpha beta gamma delta epsilon.", 2],
    ["\\section{Long}\nOne. Two. Three. Four.", 3],
    ["\\section{Long}\r\nOne.\tTwo.\tThree.\tFour.", 3],
  ])("keeps source ranges in the original document: %s", (tex, maxTokens) => {
    const chunks = new LatexChunker(whitespaceTokenizer).chunk(tex, { maxTokens });
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(tex.slice(chunk.start, chunk.end)).toBe(chunk.content);
    }
  });

  it("reports positions against the original document lines", () => {
    const tex = "\\section{Intro}\nFirst body.\n\\subsection{Next}\nSecond body.";
    const chunks = new LatexChunker(whitespaceTokenizer).chunk(tex);
    expect(chunks.map((chunk) => chunk.metadata?.position)).toEqual([
      { start: { line: 2, column: 1 }, end: { line: 2, column: 12 } },
      { start: { line: 4, column: 1 }, end: { line: 4, column: 13 } },
    ]);
  });

  it("distinguishes repeated bodies and retains CRLF positions", () => {
    const tex = "\\section{One}\r\n  repeated text \r\n\\section{Two}\r\n\trepeated text\r\n";
    const chunks = new LatexChunker(whitespaceTokenizer).chunk(tex);
    expect(
      chunks.map(({ start, end, metadata }) => ({ start, end, position: metadata?.position })),
    ).toEqual([
      {
        start: 17,
        end: 30,
        position: { start: { line: 2, column: 3 }, end: { line: 2, column: 16 } },
      },
      {
        start: 49,
        end: 62,
        position: { start: { line: 4, column: 2 }, end: { line: 4, column: 15 } },
      },
    ]);
  });
});
