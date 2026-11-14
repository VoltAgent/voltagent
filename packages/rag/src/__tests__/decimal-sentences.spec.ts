import { describe, expect, it } from "vitest";
import { RecursiveChunker } from "../chunkers/recursive-chunker";
import { SemanticChunker } from "../chunkers/semantic-chunker";
import { SentenceChunker } from "../chunkers/sentence-chunker";
import { whitespaceTokenizer } from "../utils/tokenizer";

const text = "Version 2.5 is out. It costs $3.99 today.";
const expected = ["Version 2.5 is out.", " It costs $3.99 today."];

describe("decimal sentence boundaries", () => {
  it("keeps decimals intact with the default sentence tokenizer", () => {
    const chunks = new SentenceChunker().chunk(text, { maxTokens: 4 });
    expect(chunks.map((chunk) => chunk.content)).toEqual(expected);
  });

  it("keeps decimals intact when recursively splitting a paragraph", () => {
    const chunks = new RecursiveChunker(whitespaceTokenizer).chunk(text, { maxTokens: 4 });
    expect(chunks.map((chunk) => chunk.content)).toEqual([
      expected[0],
      expected[0],
      expected[1]?.trim(),
    ]);
  });

  it("passes complete decimal sentences to the semantic embedder", async () => {
    const inputs: string[] = [];
    const chunks = await new SemanticChunker(whitespaceTokenizer).chunk(text, {
      maxTokens: 4,
      embedder: {
        embed: (value) => {
          inputs.push(value);
          return inputs.length === 1 ? [1, 0] : [0, 1];
        },
      },
    });
    expect(inputs).toEqual(expected.map((sentence) => sentence.trim()));
    expect(chunks.map((chunk) => chunk.content)).toEqual(inputs);
  });
});
