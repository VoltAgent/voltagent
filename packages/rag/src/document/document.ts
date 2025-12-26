import type { Chunk } from "../types";
import { extractKeywords, extractQuestions, extractSummary, extractTitle } from "./extractors";
import { chunkByStrategy } from "./transformers";
import type { ChunkStrategy, DocNode, ExtractOptions } from "./types";
import { generateId } from "./utils";

type DocInput = {
  text: string;
  metadata?: Record<string, unknown>;
  docId?: string;
};

export class StructuredDocument {
  private nodes: DocNode[];

  constructor(docs: DocInput[]) {
    this.nodes = docs.map((doc) => ({
      id: doc.docId ?? generateId("doc"),
      text: doc.text,
      metadata: { ...(doc.metadata ?? {}), docId: doc.docId ?? undefined },
      links: [],
    }));
  }

  static fromText(text: string, metadata?: Record<string, unknown>): StructuredDocument {
    return new StructuredDocument([{ text, metadata }]);
  }

  addLink(nodeId: string, relatedId: string, type: "document" | "section" | "chunk"): void {
    this.nodes = this.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            links: [
              ...(node.links ?? []),
              {
                nodeId: relatedId,
                type,
              },
            ],
          }
        : node,
    );
  }

  extract(options: ExtractOptions): StructuredDocument {
    let updated = [...this.nodes];
    if (options.title) updated = extractTitle(updated);
    if (options.summary) updated = extractSummary(updated);
    if (options.keywords) updated = extractKeywords(updated);
    if (options.questions) updated = extractQuestions(updated);
    this.nodes = updated;
    return this;
  }

  chunk(params: { strategy: ChunkStrategy; maxTokens?: number }): { chunks: Chunk[] } {
    const chunks: Chunk[] = [];
    const graph: Record<string, string[]> = {};
    this.nodes.forEach((node) => {
      const cks = chunkByStrategy(params.strategy, node.text, {
        maxTokens: params.maxTokens,
      }).map((chunk) => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          docId: node.id,
        },
      }));
      cks.forEach((ck) => {
        this.addLink(node.id, ck.id, "chunk");
        graph[node.id] = [...(graph[node.id] ?? []), ck.id];
      });
      chunks.push(...cks);
    });
    return { chunks };
  }

  getNodes(): DocNode[] {
    return this.nodes;
  }

  getLinkGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    this.nodes.forEach((node) => {
      node.links?.forEach((link) => {
        graph[node.id] = [...(graph[node.id] ?? []), link.nodeId];
      });
    });
    return graph;
  }
}
