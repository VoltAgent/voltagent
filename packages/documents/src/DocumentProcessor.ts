import type { EmbeddingModel } from "./embeddings/EmbeddingModel";
import { OpenAIEmbeddingModel } from "./embeddings/OpenAIEmbeddingModel";
import { RecursiveCharacterTextSplitter } from "./text-splitters/RecursiveCharacterTextSplitter";
import type { TextSplitter } from "./text-splitters/TextSplitter";

export interface ProcessedDocument {
  text: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export class DocumentProcessor {
  splitter: TextSplitter;
  embedder: EmbeddingModel;

  constructor(splitter?: TextSplitter, embedder?: EmbeddingModel) {
    this.splitter = splitter ?? new RecursiveCharacterTextSplitter();
    this.embedder = embedder ?? new OpenAIEmbeddingModel();
  }

  async process(text: string, metadata?: Record<string, any>): Promise<ProcessedDocument[]> {
    const chunks = await this.splitter.splitText(text);
    const embeddings = await this.embedder.embedDocuments(chunks);

    return chunks.map((chunk, index) => ({
      text: chunk,
      embedding: embeddings[index],
      metadata: {
        ...metadata,
        chunkIndex: index,
        chunkCount: chunks.length,
      },
    }));
  }
}
