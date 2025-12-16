import type { Chunk, ChunkMetadataInput, Chunker, Tokenizer } from "../types";
import { buildMetadata } from "../utils/metadata";
import { defaultTokenizer } from "../utils/tokenizer";
import { TokenChunker } from "./token-chunker";

export type JsonChunkerOptions = {
  maxTokens?: number;
  tokenizer?: Tokenizer;
  label?: string;
} & ChunkMetadataInput;

type PathValue = {
  path: string;
  value: string;
  line: number;
};

function walk(value: unknown, path: string[] = [], acc: PathValue[] = []): PathValue[] {
  if (value === null || value === undefined) {
    acc.push({ path: path.join("."), value: String(value), line: acc.length + 1 });
    return acc;
  }

  if (Array.isArray(value)) {
    value.forEach((item, idx) => walk(item, [...path, String(idx)], acc));
    return acc;
  }

  if (typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) =>
      walk(val, [...path, key], acc),
    );
    return acc;
  }

  if (typeof value === "string") {
    acc.push({ path: path.join("."), value, line: acc.length + 1 });
  } else {
    acc.push({ path: path.join("."), value: JSON.stringify(value), line: acc.length + 1 });
  }
  return acc;
}

export class JsonChunker implements Chunker<JsonChunkerOptions> {
  private readonly tokenizer: Tokenizer;
  private readonly tokenChunker: TokenChunker;

  constructor(tokenizer: Tokenizer = defaultTokenizer) {
    this.tokenizer = tokenizer;
    this.tokenChunker = new TokenChunker(tokenizer);
  }

  chunk(json: string, options?: JsonChunkerOptions): Chunk[] {
    const tokenizer = options?.tokenizer ?? this.tokenizer;
    const maxTokens = Math.max(1, options?.maxTokens ?? 300);
    const label = options?.label ?? "json";

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      // Fallback: treat as plain text
      return this.tokenChunker.chunk(json, {
        maxTokens,
        tokenizer,
        label,
        docId: options?.docId,
        sourceId: options?.sourceId,
        baseMetadata: options?.baseMetadata,
      });
    }

    const pathValues = walk(parsed);
    if (pathValues.length === 0) return [];

    const lines = pathValues.map(({ path, value }) => `${path}: ${value}`);
    const combined = lines.join("\n");

    const baseChunks = this.tokenChunker.chunk(combined, {
      maxTokens,
      tokenizer,
      label,
      docId: options?.docId,
      sourceId: options?.sourceId,
      baseMetadata: options?.baseMetadata,
    });

    return baseChunks.map((chunk, idx) => {
      const { sourceType: _ignored, ...chunkExtra } = (chunk.metadata ?? {}) as Record<
        string,
        unknown
      >;
      return {
        ...chunk,
        id: `${label}-${idx}`,
        metadata: buildMetadata({
          format: "json",
          sourceType: "json",
          base: options,
          extra: {
            ...chunkExtra,
            fields: pathValues.length,
            samplePaths: pathValues.slice(0, 5).map((p) => ({ path: p.path, line: p.line })),
          },
        }),
      };
    });
  }
}
