export interface VoltAgentClientOptions {
  baseUrl?: string;
  publicKey?: string;
  secretKey?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

export type {
  KnowledgeBaseTagFilter,
  RagKnowledgeBaseSummary,
  RagSearchKnowledgeBaseChildChunk,
  RagSearchKnowledgeBaseRequest,
  RagSearchKnowledgeBaseResponse,
  RagSearchKnowledgeBaseResult,
} from "@voltagent/core";

export type EvalRunStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";
export type TerminalEvalRunStatus = "succeeded" | "failed" | "cancelled";
export type EvalResultStatus = "pending" | "running" | "passed" | "failed" | "error";
export type EvalThresholdOperator = "gte" | "lte" | "eq";

export interface CreateEvalRunRequest {
  experimentId?: string;
  datasetVersionId?: string;
  providerCredentialId?: string;
  triggerSource?: string;
  autoQueue?: boolean;
}

export interface EvalRunResultScorePayload {
  scorerId: string;
  score?: number | null;
  threshold?: number | null;
  thresholdPassed?: boolean | null;
  metadata?: Record<string, unknown> | null;
}

export interface AppendEvalRunResultPayload {
  id?: string;
  datasetItemId?: string | null;
  datasetItemHash: string;
  datasetId?: string | null;
  datasetVersionId?: string | null;
  datasetItemLabel?: string | null;
  threshold?: number | null;
  thresholdPassed?: boolean | null;
  status?: EvalResultStatus;
  input?: unknown;
  expected?: unknown;
  output?: unknown;
  durationMs?: number | null;
  scores?: EvalRunResultScorePayload[];
  metadata?: Record<string, unknown> | null;
  traceIds?: string[] | null;
  liveEval?: EvalRunResultLiveMetadata | null;
}

export interface AppendEvalRunResultsRequest {
  results: AppendEvalRunResultPayload[];
}

export interface EvalRunResultLiveMetadata {
  traceId?: string | null;
  spanId?: string | null;
  operationId?: string | null;
  operationType?: string | null;
  sampling?: {
    strategy: string;
    rate?: number | null;
  } | null;
  triggerSource?: string | null;
  environment?: string | null;
}

export interface EvalRunCompletionSummaryPayload {
  itemCount?: number;
  successCount?: number;
  failureCount?: number;
  meanScore?: number | null;
  medianScore?: number | null;
  sumScore?: number | null;
  passRate?: number | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface EvalRunErrorPayload {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface CompleteEvalRunRequest {
  status: TerminalEvalRunStatus;
  summary?: EvalRunCompletionSummaryPayload;
  error?: EvalRunErrorPayload;
}

export interface FailEvalRunRequest {
  error: EvalRunErrorPayload;
}

export interface EvalRunSummary {
  id: string;
  status: EvalRunStatus;
  triggerSource: string;
  datasetId?: string | null;
  datasetVersionId?: string | null;
  datasetVersionLabel?: string | null;
  itemCount: number;
  successCount: number;
  failureCount: number;
  meanScore?: number | null;
  medianScore?: number | null;
  sumScore?: number | null;
  passRate?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  tags?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvalDatasetVersionSummary {
  id: string;
  version: number;
  description?: string | null;
  itemCount: number;
  createdAt: string;
}

export interface EvalDatasetDetail {
  id: string;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  projectId: string;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
  versions: EvalDatasetVersionSummary[];
}

export interface EvalDatasetSummary {
  id: string;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  projectId: string;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EvalDatasetItemSummary {
  id: string;
  datasetVersionId: string;
  label?: string | null;
  input: unknown;
  expected?: unknown;
  extra?: Record<string, unknown> | null;
  createdAt: string;
}

export interface EvalDatasetItemsResponse {
  items: EvalDatasetItemSummary[];
  total: number;
}

export interface ListEvalDatasetItemsOptions {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface ListEvalExperimentsOptions {
  projectId?: string;
  datasetId?: string;
  targetType?: string;
  search?: string;
  limit?: number;
}

export interface CreateEvalExperimentRequest {
  name: string;
  description?: string | null;
  datasetId?: string | null;
  datasetVersionId?: string | null;
  targetType?: "agent" | "workflow" | "none";
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
  tags?: string[] | null;
  enabled?: boolean;
}

export interface EvalExperimentSummary {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  datasetName?: string | null;
  datasetId?: string | null;
  datasetVersionId?: string | null;
  datasetVersionLabel?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  enabled: boolean;
  totalRuns: number;
  lastRunId?: string | null;
  lastRunStatus?: string | null;
  lastRunAt?: string | null;
  lastPassRate?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvalExperimentDetail extends EvalExperimentSummary {
  metadata?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
}

export interface ResolveExperimentIdOptions {
  experimentId?: string;
  experimentName?: string;
  autoCreate?: boolean;
  datasetId?: string | null;
  datasetVersionId?: string | null;
  description?: string | null;
  tags?: string[] | null;
  targetType?: "agent" | "workflow" | "none";
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
  projectId?: string;
  enabled?: boolean;
}

export interface ResolveExperimentIdResult {
  experimentId: string;
  name?: string | null;
  created?: boolean;
}

export interface CreateEvalScorerRequest {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  defaultThreshold?: number | null;
  thresholdOperator?: EvalThresholdOperator | null;
  metadata?: Record<string, unknown> | null;
}

export interface EvalScorerSummary {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  defaultThreshold?: number | null;
  thresholdOperator?: EvalThresholdOperator | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
