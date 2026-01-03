import { OpenAI } from "openai";
import type { EmbeddingModel } from "./EmbeddingModel";

export interface OpenAIEmbeddingModelParams {
  apiKey?: string;
  model?: string;
  maxBatchSize?: number;
}

export class OpenAIEmbeddingModel implements EmbeddingModel {
  private client: OpenAI;
  private model: string;
  private maxBatchSize: number;

  constructor(params?: OpenAIEmbeddingModelParams) {
    this.client = new OpenAI({
      apiKey: params?.apiKey ?? process.env.OPENAI_API_KEY,
    });
    this.model = params?.model ?? "text-embedding-ada-002";
    this.maxBatchSize = params?.maxBatchSize ?? 512;
  }

  async embedQuery(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text.replace(/\n/g, " "),
    });
    return response.data[0].embedding;
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (let i = 0; i < documents.length; i += this.maxBatchSize) {
      const batch = documents.slice(i, i + this.maxBatchSize).map((d) => d.replace(/\n/g, " "));
      if (batch.length === 0) continue;

      const response = await this.client.embeddings.create({
        model: this.model,
        input: batch,
      });

      const sortedData = response.data.sort((a, b) => a.index - b.index);
      embeddings.push(...sortedData.map((item) => item.embedding));
    }

    return embeddings;
  }
}
