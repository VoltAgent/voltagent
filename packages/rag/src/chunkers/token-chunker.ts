import type { Chunk, ChunkMetadataInput, Chunker, Tokenizer } from "../types";
import { buildMetadata } from "../utils/metadata";
import { buildLineMap, positionForRange } from "../utils/position";
import { defaultTokenizer, sliceByTokenRange } from "../utils/tokenizer";

export type TokenChunkerOptions = {
  /** A source character exceeding this budget is emitted alone. */
  maxTokens?: number;
  /** Rounded down when the requested overlap would split a source character. */
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
    const isBoundary = (index: number) =>
      index === tokens.length || tokens[index - 1].end <= tokens[index].start;

    while (startIndex < tokens.length) {
      let end = Math.min(tokens.length, startIndex + maxTokens);
      while (end > startIndex && !isBoundary(end)) end -= 1;
      if (end === startIndex) {
        // Keep an oversized character whole and always advance.
        end = startIndex + 1;
        while (!isBoundary(end)) end += 1;
      }
      let content = sliceByTokenRange(text, tokens, startIndex, end - 1);
      let tokenCount = tokenizer.countTokens(content);
      while (tokenCount > maxTokens) {
        let previous = end - 1;
        while (previous > startIndex && !isBoundary(previous)) previous -= 1;
        if (previous === startIndex) break;
        end = previous;
        content = sliceByTokenRange(text, tokens, startIndex, end - 1);
        tokenCount = tokenizer.countTokens(content);
      }
      const endIndex = end - 1;

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
        tokens: tokenCount,
        label: options?.label ?? "token",
      });

      if (endIndex === tokens.length - 1) break;
      let nextStart = Math.max(startIndex + 1, end - overlap);
      while (
        nextStart < end &&
        (!isBoundary(nextStart) ||
          tokenizer.countTokens(sliceByTokenRange(text, tokens, nextStart, endIndex)) > overlap)
      ) {
        nextStart += 1;
      }
      startIndex = nextStart;
      chunkIndex += 1;
    }

    return chunks;
  }
}
