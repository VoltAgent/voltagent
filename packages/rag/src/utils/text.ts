import type { Tokenizer } from "../types";
import { whitespaceTokenizer } from "./tokenizer";

export type Segment = {
  text: string;
  start: number;
  end: number;
  tokens: number;
};

const SENTENCE_REGEX = /[^.!?]+[.!?]+|[^.!?]+$/g;

export function normalizeText(text: string): string {
  const normalized = text.normalize("NFC");
  return normalized
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, "") // zero-width
    .replace(/\u00A0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
}

export function splitIntoSentences(
  text: string,
  tokenizer: Tokenizer = whitespaceTokenizer,
): Segment[] {
  const segments: Segment[] = [];
  const regex = new RegExp(SENTENCE_REGEX);
  for (let match = regex.exec(text); match !== null; match = regex.exec(text)) {
    const sentence = match[0]?.trim() ?? "";
    if (!sentence) continue;
    const start = match.index;
    const end = match.index + (match[0]?.length ?? 0);
    segments.push({
      text: text.slice(start, end),
      start,
      end,
      tokens: tokenizer.countTokens(sentence),
    });
  }

  if (segments.length === 0 && text.trim()) {
    segments.push({
      text: text.trim(),
      start: 0,
      end: text.length,
      tokens: tokenizer.countTokens(text),
    });
  }

  return segments;
}

export function splitIntoParagraphs(
  text: string,
  tokenizer: Tokenizer = whitespaceTokenizer,
): Segment[] {
  const parts = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const part of parts) {
    const idx = text.indexOf(part, cursor);
    const start = idx === -1 ? cursor : idx;
    const end = start + part.length;
    segments.push({
      text: text.slice(start, end),
      start,
      end,
      tokens: tokenizer.countTokens(part),
    });
    cursor = end;
  }

  if (segments.length === 0 && text.trim()) {
    segments.push({
      text: text.trim(),
      start: 0,
      end: text.length,
      tokens: tokenizer.countTokens(text),
    });
  }

  return segments;
}
