import type { Chunk, ChunkMetadataInput, Chunker, Tokenizer } from "../types";
import { buildMetadata } from "../utils/metadata";
import { defaultTokenizer } from "../utils/tokenizer";
import { TokenChunker } from "./token-chunker";

export type BoundaryDetector = (text: string) => Promise<number[]> | number[];

export type NeuralChunkerOptions = {
  detector: BoundaryDetector;
  maxTokens?: number;
  tokenizer?: Tokenizer;
  label?: string;
} & ChunkMetadataInput;

export class NeuralChunker implements Chunker<NeuralChunkerOptions> {
  private readonly tokenizer: Tokenizer;
  private readonly tokenChunker: TokenChunker;

  constructor(tokenizer: Tokenizer = defaultTokenizer) {
    this.tokenizer = tokenizer;
    this.tokenChunker = new TokenChunker(tokenizer);
  }

  async chunk(text: string, options?: NeuralChunkerOptions): Promise<Chunk[]> {
    const opts = options ?? ({} as NeuralChunkerOptions);
    if (!opts.detector) {
      throw new Error("NeuralChunker requires a boundary detector");
    }

    const tokenizer = opts.tokenizer ?? this.tokenizer;
    const label = opts.label ?? "neural";
    const maxTokens = Math.max(1, opts.maxTokens ?? 300);

    const boundaries = await opts.detector(text);
    const normalized = [
      ...new Set([...boundaries.filter((b) => b > 0 && b < text.length), text.length]),
    ].sort((a, b) => a - b);

    let start = 0;
    const rawChunks: Chunk[] = [];
    for (const boundary of normalized) {
      const content = text.slice(start, boundary);
      if (content.trim()) {
        rawChunks.push({
          id: `${label}-${rawChunks.length}`,
          content,
          start,
          end: boundary,
          tokens: tokenizer.countTokens(content),
          label,
          metadata: buildMetadata({
            format: "neural",
            sourceType: "neural",
            base: opts,
          }),
        });
      }
      start = boundary;
    }

    // Enforce maxTokens using token chunker if needed
    const finalChunks: Chunk[] = [];
    for (const chunk of rawChunks) {
      if ((chunk.tokens ?? 0) <= maxTokens) {
        finalChunks.push({
          ...chunk,
          metadata: buildMetadata({
            format: "neural",
            sourceType: "neural",
            base: opts,
            extra: chunk.metadata as Record<string, unknown>,
          }),
        });
        continue;
      }

      const tokenChunks = this.tokenChunker.chunk(chunk.content, {
        maxTokens,
        overlap: 0,
        tokenizer,
        label: `${label}-token`,
        docId: opts.docId,
        sourceId: opts.sourceId,
        baseMetadata: opts.baseMetadata,
      });
      finalChunks.push(
        ...tokenChunks.map((tc, idx) => ({
          ...tc,
          id: `${label}-${finalChunks.length + idx}`,
          start: chunk.start + tc.start,
          end: chunk.start + tc.end,
          metadata: buildMetadata({
            format: "neural",
            sourceType: "neural-token",
            base: opts,
            extra: tc.metadata as Record<string, unknown>,
          }),
        })),
      );
    }

    return finalChunks;
  }
}
