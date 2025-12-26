export interface TextSplitterParams {
  chunkSize?: number;
  chunkOverlap?: number;
}

export abstract class TextSplitter {
  chunkSize: number;
  chunkOverlap: number;

  constructor(fields?: TextSplitterParams) {
    this.chunkSize = fields?.chunkSize ?? 1000;
    this.chunkOverlap = fields?.chunkOverlap ?? 200;

    if (this.chunkOverlap >= this.chunkSize) {
      throw new Error("Chunk overlap must be less than chunk size");
    }
  }

  abstract splitText(text: string): Promise<string[]>;

  async createDocuments(texts: string[]): Promise<string[]> {
    const documents: string[] = [];
    for (const text of texts) {
      const chunks = await this.splitText(text);
      documents.push(...chunks);
    }
    return documents;
  }
}
