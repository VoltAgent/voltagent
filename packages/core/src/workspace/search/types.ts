import type { EmbeddingAdapterInput, VectorAdapter } from "../../memory/types";

export type WorkspaceSearchMode = "bm25" | "vector" | "hybrid";

export type WorkspaceSearchIndexPath = {
  path: string;
  glob?: string;
};

export type WorkspaceSearchHybridWeights = {
  lexicalWeight?: number;
  vectorWeight?: number;
};

export type WorkspaceSearchConfig = {
  bm25?: {
    k1?: number;
    b?: number;
  };
  embedding?: EmbeddingAdapterInput;
  vector?: VectorAdapter;
  autoIndexPaths?: Array<WorkspaceSearchIndexPath | string>;
  maxFileBytes?: number;
  snippetLength?: number;
  defaultMode?: WorkspaceSearchMode;
  hybrid?: WorkspaceSearchHybridWeights;
  allowDirectAccess?: boolean;
};

export type WorkspaceSearchOptions = {
  mode?: WorkspaceSearchMode;
  topK?: number;
  minScore?: number;
  path?: string;
  glob?: string;
  snippetLength?: number;
  lexicalWeight?: number;
  vectorWeight?: number;
};

export type WorkspaceSearchResult = {
  id: string;
  path: string;
  score: number;
  content: string;
  lineRange?: { start: number; end: number };
  scoreDetails?: { bm25?: number; vector?: number };
  bm25Score?: number;
  vectorScore?: number;
  snippet?: string;
  metadata?: Record<string, unknown>;
};

export type WorkspaceSearchIndexSummary = {
  indexed: number;
  vectorIndexed?: number;
  skipped: number;
  errors: string[];
};
