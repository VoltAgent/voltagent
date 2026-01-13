import { TextSplitter, type TextSplitterParams } from "./TextSplitter";

export interface RecursiveCharacterTextSplitterParams extends TextSplitterParams {
  separators?: string[];
}

export class RecursiveCharacterTextSplitter extends TextSplitter {
  separators: string[];

  constructor(fields?: RecursiveCharacterTextSplitterParams) {
    super(fields);
    this.separators = fields?.separators ?? ["\n\n", "\n", " ", ""];
  }

  async splitText(text: string): Promise<string[]> {
    return this._splitText(text, this.separators);
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: recursive splitting logic is complex
  private _splitText(text: string, separators: string[]): string[] {
    const finalChunks: string[] = [];

    let separator = separators[separators.length - 1];
    let newSeparators: string[] = []; // Separators to use for recursion

    for (let i = 0; i < separators.length; i++) {
      const s = separators[i];
      if (s === "") {
        separator = s;
        break;
      }
      if (text.includes(s)) {
        separator = s;
        newSeparators = separators.slice(i + 1);
        break;
      }
    }

    const splits = separator ? text.split(separator) : text.split("");
    let currentDoc: string[] = [];
    let total = 0;

    for (const split of splits) {
      const len = split.length;
      if (len > this.chunkSize && newSeparators.length > 0) {
        // If a single split is too large, verify if we need to flush what we have so far
        if (currentDoc.length > 0) {
          finalChunks.push(currentDoc.join(separator));
          // Reset currentDoc, naive overlap handling for mixed recursion cases: just clear
          currentDoc = [];
          total = 0;
        }

        // Recurse on the large split
        const recursionDocs = this._splitText(split, newSeparators);
        finalChunks.push(...recursionDocs);
      } else {
        // Check if adding this split would exceed chunk size
        if (total + len + (currentDoc.length > 0 ? separator.length : 0) > this.chunkSize) {
          if (currentDoc.length > 0) {
            finalChunks.push(currentDoc.join(separator));

            // Prune from start to maintain overlap
            // We remove items until the remaining total is <= chunkOverlap
            // Note: This logic is approximate.
            while (
              total > this.chunkOverlap ||
              (total + len + (currentDoc.length > 0 ? separator.length : 0) > this.chunkSize &&
                currentDoc.length > 0)
            ) {
              const first = currentDoc.shift();
              if (first) {
                total -= first.length + (currentDoc.length > 0 ? separator.length : 0);
              } else {
                break;
              }
            }
          }
        }
        currentDoc.push(split);
        total += len + (currentDoc.length > 1 ? separator.length : 0);
      }
    }

    if (currentDoc.length > 0) {
      finalChunks.push(currentDoc.join(separator));
    }

    return finalChunks;
  }
}
