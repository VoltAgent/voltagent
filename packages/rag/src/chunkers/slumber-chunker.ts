import type { Chunk, ChunkMetadataInput, Chunker, Tokenizer } from "../types";
import { buildMetadata } from "../utils/metadata";
import { defaultTokenizer } from "../utils/tokenizer";
import { SentenceChunker } from "./sentence-chunker";
import { TokenChunker } from "./token-chunker";

export type SlumberChunkerOptions = {
  maxTokens?: number;
  minTokens?: number;
  overlapTokens?: number;
  tokenizer?: Tokenizer;
  label?: string;
} & ChunkMetadataInput;

/**
 * SlumberChunker smooths out chunks by enforcing a minimum token target.
 * It is useful when upstream chunkers produce many tiny fragments that hurt retrieval.
 */
export class SlumberChunker implements Chunker<SlumberChunkerOptions> {
  private readonly tokenizer: Tokenizer;
  private readonly sentenceChunker: SentenceChunker;
  private readonly tokenChunker: TokenChunker;

  constructor(tokenizer: Tokenizer = defaultTokenizer) {
    this.tokenizer = tokenizer;
    this.sentenceChunker = new SentenceChunker(tokenizer);
    this.tokenChunker = new TokenChunker(tokenizer);
  }

  chunk(text: string, options?: SlumberChunkerOptions): Chunk[] {
    const tokenizer = options?.tokenizer ?? this.tokenizer;
    const maxTokens = Math.max(1, options?.maxTokens ?? 300);
    const minTokens = Math.max(
      1,
      Math.min(options?.minTokens ?? Math.floor(maxTokens / 2), maxTokens),
    );
    const overlapTokens = Math.max(0, options?.overlapTokens ?? 0);
    const label = options?.label ?? "slumber";
    const seedChunks = this.sentenceChunker.chunk(text, {
      maxTokens,
      tokenizer,
      label: `${label}-seed`,
      docId: options?.docId,
      sourceId: options?.sourceId,
      baseMetadata: options?.baseMetadata,
    });

    const merged: Chunk[] = [];
    let buffer: Chunk[] = [];

    const flush = () => {
      if (buffer.length === 0) return;
      const content = buffer.map((b) => b.content).join("\n");
      const start = buffer[0]?.start ?? 0;
      const end = buffer[buffer.length - 1]?.end ?? content.length;
      const tokens = tokenizer.countTokens(content);
      if (tokens > maxTokens) {
        const split = this.tokenChunker.chunk(content, {
          maxTokens,
          overlap: overlapTokens,
          tokenizer,
          label: `${label}-token`,
        });
        merged.push(
          ...split.map((chunk, idx) => ({
            ...chunk,
            id: `${label}-${merged.length + idx}`,
            start: start + chunk.start,
            end: start + chunk.end,
            label,
            metadata: buildMetadata({
              format: "slumber",
              sourceType: "slumber-token",
              base: options,
              extra: chunk.metadata as Record<string, unknown>,
            }),
          })),
        );
      } else {
        merged.push({
          id: `${label}-${merged.length}`,
          content,
          start,
          end,
          tokens,
          label,
          metadata: buildMetadata({
            format: "slumber",
            sourceType: "slumber",
            base: options,
            extra: { smoothed: buffer.length > 1 },
          }),
        });
      }
      buffer = [];
    };

    for (const chunk of seedChunks) {
      buffer.push(chunk);
      const tokens = buffer.reduce(
        (sum, c) => sum + (c.tokens ?? tokenizer.countTokens(c.content)),
        0,
      );
      if (tokens >= minTokens && tokens <= maxTokens) {
        flush();
      } else if (tokens > maxTokens) {
        flush();
      }
    }

    flush();

    // Apply token overlap if requested
    if (overlapTokens > 0 && merged.length > 1) {
      const withOverlap: Chunk[] = [];
      for (let i = 0; i < merged.length; i++) {
        const current = merged[i];
        if (current) withOverlap.push(current);
        if (i === merged.length - 1) break;
        const next = merged[i + 1];
        if (!next) continue;
        const overlapContent = next.content.split(/\s+/).slice(0, overlapTokens).join(" ");
        if (overlapContent) {
          withOverlap.push({
            id: `${label}-overlap-${i}`,
            content: overlapContent,
            start: next.start,
            end: next.start + overlapContent.length,
            label: `${label}-overlap`,
            metadata: buildMetadata({
              format: "slumber",
              sourceType: "slumber-overlap",
              base: options,
            }),
          });
        }
      }
      return withOverlap;
    }

    return merged;
  }
}
