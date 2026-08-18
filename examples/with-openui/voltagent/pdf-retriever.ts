import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { openai } from "@ai-sdk/openai";
import { type BaseMessage, BaseRetriever, type RetrieveOptions } from "@voltagent/core";
import { type Chunk, RecursiveChunker, cosineSimilarity } from "@voltagent/rag";
import { embed, embedMany } from "ai";
import { PDFParse } from "pdf-parse";

export const reportFilename = "nyc-2025-housing-supply-report.pdf";
export const reportTitle = "2025 Housing Supply Report";
export const reportPublisher = "New York City Rent Guidelines Board";
export const reportSourceUrl =
  "https://rentguidelinesboard.cityofnewyork.us/wp-content/uploads/2025/05/2025-HSR.pdf";

const defaultReportPath = join(process.cwd(), "data", reportFilename);
const defaultEmbeddingModel = "text-embedding-3-small";
const defaultResultCount = 4;
const defaultPageCount = 3;
const defaultMinimumSimilarity = 0.3;

export type PdfPage = {
  pageNumber: number;
  text: string;
};

export type EmbeddedPdfChunk = {
  content: string;
  embedding: number[];
  id: string;
  pageNumber: number;
};

export type RankedPdfChunk = EmbeddedPdfChunk & {
  score: number;
};

type PdfIndex = {
  chunks: EmbeddedPdfChunk[];
  pages: PdfPage[];
};

export async function extractPdfPages(reportPath = defaultReportPath): Promise<PdfPage[]> {
  const parser = new PDFParse({ data: await readFile(reportPath) });

  try {
    const result = await parser.getText();

    return result.pages.map((page) => ({
      pageNumber: page.num,
      text: page.text.trim(),
    }));
  } finally {
    await parser.destroy();
  }
}

export function rankPdfChunks(
  queryEmbedding: number[],
  chunks: EmbeddedPdfChunk[],
  resultCount = defaultResultCount,
  minimumSimilarity = defaultMinimumSimilarity,
): RankedPdfChunk[] {
  return chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((chunk) => chunk.score >= minimumSimilarity)
    .sort((left, right) => right.score - left.score)
    .slice(0, resultCount);
}

function collectContextValues(value: unknown): string[] {
  if (typeof value === "string") {
    return value.startsWith("User clicked:") ? [] : [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectContextValues);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectContextValues);
  }

  return [];
}

function collectRetrievalFields(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectRetrievalFields);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value).flatMap(([key, fieldValue]) => {
    if (["focusArea", "notes", "question", "query"].includes(key)) {
      if (typeof fieldValue === "string") {
        return [fieldValue];
      }

      if (
        fieldValue &&
        typeof fieldValue === "object" &&
        "value" in fieldValue &&
        typeof fieldValue.value === "string"
      ) {
        return [fieldValue.value];
      }
    }

    return collectRetrievalFields(fieldValue);
  });
}

function markerBody(content: string, markerIndex: number): string {
  const bodyStart = content.indexOf("\n", markerIndex);
  return bodyStart === -1 ? "" : content.slice(bodyStart + 1);
}

function extractActionEnvelope(content: string): {
  action?: string;
  serializedContext?: string;
} {
  const contentMarker = "]]>openui:content";
  const contextMarker = "]]>openui:context";
  const contentIndex = content.lastIndexOf(contentMarker);
  const contextIndex = content.lastIndexOf(contextMarker);

  if (contentIndex !== -1 || contextIndex !== -1) {
    const contentBody = contentIndex === -1 ? "" : markerBody(content, contentIndex);
    const action =
      contextIndex > contentIndex
        ? contentBody.slice(0, contentBody.lastIndexOf(contextMarker)).trim()
        : contentBody.trim();
    const serializedContext =
      contextIndex === -1 ? undefined : markerBody(content, contextIndex).trim();

    return { action, serializedContext };
  }

  return {
    action: content.match(/<content>([\s\S]*?)<\/content>/)?.[1]?.trim(),
    serializedContext: content.match(/<context>([\s\S]*?)<\/context>/)?.[1],
  };
}

function normalizeActionQuery(content: string): string {
  const { action, serializedContext } = extractActionEnvelope(content);
  if (!serializedContext) {
    return action || content.trim();
  }

  try {
    const parsedContext: unknown = JSON.parse(serializedContext);
    const retrievalFields = collectRetrievalFields(parsedContext);
    if (retrievalFields.length > 0) {
      return retrievalFields.join(" ").trim();
    }

    const values = collectContextValues(parsedContext);
    return [...values, action].filter(Boolean).join(" ").trim();
  } catch {
    return action || content.trim();
  }
}

export function extractRetrievalQuery(input: string | BaseMessage[]): string {
  if (typeof input === "string") {
    return normalizeActionQuery(input);
  }

  const lastUserMessage = [...input].reverse().find((message) => message.role === "user");
  if (!lastUserMessage) {
    return "";
  }

  if (typeof lastUserMessage.content === "string") {
    return normalizeActionQuery(lastUserMessage.content);
  }

  return normalizeActionQuery(
    lastUserMessage.content
      .filter(
        (part): part is Extract<(typeof lastUserMessage.content)[number], { type: "text" }> =>
          part.type === "text",
      )
      .map((part) => part.text)
      .join(" ")
      .trim(),
  );
}

function formatRetrievalFailure(): string {
  return [
    "Retrieval status: unavailable.",
    `The ${reportPublisher} ${reportTitle} could not be searched.`,
    "Do not provide housing facts from memory or another source. Ask the user to retry.",
  ].join(" ");
}

function formatRetrievedContext(pages: PdfPage[]): string {
  if (pages.length === 0) {
    return `No relevant content was found in the ${reportPublisher} ${reportTitle}. Do not answer with housing facts from memory or another source.`;
  }

  return pages
    .map(
      (page) =>
        `Source: ${reportPublisher}, ${reportTitle} (PDF page ${page.pageNumber})\n${page.text}`,
    )
    .join("\n\n---\n\n");
}

export class NycHousingPdfRetriever extends BaseRetriever {
  private indexPromise?: Promise<PdfIndex>;

  constructor(private readonly reportPath = defaultReportPath) {
    super({
      toolName: "search_nyc_housing_report",
      toolDescription: `Search the official ${reportPublisher} ${reportTitle} PDF.`,
    });
  }

  private async createIndex(): Promise<PdfIndex> {
    const chunker = new RecursiveChunker();
    const pages = await extractPdfPages(this.reportPath);
    const chunks = pages.flatMap((page) =>
      chunker
        .chunk(page.text, {
          baseMetadata: { pageNumber: page.pageNumber },
          docId: reportFilename,
          maxTokens: 260,
          overlapTokens: 24,
          sourceId: reportTitle,
        })
        .map((chunk: Chunk) => ({
          chunk,
          pageNumber: page.pageNumber,
        })),
    );
    const embeddingModel = openai.embedding(
      process.env.VOLTAGENT_EMBEDDING_MODEL || defaultEmbeddingModel,
    );
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: chunks.map(({ chunk }) => chunk.content),
    });

    return {
      chunks: chunks.map(({ chunk, pageNumber }, index) => ({
        content: chunk.content,
        embedding: embeddings[index] ?? [],
        id: `${reportFilename}-p${pageNumber}-${chunk.id}`,
        pageNumber,
      })),
      pages,
    };
  }

  private getIndex(): Promise<PdfIndex> {
    this.indexPromise ??= this.createIndex().catch((error) => {
      this.indexPromise = undefined;
      throw error;
    });

    return this.indexPromise;
  }

  async retrieve(input: string | BaseMessage[], options: RetrieveOptions): Promise<string> {
    const query = extractRetrievalQuery(input);
    if (!query) {
      return `No query was provided for the ${reportTitle}.`;
    }

    try {
      const [{ embedding: queryEmbedding }, index] = await Promise.all([
        embed({
          model: openai.embedding(process.env.VOLTAGENT_EMBEDDING_MODEL || defaultEmbeddingModel),
          value: query,
        }),
        this.getIndex(),
      ]);
      const rankedChunks = rankPdfChunks(queryEmbedding, index.chunks);
      const pageNumbers = [...new Set(rankedChunks.map((chunk) => chunk.pageNumber))].slice(
        0,
        defaultPageCount,
      );
      const retrievedPages = pageNumbers.flatMap((pageNumber) =>
        index.pages.filter((page) => page.pageNumber === pageNumber),
      );

      options.context?.set(
        "rag.references",
        pageNumbers.map((pageNumber) => ({
          id: `${reportFilename}#page=${pageNumber}`,
          pageNumber,
          source: reportSourceUrl,
          title: reportTitle,
        })),
      );
      options.logger?.info("Retrieved context from the NYC housing report PDF", {
        pageNumbers,
        queryLength: query.length,
        resultCount: rankedChunks.length,
      });

      return formatRetrievedContext(retrievedPages);
    } catch (error) {
      options.context?.set("rag.references", []);
      options.logger?.error("Unable to retrieve context from the NYC housing report PDF", {
        error: error instanceof Error ? error.message : String(error),
      });
      return formatRetrievalFailure();
    }
  }

  getObservabilityAttributes(): Record<string, unknown> {
    return {
      "rag.embedding_model": process.env.VOLTAGENT_EMBEDDING_MODEL || defaultEmbeddingModel,
      "rag.minimum_similarity": defaultMinimumSimilarity,
      "rag.publisher": reportPublisher,
      "rag.source": reportFilename,
      "rag.source_url": reportSourceUrl,
      "rag.strategy": "in-memory-vector-search",
    };
  }
}
