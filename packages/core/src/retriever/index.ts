/**
 * Retriever implementations for VoltAgent
 * @module retriever
 */

export { BaseRetriever } from "./retriever";
export type { Retriever, RetrieverOptions, RetrieveOptions } from "./types";
export {
  VoltAgentRagRetriever,
  type KnowledgeBaseTagFilter,
  type RagKnowledgeBaseSummary,
  type RagSearchKnowledgeBaseRequest,
  type RagSearchKnowledgeBaseResponse,
  type RagSearchKnowledgeBaseResult,
  type RagSearchKnowledgeBaseChildChunk,
  type VoltAgentRagRetrieverOptions,
} from "./voltagent-rag-retriever";
export { createRetrieverTool } from "./tools";
export { buildRetrieverLogMessage } from "../logger/message-builder";
