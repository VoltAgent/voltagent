import type { Chunk, ChunkMetadataInput, Chunker } from "../types";
import { buildMetadata } from "../utils/metadata";
import { RecursiveChunker } from "./recursive-chunker";

export type LateChunkerOptions = {
  baseChunker?: Chunker;
  windowSize?: number;
  stride?: number;
  label?: string;
} & ChunkMetadataInput;

export class LateChunker implements Chunker<LateChunkerOptions> {
  private readonly baseChunker: Chunker;

  constructor(baseChunker: Chunker = new RecursiveChunker()) {
    this.baseChunker = baseChunker;
  }

  async chunk(text: string, options?: LateChunkerOptions): Promise<Chunk[]> {
    const baseChunker = options?.baseChunker ?? this.baseChunker;
    const windowSize = Math.max(1, options?.windowSize ?? 2);
    const stride = Math.max(1, options?.stride ?? 1);
    const label = options?.label ?? "late";

    const baseChunks = await baseChunker.chunk(text, {});
    if (baseChunks.length === 0) return [];

    const merged: Chunk[] = [];
    for (let i = 0; i < baseChunks.length; i += stride) {
      const window = baseChunks.slice(i, i + windowSize);
      const content = window.map((c) => c.content).join("\n");
      const first = window[0];
      const last = window[window.length - 1];
      merged.push({
        id: `${label}-${merged.length}`,
        content,
        start: first?.start ?? 0,
        end: last?.end ?? 0,
        tokens: window.reduce((sum, c) => sum + (c.tokens ?? 0), 0),
        label,
        metadata: buildMetadata({
          format: "late",
          sourceType: "late-window",
          base: options,
          extra: { mergedFrom: window.map((c) => c.id) },
        }),
      });
    }

    return merged;
  }
}
