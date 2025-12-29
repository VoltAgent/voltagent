import type { Chunk, ChunkMetadataInput, Chunker, Tokenizer } from "../types";
import { buildMetadata } from "../utils/metadata";
import { defaultTokenizer } from "../utils/tokenizer";
import { SentenceChunker } from "./sentence-chunker";
import { TokenChunker } from "./token-chunker";

export type TableChunkerOptions = {
  maxTokens?: number;
  tokenizer?: Tokenizer;
  label?: string;
} & ChunkMetadataInput;

function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("|") && trimmed.includes("|")) return true;
  const commaCount = trimmed.split(",").length - 1;
  return commaCount >= 2 && !/[.;]$/.test(trimmed);
}

export class TableChunker implements Chunker<TableChunkerOptions> {
  private readonly tokenizer: Tokenizer;
  private readonly sentenceChunker: SentenceChunker;
  private readonly tokenChunker: TokenChunker;

  constructor(tokenizer: Tokenizer = defaultTokenizer) {
    this.tokenizer = tokenizer;
    this.sentenceChunker = new SentenceChunker(tokenizer);
    this.tokenChunker = new TokenChunker(tokenizer);
  }

  chunk(text: string, options?: TableChunkerOptions): Chunk[] {
    const tokenizer = options?.tokenizer ?? this.tokenizer;
    const maxTokens = Math.max(1, options?.maxTokens ?? 300);
    const label = options?.label ?? "table";

    const lines = text.split("\n");
    const lineStarts: number[] = [];
    {
      let cursor = 0;
      for (const line of lines) {
        lineStarts.push(cursor);
        cursor += line.length + 1; // +1 for the split newline
      }
    }

    const chunks: Chunk[] = [];
    let buffer: string[] = [];

    const flushText = (raw: string) => {
      if (!raw.trim()) return;
      const sentenceChunks = this.sentenceChunker.chunk(raw, {
        maxTokens,
        tokenizer,
        label: "text",
      });
      chunks.push(
        ...sentenceChunks.map((chunk, idx) => ({
          ...chunk,
          id: `${label}-text-${chunks.length + idx}`,
          metadata: {
            ...buildMetadata({
              format: "table",
              sourceType: "text",
              base: options,
              extra: chunk.metadata,
            }),
          },
        })),
      );
    };

    const flushTable = (tableLines: string[], startChar: number) => {
      if (tableLines.length === 0) return;
      const tableText = tableLines.join("\n");
      const tableTokens = tokenizer.countTokens(tableText);
      if (tableTokens <= maxTokens) {
        chunks.push({
          id: `${label}-${chunks.length}`,
          content: tableText,
          start: startChar,
          end: startChar + tableText.length,
          tokens: tableTokens,
          label,
          metadata: buildMetadata({
            format: "table",
            sourceType: "table",
            base: options,
            extra: { type: "table" },
          }),
        });
        return;
      }

      const rowChunks = this.tokenChunker.chunk(tableText, {
        maxTokens,
        tokenizer,
        overlap: 0,
        label: `${label}-row`,
      });
      chunks.push(
        ...rowChunks.map((chunk, idx) => ({
          ...chunk,
          id: `${label}-${chunks.length + idx}`,
          metadata: buildMetadata({
            format: "table",
            sourceType: "table",
            base: options,
            extra: { type: "table", ...chunk.metadata },
          }),
        })),
      );
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) break;
      if (isTableLine(line)) {
        if (buffer.length) {
          flushText(buffer.join("\n"));
          buffer = [];
        }
        const tableLines: string[] = [];
        const startPos = lineStarts[i] ?? 0;
        let j = i;
        for (; j < lines.length; j++) {
          const current = lines[j];
          if (current === undefined) break;
          if (!isTableLine(current)) break;
          tableLines.push(current);
        }
        flushTable(tableLines, startPos);
        i = j - 1;
      } else {
        buffer.push(line);
      }
    }

    if (buffer.length) {
      flushText(buffer.join("\n"));
    }

    return chunks;
  }
}
