import { encodingForModel, getEncoding } from "js-tiktoken";
import type { TiktokenEncoding, TiktokenModel } from "js-tiktoken";
import type { Token, Tokenizer } from "../types";

const TOKEN_REGEX = /\S+/g;

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
  const encoding = (() => {
    try {
      if (config?.model) {
        return encodingForModel(config.model);
      }
      return getEncoding(config?.encoding ?? "cl100k_base");
    } catch (_error) {
      throw new Error(
        "Could not load tiktoken encoding. Please ensure 'js-tiktoken' is installed and the model/encoding is valid.",
      );
    }
  })();

  const encode = (text: string): number[] => Array.from(encoding.encode(text));
  const decode = (tokens: number[]): string => encoding.decode(tokens);

  return {
    tokenize: (text: string) => {
      const ids = encode(text);
      const tokens: Token[] = [];
      let cursor = 0;
      ids.forEach((id) => {
        const piece = decode([id]);
        const start = cursor;
        const end = start + piece.length;
        tokens.push({ value: piece, start, end });
        cursor = end;
      });
      return tokens;
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
