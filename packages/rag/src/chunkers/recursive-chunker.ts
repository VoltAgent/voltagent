import type { Chunk, ChunkMetadataInput, Chunker, Tokenizer } from "../types";
import { buildMetadata } from "../utils/metadata";
import { splitIntoParagraphs } from "../utils/text";
import { defaultTokenizer } from "../utils/tokenizer";
import { SentenceChunker } from "./sentence-chunker";
import { TokenChunker } from "./token-chunker";

export type RecursiveChunkerOptions = {
  maxTokens?: number;
  overlapTokens?: number;
  tokenizer?: Tokenizer;
  label?: string;
} & ChunkMetadataInput;

export class RecursiveChunker implements Chunker<RecursiveChunkerOptions> {
  private readonly tokenizer: Tokenizer;
  private readonly sentenceChunker: SentenceChunker;
  private readonly tokenChunker: TokenChunker;

  constructor(tokenizer: Tokenizer = defaultTokenizer) {
    this.tokenizer = tokenizer;
    this.sentenceChunker = new SentenceChunker(tokenizer);
    this.tokenChunker = new TokenChunker(tokenizer);
  }

  chunk(text: string, options?: RecursiveChunkerOptions): Chunk[] {
    const tokenizer = options?.tokenizer ?? this.tokenizer;
    const maxTokens = Math.max(1, options?.maxTokens ?? 300);
    const overlapTokens = Math.max(0, options?.overlapTokens ?? 0);
    const label = options?.label ?? "recursive";

    const paragraphs = splitIntoParagraphs(text, tokenizer);
    if (paragraphs.length === 0) return [];

    const chunks: Chunk[] = [];
    let paragraphIndex = 0;

    for (const paragraph of paragraphs) {
      if (paragraph.tokens <= maxTokens) {
        chunks.push({
          id: `recursive-${chunks.length}`,
          content: paragraph.text,
          start: paragraph.start,
          end: paragraph.end,
          tokens: paragraph.tokens,
          label,
          metadata: buildMetadata({
            format: "text",
            sourceType: "paragraph",
            base: options,
            extra: { paragraphIndex },
          }),
        });
        paragraphIndex += 1;
        continue;
      }

      // Try sentence-based chunking first
      const sentenceChunks = this.sentenceChunker.chunk(paragraph.text, {
        maxTokens,
        overlapSentences: 1,
        tokenizer,
        label: `${label}-sentence`,
        docId: options?.docId,
        sourceId: options?.sourceId,
        baseMetadata: options?.baseMetadata,
      });

      const expanded = sentenceChunks.flatMap((chunk) => {
        if ((chunk.tokens ?? 0) <= maxTokens) {
          return [
            {
              ...chunk,
              id: `recursive-${chunks.length}`,
              start: paragraph.start + chunk.start,
              end: paragraph.start + chunk.end,
              metadata: {
                ...chunk.metadata,
                ...buildMetadata({
                  format: "text",
                  sourceType: "sentence",
                  base: options,
                  extra: { paragraphIndex },
                }),
              },
            },
          ];
        }

        // Fallback to token chunking for oversized sentence group
        return this.tokenChunker
          .chunk(chunk.content, {
            maxTokens,
            overlap: overlapTokens,
            tokenizer,
            label: `${label}-token`,
            docId: options?.docId,
            sourceId: options?.sourceId,
            baseMetadata: options?.baseMetadata,
          })
          .map((tokenChunk, idx) => ({
            ...tokenChunk,
            id: `recursive-${chunks.length + idx}`,
            start: paragraph.start + (tokenChunk.start ?? 0),
            end: paragraph.start + (tokenChunk.end ?? 0),
            metadata: {
              ...tokenChunk.metadata,
              ...buildMetadata({
                format: "text",
                sourceType: "sentence-token",
                base: options,
                extra: { paragraphIndex },
              }),
            },
          }));
      });

      chunks.push(...expanded);
      paragraphIndex += 1;
    }

    if (overlapTokens > 0 && chunks.length > 1) {
      const smoothed: Chunk[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const current = chunks[i];
        if (!current) continue;
        smoothed.push(current);
        if (i === chunks.length - 1) break;
        const next = chunks[i + 1];
        if (!next) continue;
        const overlapContent = next.content.slice(0, overlapTokens);
        if (overlapContent) {
          smoothed.push({
            id: `${label}-overlap-${i}`,
            content: overlapContent,
            start: next.start,
            end: next.start + overlapContent.length,
            label: `${label}-overlap`,
          });
        }
      }
      return smoothed;
    }

    return chunks;
  }
}
