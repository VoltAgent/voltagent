import type { Chunk, ChunkMetadataInput, Chunker, Tokenizer } from "../types";
import { buildMetadata } from "../utils/metadata";
import { normalizeText } from "../utils/text";
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
  | { type: "code"; language?: string; content: string }
  | { type: "list" | "blockquote" | "paragraph"; content: string };

type Section = {
  headingPath: string[];
  blocks: MdBlock[];
};

function parseBlocks(markdown: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  const lines = markdown.split(/\r?\n/);
  let i = 0;
  let buffer: string[] = [];
  const flushParagraph = () => {
    const text = buffer.join(" ").trim();
    if (text) {
      blocks.push({ type: "paragraph", content: text });
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
      const contentLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i] ?? "")) {
        const current = lines[i];
        if (current === undefined) break;
        contentLines.push(current);
        i += 1;
      }
      blocks.push({ type: "code", language, content: contentLines.join("\n") });
      i += 1;
      continue;
    }

    if (/^>/.test(trimmed)) {
      flushParagraph();
      const quoteLines: string[] = [];
      while (i < lines.length && /^>/.test(lines[i]?.trim() ?? "")) {
        quoteLines.push((lines[i] ?? "").replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "blockquote", content: quoteLines.join(" ").trim() });
      continue;
    }

    if (/^(-|\*|\d+\.)\s+/.test(trimmed)) {
      flushParagraph();
      const listLines: string[] = [];
      while (i < lines.length && /^(-|\*|\d+\.)\s+/.test(lines[i]?.trim() ?? "")) {
        listLines.push((lines[i] ?? "").replace(/^(-|\*|\d+\.)\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "list", content: listLines.join(" ").trim() });
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      i += 1;
      continue;
    }

    buffer.push(trimmed);
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

    const normalized = normalizeText(markdown);
    const sections = toSections(normalized);
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
          chunks.push({
            ...chunk,
            id: `${label}-${index}-${bIdx}-${idx}`,
            metadata: {
              ...chunk.metadata,
              ...buildMetadata({
                format: "markdown",
                sourceType: block.type === "code" ? "code" : "markdown",
                path: section.headingPath,
                base: baseMeta,
                extra: {
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
