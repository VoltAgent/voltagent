import type { Chunk, ChunkMetadataInput, Chunker, Tokenizer } from "../types";
import { cosineSimilarity } from "../utils/similarity";
import { defaultTokenizer } from "../utils/tokenizer";
import { SentenceChunker } from "./sentence-chunker";

export type SemanticEmbedder = {
  embed: (text: string) => Promise<number[]> | number[];
};

export type SemanticChunkerOptions = {
  embedder: SemanticEmbedder;
  maxTokens?: number;
  similarityThreshold?: number;
  tokenizer?: Tokenizer;
  label?: string;
} & ChunkMetadataInput;

type EnrichedChunk = Chunk & { embedding: number[] };

export class SemanticChunker implements Chunker<SemanticChunkerOptions> {
  private readonly tokenizer: Tokenizer;
  private readonly sentenceChunker: SentenceChunker;

  constructor(tokenizer: Tokenizer = defaultTokenizer) {
    this.tokenizer = tokenizer;
    this.sentenceChunker = new SentenceChunker(tokenizer);
  }

  async chunk(text: string, options?: SemanticChunkerOptions): Promise<Chunk[]> {
    const opts = options ?? ({} as SemanticChunkerOptions);
    if (!opts.embedder) {
      throw new Error("SemanticChunker requires an embedder");
    }

    const tokenizer = opts.tokenizer ?? this.tokenizer;
    const maxTokens = Math.max(1, opts.maxTokens ?? 300);
    const similarityThreshold = opts.similarityThreshold ?? 0.85;
    const label = opts.label ?? "semantic";
    const baseMeta = {
      docId: opts.docId,
      sourceId: opts.sourceId,
      ...(opts.baseMetadata ?? {}),
    };

    const baseChunks = this.sentenceChunker.chunk(text, {
      maxTokens,
      tokenizer,
      label: `${label}-seed`,
      docId: opts.docId,
      sourceId: opts.sourceId,
      baseMetadata: opts.baseMetadata,
    });

    const enriched: EnrichedChunk[] = [];
    for (const chunk of baseChunks) {
      const embedding = await opts.embedder.embed(chunk.content);
      enriched.push({ ...chunk, embedding });
    }

    if (enriched.length === 0) return [];

    const merged: Chunk[] = [];
    let current = enriched[0];
    if (!current) return [];

    for (let i = 1; i < enriched.length; i++) {
      const candidate = enriched[i];
      if (!candidate) continue;
      const sim = cosineSimilarity(current.embedding, candidate.embedding);
      const combinedTokens =
        (current.tokens ?? tokenizer.countTokens(current.content)) +
        (candidate.tokens ?? tokenizer.countTokens(candidate.content));

      if (sim >= similarityThreshold && combinedTokens <= maxTokens * 1.5) {
        current = {
          ...current,
          content: `${current.content}\n${candidate.content}`,
          end: candidate.end,
          tokens: combinedTokens,
          label,
          metadata: {
            ...current.metadata,
            merged: true,
            similarity: sim,
          },
          embedding: current.embedding.map(
            (val, idx) => (val + (candidate.embedding[idx] ?? 0)) / 2,
          ),
        } as EnrichedChunk;
      } else {
        merged.push(this.stripEmbedding(current, label));
        current = candidate;
      }
    }

    if (current) {
      merged.push(this.stripEmbedding(current, label));
    }

    return merged.map((chunk, idx) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        sourceType: "semantic",
        chunkIndex: idx,
        ...baseMeta,
      },
    }));
  }

  private stripEmbedding(chunk: EnrichedChunk, label: string): Chunk {
    // Remove embedding before returning public chunk
    const { embedding: _embedding, ...rest } = chunk;
    return {
      ...rest,
      label,
    };
  }
}
