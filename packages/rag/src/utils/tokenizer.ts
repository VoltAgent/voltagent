import { getEncoding, getEncodingNameForModel } from "js-tiktoken";
import type { TiktokenEncoding, TiktokenModel } from "js-tiktoken";
import cl100k from "js-tiktoken/ranks/cl100k_base";
import gpt2 from "js-tiktoken/ranks/gpt2";
import o200k from "js-tiktoken/ranks/o200k_base";
import p50k from "js-tiktoken/ranks/p50k_base";
import p50kEdit from "js-tiktoken/ranks/p50k_edit";
import r50k from "js-tiktoken/ranks/r50k_base";
import type { Token, Tokenizer } from "../types";

const TOKEN_REGEX = /\S+/g;
const encodingRanks = {
  gpt2,
  r50k_base: r50k,
  p50k_base: p50k,
  p50k_edit: p50kEdit,
  cl100k_base: cl100k,
  o200k_base: o200k,
};
const tokenByteLengthsByEncoding = new Map<TiktokenEncoding, Map<number, number>>();

function getTokenByteLengths(encodingName: TiktokenEncoding): Map<number, number> {
  const cached = tokenByteLengthsByEncoding.get(encodingName);
  if (cached) return cached;
  const lengths = new Map<number, number>();
  for (const line of encodingRanks[encodingName].bpe_ranks.split("\n")) {
    if (!line) continue;
    const [, offset, ...pieces] = line.split(" ");
    pieces.forEach((piece, index) => {
      const padding = piece.endsWith("==") ? 2 : piece.endsWith("=") ? 1 : 0;
      lengths.set(Number(offset) + index, (piece.length * 3) / 4 - padding);
    });
  }
  tokenByteLengthsByEncoding.set(encodingName, lengths);
  return lengths;
}

export function tokenizeWithPositions(text: string): Token[] {
  const tokens: Token[] = [];
  const regex = new RegExp(TOKEN_REGEX);
  for (let match = regex.exec(text); match !== null; match = regex.exec(text)) {
    const value = match[0];
    const start = match.index;
    tokens.push({
      value,
      start,
      end: start + value.length,
    });
  }
  return tokens;
}

export const whitespaceTokenizer: Tokenizer = {
  tokenize: tokenizeWithPositions,
  countTokens: (text: string) => tokenizeWithPositions(text).length,
};

export function createTikTokenizer(config?: {
  model?: TiktokenModel;
  encoding?: TiktokenEncoding;
}): Tokenizer {
  let encodingName: TiktokenEncoding = config?.encoding ?? "cl100k_base";
  const encoding = (() => {
    try {
      if (config?.model) {
        encodingName = getEncodingNameForModel(config.model);
      }
      return getEncoding(encodingName);
    } catch (_error) {
      throw new Error(
        "Could not load tiktoken encoding. Please ensure 'js-tiktoken' is installed and the model/encoding is valid.",
      );
    }
  })();

  const encode = (text: string): number[] => Array.from(encoding.encode(text));

  return {
    tokenize: (text: string) => {
      const ids = encode(text);
      // Token ranks store base64-encoded bytes. Their lengths remain exact even
      // when an individual token ends partway through a UTF-8 character.
      const tokenByteLengths = getTokenByteLengths(encodingName);

      const byteStarts: number[] = [];
      const byteEnds: number[] = [];
      let cursor = 0;
      for (const character of text) {
        const end = cursor + character.length;
        const codePoint = character.codePointAt(0) ?? 0;
        const byteLength =
          codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
        for (let byte = 0; byte < byteLength; byte++) {
          byteStarts.push(cursor);
          byteEnds.push(end);
        }
        cursor = end;
      }

      let byteCursor = 0;
      return ids.map((id) => {
        const byteLength = tokenByteLengths.get(id);
        if (byteLength === undefined) {
          throw new Error("Could not determine the source span for a tiktoken token.");
        }
        const start = byteStarts[byteCursor];
        const end = byteEnds[byteCursor + byteLength - 1];
        byteCursor += byteLength;
        // Tokens sharing a character's bytes share its complete source span.
        return { value: text.slice(start, end), start, end };
      });
    },
    countTokens: (text: string) => encode(text).length,
  };
}

export function sliceByTokenRange(
  text: string,
  tokens: Token[],
  start: number,
  end: number,
): string {
  if (!tokens.length) return "";
  const clampedStart = Math.max(0, start);
  const clampedEnd = Math.min(tokens.length - 1, end);
  const startPos = tokens[clampedStart]?.start ?? 0;
  const endPos = tokens[clampedEnd]?.end ?? text.length;
  return text.slice(startPos, endPos);
}

// Default tokenizer for chunkers (strict tiktoken-based)
export const defaultTokenizer: Tokenizer = createTikTokenizer();
