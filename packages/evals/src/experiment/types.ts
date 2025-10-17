import type { LocalScorerDefinition, LocalScorerExecutionResult } from "@voltagent/scorers";
import type { EvalResultStatus } from "@voltagent/sdk";

export const EXPERIMENT_DEFINITION_KIND = "voltagent.experiment" as const;

export type MaybePromise<T> = T | Promise<T>;

export interface ExperimentDatasetInfo {
  id?: string;
  versionId?: string;
  name?: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ExperimentDatasetItem<
  Input = unknown,
  Expected = unknown,
  Extra extends Record<string, unknown> | null | undefined = Record<string, unknown> | null,
> {
  id: string;
  label?: string | null;
  input: Input;
  expected?: Expected;
  extra?: Extra;
  datasetId?: string;
  datasetVersionId?: string;
  datasetName?: string;
  dataset?: ExperimentDatasetInfo;
  metadata?: Record<string, unknown> | null;
  raw?: unknown;
}

export interface ExperimentDatasetResolverArgs {
  limit?: number;
  signal?: AbortSignal;
}

export interface ExperimentDatasetResolvedStream<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
> {
  items: Iterable<Item> | AsyncIterable<Item>;
  total?: number;
  dataset?: ExperimentDatasetInfo;
}

export type ExperimentDatasetResolver<Item extends ExperimentDatasetItem = ExperimentDatasetItem> =
  (
    args: ExperimentDatasetResolverArgs,
  ) => MaybePromise<Iterable<Item> | AsyncIterable<Item> | ExperimentDatasetResolvedStream<Item>>;

export interface ExperimentDatasetDescriptor<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
> {
  name?: string;
  id?: string;
  versionId?: string;
  limit?: number;
  items?: Iterable<Item> | AsyncIterable<Item>;
  resolve?: ExperimentDatasetResolver<Item>;
  metadata?: ExperimentDatasetInfo["metadata"];
}

export interface ExperimentBindingDescriptor {
  id?: string;
  name?: string;
  autoCreate?: boolean;
}

export interface ExperimentVoltOpsOptions<TClient = unknown> {
  client?: TClient;
  triggerSource?: string;
  autoCreateRun?: boolean;
  autoCreateScorers?: boolean;
  tags?: ReadonlyArray<string>;
}

export interface ExperimentRuntimeMetadata {
  runId?: string;
  startedAt?: number;
  tags?: readonly string[];
}

export interface ExperimentRunnerContext<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
  TVoltOpsClient = unknown,
> {
  item: Item;
  index: number;
  total?: number;
  signal?: AbortSignal;
  voltOpsClient?: TVoltOpsClient;
  runtime?: ExperimentRuntimeMetadata;
}

export interface ExperimentRunnerResult<Output = unknown> {
  output: Output;
  metadata?: Record<string, unknown> | null;
  traceIds?: string[];
}

export type ExperimentRunnerReturn<Output = unknown> = ExperimentRunnerResult<Output> | Output;

export type ExperimentRunner<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
  Output = unknown,
  TVoltOpsClient = unknown,
> = (
  context: ExperimentRunnerContext<Item, TVoltOpsClient>,
) => MaybePromise<ExperimentRunnerReturn<Output>>;

export interface ExperimentPassCriteriaBase<Type extends string> {
  type: Type;
  label?: string;
  description?: string;
  severity?: "error" | "warn";
}

export interface MeanScoreCriteria extends ExperimentPassCriteriaBase<"meanScore"> {
  min: number;
  scorerId?: string;
}

export interface PassRateCriteria extends ExperimentPassCriteriaBase<"passRate"> {
  min: number;
  scorerId?: string;
}

export type ExperimentPassCriteria = MeanScoreCriteria | PassRateCriteria;

export type ExperimentPassCriteriaInput =
  | ExperimentPassCriteria
  | ExperimentPassCriteria[]
  | ReadonlyArray<ExperimentPassCriteria>;

export interface ExperimentRuntimePayload<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
> extends Record<string, unknown> {
  input: unknown;
  expected: unknown;
  output: unknown;
  item: Item;
  datasetId?: string;
  datasetVersionId?: string;
  datasetName?: string;
}

export interface ExperimentScorerAdapterOptions<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
  Payload extends Record<string, unknown> = Record<string, unknown>,
  Params extends Record<string, unknown> = Record<string, unknown>,
> {
  buildPayload?: (context: ExperimentRuntimePayload<Item>) => Payload | Promise<Payload>;
  buildParams?: (
    context: ExperimentRuntimePayload<Item>,
  ) => Params | undefined | Promise<Params | undefined>;
}

export interface ExperimentScorerConfigEntry<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
  Payload extends Record<string, unknown> = Record<string, unknown>,
  Params extends Record<string, unknown> = Record<string, unknown>,
> extends ExperimentScorerAdapterOptions<Item, Payload, Params> {
  id?: string;
  scorer: LocalScorerDefinition<Payload, Params>;
  name?: string;
  threshold?: number;
  metadata?: Record<string, unknown>;
  params?:
    | Params
    | ((
        context: ExperimentRuntimePayload<Item>,
      ) => Params | undefined | Promise<Params | undefined>);
}

export type ExperimentScorerConfig<Item extends ExperimentDatasetItem = ExperimentDatasetItem> =
  | LocalScorerDefinition<ExperimentRuntimePayload<Item>, any>
  | ExperimentScorerConfigEntry<Item, any, any>;

export interface ExperimentConfig<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
  Output = unknown,
  TVoltOpsClient = unknown,
> {
  id: string;
  label?: string;
  description?: string;
  dataset?: ExperimentDatasetDescriptor<Item>;
  runner: ExperimentRunner<Item, Output, TVoltOpsClient>;
  scorers?: ReadonlyArray<ExperimentScorerConfig<Item>>;
  passCriteria?: ExperimentPassCriteriaInput;
  tags?: readonly string[];
  experiment?: ExperimentBindingDescriptor;
  metadata?: Record<string, unknown> | null;
  voltOps?: ExperimentVoltOpsOptions<TVoltOpsClient>;
}

export interface ExperimentRunnerSnapshot<Output = unknown> {
  output?: Output;
  metadata?: Record<string, unknown> | null;
  traceIds?: string[];
  error?: unknown;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
}

export interface ExperimentScore extends LocalScorerExecutionResult {
  threshold?: number | null;
  thresholdPassed?: boolean | null;
  reason?: string | null;
}

export interface ExperimentItemResult<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
  Output = unknown,
> {
  item: Item;
  itemId: string;
  index: number;
  status: EvalResultStatus;
  runner: ExperimentRunnerSnapshot<Output>;
  scores: Record<string, ExperimentScore>;
  thresholdPassed?: boolean | null;
  error?: unknown;
  durationMs?: number;
  datasetId?: string;
  datasetVersionId?: string;
  datasetName?: string;
}

export interface ExperimentScorerAggregate {
  id: string;
  name: string;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  totalCount: number;
  meanScore?: number | null;
  minScore?: number | null;
  maxScore?: number | null;
  passRate?: number | null;
  threshold?: number | null;
}

export interface ExperimentPassCriteriaEvaluation {
  criteria: ExperimentPassCriteria;
  passed: boolean;
  actual?: number | null;
}

export interface ExperimentSummary {
  totalCount: number;
  completedCount: number;
  successCount: number;
  failureCount: number;
  errorCount: number;
  skippedCount: number;
  meanScore?: number | null;
  passRate?: number | null;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  scorers: Record<string, ExperimentScorerAggregate>;
  criteria: ExperimentPassCriteriaEvaluation[];
}

export interface ExperimentResult<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
  Output = unknown,
> {
  runId?: string;
  summary: ExperimentSummary;
  items: ExperimentItemResult<Item, Output>[];
  metadata?: Record<string, unknown> | null;
}

export interface ExperimentDefinition<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
  Output = unknown,
  TVoltOpsClient = unknown,
> {
  kind: typeof EXPERIMENT_DEFINITION_KIND;
  config: Readonly<ExperimentConfig<Item, Output, TVoltOpsClient>>;
}
