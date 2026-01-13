import { describe, expect, it } from "vitest";
import { RecursiveCharacterTextSplitter } from "./text-splitters/RecursiveCharacterTextSplitter";

describe("RecursiveCharacterTextSplitter", () => {
  it("splits text based on characters", async () => {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 10,
      chunkOverlap: 0,
    });
    const text = "abcdefghijklmnopqrstuvwxyz";
    const chunks = await splitter.splitText(text);
    // Expect chunks to be size 10 -> "abcdefghij", "klmnopqrst", "uvwxyz"
    expect(chunks).toEqual(["abcdefghij", "klmnopqrst", "uvwxyz"]);
  });

  it("splits text with simple separator", async () => {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 10,
      chunkOverlap: 0,
      separators: [" "],
    });
    const text = "hello world how are you";
    // "hello world" is 11 chars > 10.
    // "hello" (5)
    // "world" (5)
    // "how" (3)
    // "are" (3)
    // "you" (3)
    // "how are you" -> 3+1+3+1+3 = 11 > 10.
    // So "how are" (7)
    // "you" (3)
    const chunks = await splitter.splitText(text);
    // My implementation logic:
    // split by " ". -> ["hello", "world", "how", "are", "you"]
    // "hello" -> current.
    // "world" -> len 5. "hello" + 1 + "world" = 11 > 10. Flush "hello". current="world".
    // "how" -> len 3. "world" + 1 + "how" = 9 <= 10. current="world how".
    // "are" -> len 3. "world how" + 1 + "are" = 9+1+3=13 > 10. Flush "world how". current="are".
    // "you" -> len 3. "are" + 1 + "you" = 7 <= 10. current="are you".
    // Flush "are you".

    expect(chunks).toEqual(["hello", "world how", "are you"]);
  });

  it("handles recursion with multiple separators", async () => {
    // This tests the recursion logic
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 20,
      chunkOverlap: 0,
      separators: ["\n", " "],
    });
    // "Para1 word word word" -> 20 chars
    const text = "Para1 is longer than 20 chars\nPara2 is short";
    const chunks = await splitter.splitText(text);

    // Split by \n:
    // "Para1 is longer than 20 chars" (29 chars) -> Too big -> Recurse with [" "]
    // "Para2 is short" (14 chars) -> Fits.

    // Recursion on "Para1...":
    // Split by " ": "Para1", "is", "longer", "than", "20", "chars"
    // Accumulate:
    // "Para1 is" (8)
    // + "longer" (6) -> "Para1 is longer" (15)
    // + "than" (4) -> "Para1 is longer than" (20) -> Perfect fit? (15+1+4=20). Yes.
    // + "20" (2) -> "Para1 is longer than 20" (23) -> Flush "Para1 is longer than". Current="20".
    // "chars" -> "20 chars" (8).

    // So result should be:
    // "Para1 is longer than"
    // "20 chars"
    // "Para2 is short"

    expect(chunks).toEqual(["Para1 is longer than", "20 chars", "Para2 is short"]);
  });
});
