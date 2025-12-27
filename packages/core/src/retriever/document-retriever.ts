import { DocumentProcessor, type ProcessedDocument } from "@voltagent/documents";
import type { BaseMessage } from "../agent/providers";
import { BaseRetriever } from "./retriever";
import type { RetrieveOptions, RetrieverOptions } from "./types";

export interface DocumentRetrieverOptions extends RetrieverOptions {
  /**
   * Optional custom document processor.
   * If not provided, a default one will be created.
   */
  processor?: DocumentProcessor;
}

/**
 * Abstract base class for retrievers that handle document ingestion and vector search.
 */
export abstract class DocumentRetriever extends BaseRetriever {
  protected processor: DocumentProcessor;

  constructor(options: DocumentRetrieverOptions = {}) {
    super(options);
    this.processor = options.processor || new DocumentProcessor();
  }

  /**
   * Ingests text, chunks it, embeds it, and stores it using upsertDocuments.
   * @param text The raw text to ingest
   * @param metadata Optional metadata to attach to all chunks
   */
  async ingest(text: string, metadata?: Record<string, any>): Promise<void> {
    this.logger.debug("Ingesting document text", { length: text.length });
    const documents = await this.processor.process(text, metadata);
    await this.upsertDocuments(documents);
    this.logger.debug("Document ingestion complete", { chunks: documents.length });
  }

  /**
   * Abstract method to store processed documents in the underlying storage (e.g., Vector DB).
   * @param documents The processed documents containing embeddings and metadata
   */
  abstract upsertDocuments(documents: ProcessedDocument[]): Promise<void>;

  /**
   * Abstract method to retrieve documents based on a query vector.
   * This is a helper for the main retrieve method.
   * @param vector The query vector
   * @param k Number of results to return
   */
  abstract queryVectors(vector: number[], k: number): Promise<ProcessedDocument[]>;

  /**
   * Default implementation of retrieve that embeds the query and searches vectors.
   * Can be overridden if needed.
   */
  async retrieve(input: string | BaseMessage[], options: RetrieveOptions = {}): Promise<string> {
    if (Array.isArray(input) && input.length === 0) {
      return "";
    }
    const textQuery = typeof input === "string" ? input : input[input.length - 1].content;

    // We assume the processor's embedder has an embedQuery method.
    // Since DocumentProcessor exposes 'embedder', we can use it.
    const queryVector = await this.processor.embedder.embedQuery(textQuery as string);

    // Default top-k to 4, can be customizable via options
    const k = (options as any).k ?? 4;

    const results = await this.queryVectors(queryVector, k);

    // Join the text of the results
    return results.map((doc) => doc.text).join("\n\n");
  }
}
