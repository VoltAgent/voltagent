import type { Chunk, ChunkMetadataInput, Chunker, Tokenizer } from "../types";
import { buildMetadata } from "../utils/metadata";
import { buildLineMap, positionForRange } from "../utils/position";
import { defaultTokenizer, sliceByTokenRange } from "../utils/tokenizer";

export type TokenChunkerOptions = {
  maxTokens?: number;
  overlap?: number;
  tokenizer?: Tokenizer;
  label?: string;
} & ChunkMetadataInput;

export class TokenChunker implements Chunker<TokenChunkerOptions> {
  private readonly tokenizer: Tokenizer;

  constructor(tokenizer: Tokenizer = defaultTokenizer) {
    this.tokenizer = tokenizer;
  }

  chunk(text: string, options?: TokenChunkerOptions): Chunk[] {
    const tokenizer = options?.tokenizer ?? this.tokenizer;
    const maxTokens = Math.max(1, options?.maxTokens ?? 200);
    const overlap = Math.max(0, Math.min(options?.overlap ?? 0, maxTokens - 1));
    const lineMap = buildLineMap(text);

    const tokens = tokenizer.tokenize(text);
    if (tokens.length === 0) {
      return [];
    }

    const chunks: Chunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;
    const step = Math.max(1, maxTokens - overlap);

    while (startIndex < tokens.length) {
      const endIndex = Math.min(tokens.length - 1, startIndex + maxTokens - 1);
      const content = sliceByTokenRange(text, tokens, startIndex, endIndex);

      chunks.push({
        id: `token-${chunkIndex}`,
        content,
        start: tokens[startIndex]?.start ?? 0,
        end: tokens[endIndex]?.end ?? content.length,
        metadata: buildMetadata({
          format: "text",
          sourceType: "token",
          base: options,
          extra: {
            tokenStart: startIndex,
            tokenEnd: endIndex,
            ...positionForRange(
              tokens[startIndex]?.start ?? 0,
              tokens[endIndex]?.end ?? content.length,
              lineMap,
            ),
          },
        }),
        tokens: endIndex - startIndex + 1,
        label: options?.label ?? "token",
      });

      if (endIndex === tokens.length - 1) break;
      startIndex += step;
      chunkIndex += 1;
    }

    return chunks;
  }
}
