import type { Chunk, ChunkMetadataInput, Chunker, Tokenizer } from "../types";
import { buildMetadata } from "../utils/metadata";
import { buildLineMap, positionForRange } from "../utils/position";
import { defaultTokenizer } from "../utils/tokenizer";
import { CodeChunker } from "./code-chunker";
import { RecursiveChunker } from "./recursive-chunker";

export type MarkdownChunkerOptions = {
  maxTokens?: number;
  tokenizer?: Tokenizer;
  label?: string;
} & ChunkMetadataInput;

type MdBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "code"; language?: string; content: string; offsets: number[] }
  | { type: "list" | "blockquote" | "paragraph"; content: string; offsets: number[] };

type Section = {
  headingPath: string[];
  blocks: MdBlock[];
};

function parseBlocks(markdown: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  const lines = markdown.split(/\r\n|\r|\n/);
  const lineStarts: number[] = [];
  let lineStart = 0;
  for (const line of lines) {
    lineStarts.push(lineStart);
    const newlineLength = markdown.startsWith("\r\n", lineStart + line.length) ? 2 : 1;
    lineStart += line.length + newlineLength;
  }
  const mappedContent = (parts: { text: string; start: number }[], separator: string) => {
    const content = parts.map((part) => part.text).join(separator);
    // One original UTF-16 source offset per extracted content code unit.
    const offsets: number[] = [];
    parts.forEach((part, index) => {
      if (index > 0) offsets.push(part.start - 1);
      for (let j = 0; j < part.text.length; j++) offsets.push(part.start + j);
    });
    return { content, offsets };
  };
  const trimmedLine = (index: number, prefix?: RegExp) => {
    const raw = lines[index] ?? "";
    const withoutPrefix = prefix ? raw.replace(prefix, "") : raw;
    const text = withoutPrefix.trim();
    return {
      text,
      start:
        (lineStarts[index] ?? 0) + raw.length - withoutPrefix.length + withoutPrefix.indexOf(text),
    };
  };
  let i = 0;
  let buffer: { text: string; start: number }[] = [];
  const flushParagraph = () => {
    const mapped = mappedContent(buffer, " ");
    if (mapped.content) {
      blocks.push({ type: "paragraph", ...mapped });
    }
    buffer = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) break;
    const trimmed = line.trim();

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph();
      blocks.push({
        type: "heading",
        level: headingMatch[1]?.length ?? 0,
        text: (headingMatch[2] ?? "").trim(),
      });
      i += 1;
      continue;
    }

    const codeFence = /^```(\w+)?\s*$/.exec(trimmed);
    if (codeFence) {
      flushParagraph();
      const language = codeFence[1]?.trim();
      const contentLines: { text: string; start: number }[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i] ?? "")) {
        const current = lines[i];
        if (current === undefined) break;
        contentLines.push({ text: current, start: lineStarts[i] ?? 0 });
        i += 1;
      }
      blocks.push({ type: "code", language, ...mappedContent(contentLines, "\n") });
      i += 1;
      continue;
    }

    if (/^>/.test(trimmed)) {
      flushParagraph();
      const quoteLines: { text: string; start: number }[] = [];
      while (i < lines.length && /^>/.test(lines[i]?.trim() ?? "")) {
        quoteLines.push(trimmedLine(i, /^\s*>\s?/));
        i += 1;
      }
      blocks.push({ type: "blockquote", ...mappedContent(quoteLines, " ") });
      continue;
    }

    if (/^(-|\*|\d+\.)\s+/.test(trimmed)) {
      flushParagraph();
      const listLines: { text: string; start: number }[] = [];
      while (i < lines.length && /^(-|\*|\d+\.)\s+/.test(lines[i]?.trim() ?? "")) {
        listLines.push(trimmedLine(i, /^\s*(-|\*|\d+\.)\s+/));
        i += 1;
      }
      blocks.push({ type: "list", ...mappedContent(listLines, " ") });
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      i += 1;
      continue;
    }

    buffer.push(trimmedLine(i));
    i += 1;
  }
  flushParagraph();

  return blocks;
}

function toSections(markdown: string): Section[] {
  const blocks = parseBlocks(markdown);
  const sections: Section[] = [];
  let headingStack: string[] = [];
  let current: Section = { headingPath: [], blocks: [] };

  blocks.forEach((block) => {
    if (block.type === "heading") {
      if (current.blocks.length > 0) {
        sections.push(current);
      }
      headingStack = headingStack.slice(0, block.level - 1);
      headingStack[block.level - 1] = block.text;
      current = { headingPath: [...headingStack], blocks: [] };
      return;
    }
    current.blocks.push(block);
  });

  if (current.blocks.length > 0 || current.headingPath.length > 0) {
    sections.push(current);
  }

  return sections;
}

export class MarkdownChunker implements Chunker<MarkdownChunkerOptions> {
  private readonly tokenizer: Tokenizer;
  private readonly recursiveChunker: RecursiveChunker;
  private readonly codeChunker: CodeChunker;

  constructor(tokenizer: Tokenizer = defaultTokenizer) {
    this.tokenizer = tokenizer;
    this.recursiveChunker = new RecursiveChunker(tokenizer);
    this.codeChunker = new CodeChunker(tokenizer);
  }

  chunk(markdown: string, options?: MarkdownChunkerOptions): Chunk[] {
    const tokenizer = options?.tokenizer ?? this.tokenizer;
    const maxTokens = Math.max(1, options?.maxTokens ?? 300);
    const label = options?.label ?? "markdown";
    const baseMeta = options;

    // Parse the original source: normalizing the whole document first changes
    // offsets (CRLF, indentation, leading whitespace, Unicode) before we can map them.
    const sections = toSections(markdown);
    const lineMap = buildLineMap(markdown);
    const chunks: Chunk[] = [];
    let blockIndex = 0;

    sections.forEach((section, index) => {
      section.blocks.forEach((block, bIdx) => {
        let produced: Chunk[] = [];
        if (block.type === "code") {
          produced = this.codeChunker.chunk(block.content, {
            maxTokens,
            tokenizer,
            label: `${label}-code`,
            docId: options?.docId,
            sourceId: options?.sourceId,
            baseMetadata: options?.baseMetadata,
          });
        } else if (block.type === "heading") {
          // headings themselves are not chunked as content blocks
          return;
        } else {
          produced = this.recursiveChunker.chunk(block.content, {
            maxTokens,
            tokenizer,
            label: `${label}-${block.type}`,
            docId: options?.docId,
            sourceId: options?.sourceId,
            baseMetadata: options?.baseMetadata,
          });
        }

        produced.forEach((chunk, idx) => {
          // Chunk offsets refer to the extracted block, whose newlines/markers
          // may have been removed. Map both boundaries back to the source.
          // A span crossing lines may include source markers/newlines that
          // are intentionally absent from the extracted chunk content.
          const start = block.offsets[chunk.start] ?? 0;
          const end = (block.offsets[chunk.end - 1] ?? start - 1) + 1;
          chunks.push({
            ...chunk,
            start,
            end,
            id: `${label}-${index}-${bIdx}-${idx}`,
            metadata: {
              ...chunk.metadata,
              ...buildMetadata({
                format: "markdown",
                sourceType: block.type === "code" ? "code" : "markdown",
                path: section.headingPath,
                base: baseMeta,
                extra: {
                  ...positionForRange(start, end, lineMap),
                  headingPath: section.headingPath,
                  blockType: block.type,
                  blockIndex,
                  language: block.type === "code" ? block.language : undefined,
                },
              }),
            },
            label,
          });
          blockIndex += 1;
        });
      });
    });

    return chunks;
  }
}
