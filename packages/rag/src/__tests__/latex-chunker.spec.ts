import { describe, expect, it } from "vitest";
import { LatexChunker } from "../chunkers/latex-chunker";

describe("LatexChunker", () => {
  it("splits by section commands and chunks content", () => {
    const tex = "\\section{Intro} Some intro text. \\subsection{Details} Detailed text here.";
    const chunker = new LatexChunker();
    const chunks = chunker.chunk(tex, { maxTokens: 8 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some((c) => c.metadata?.heading === "Intro")).toBe(true);
  });
});
