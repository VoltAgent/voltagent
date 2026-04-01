import { CodeChunker } from "../chunkers/code-chunker";
import { HtmlChunker } from "../chunkers/html-chunker";
import { JsonChunker } from "../chunkers/json-chunker";
import { LatexChunker } from "../chunkers/latex-chunker";
import { MarkdownChunker } from "../chunkers/markdown-chunker";
import { RecursiveChunker } from "../chunkers/recursive-chunker";
import { SentenceChunker } from "../chunkers/sentence-chunker";
import { TableChunker } from "../chunkers/table-chunker";
import { TokenChunker } from "../chunkers/token-chunker";
import type { Chunk } from "../types";
import { detectFormat } from "../utils/format-detector";
import type { ChunkStrategy } from "./types";

function detectStrategy(text: string): ChunkStrategy {
  const detected = detectFormat(text);
  switch (detected) {
    case "json":
      return "json";
    case "html":
      return "html";
    case "latex":
      return "latex";
    case "code":
      return "code";
    case "table":
      return "table";
    case "markdown":
      return "markdown";
    default:
      return "recursive";
  }
}

export function chunkByStrategy(
  strategy: ChunkStrategy,
  text: string,
  opts?: Record<string, unknown>,
): Chunk[] {
  const selected = strategy === "auto" ? detectStrategy(text) : strategy;
  switch (selected) {
    case "markdown":
      return new MarkdownChunker().chunk(text, opts);
    case "html":
      return new HtmlChunker().chunk(text, opts);
    case "json":
      return new JsonChunker().chunk(text, opts);
    case "latex":
      return new LatexChunker().chunk(text, opts);
    case "sentence":
      return new SentenceChunker().chunk(text, opts);
    case "token":
      return new TokenChunker().chunk(text, opts);
    case "table":
      return new TableChunker().chunk(text, opts);
    case "code":
      return new CodeChunker().chunk(text, opts);
    default:
      return new RecursiveChunker().chunk(text, opts);
  }
}
