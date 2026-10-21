import type { Chunk, ChunkMetadataInput, Chunker, Tokenizer } from "../types";
import { buildMetadata } from "../utils/metadata";
import { buildLineMap, positionForRange } from "../utils/position";
import { splitIntoSentences } from "../utils/text";
import { defaultTokenizer } from "../utils/tokenizer";

export type SentenceChunkerOptions = {
  maxTokens?: number;
  overlapSentences?: number;
  tokenizer?: Tokenizer;
  label?: string;
} & ChunkMetadataInput;

export class SentenceChunker implements Chunker<SentenceChunkerOptions> {
  private readonly tokenizer: Tokenizer;

  constructor(tokenizer: Tokenizer = defaultTokenizer) {
    this.tokenizer = tokenizer;
  }

  chunk(text: string, options?: SentenceChunkerOptions): Chunk[] {
    const tokenizer = options?.tokenizer ?? this.tokenizer;
    const maxTokens = Math.max(1, options?.maxTokens ?? 200);
    const overlapSentences = Math.max(0, options?.overlapSentences ?? 0);
    const label = options?.label ?? "sentence";

    const sentences = splitIntoSentences(text, tokenizer);
    if (sentences.length === 0) return [];

    const lineMap = buildLineMap(text);
    const chunks: Chunk[] = [];
    let current: typeof sentences = [];
    let chunkIndex = 0;

    const emitChunk = (segments: typeof sentences) => {
      if (segments.length === 0) return;
      const startSentence = segments[0];
      const endSentence = segments[segments.length - 1];
      if (!startSentence || !endSentence) return;
      const content = text.slice(startSentence.start, endSentence.end);

      chunks.push({
        id: `sentence-${chunkIndex}`,
        content,
        start: startSentence.start,
        end: endSentence.end,
        metadata: buildMetadata({
          format: "text",
          sourceType: "sentence",
          base: options,
          extra: {
            chunkIndex,
            sentenceCount: segments.length,
            ...positionForRange(startSentence.start, endSentence.end, lineMap),
          },
        }),
        tokens: segments.reduce((sum, s) => sum + s.tokens, 0),
        label,
      });
      chunkIndex += 1;
    };

    for (const sentence of sentences) {
      current.push(sentence);
      const tokenSum = current.reduce((sum, s) => sum + s.tokens, 0);

      if (tokenSum > maxTokens && current.length > 1) {
        const overflow = current.pop();
        emitChunk(current);

        const overlap = overlapSentences > 0 ? current.slice(-overlapSentences) : [];
        current = [...overlap];
        if (overflow) current.push(overflow);
      }
    }

    if (current.length > 0) {
      emitChunk(current);
    }

    return chunks;
  }
}
