import { type LocalScorerExecutionResult, runLocalScorers } from "@voltagent/scorers";
import type { VoltOpsRestClient } from "@voltagent/sdk";

import { resolveVoltOpsDatasetStream } from "../voltops/dataset.js";
import {
  type VoltOpsClientLike,
  type VoltOpsRunManager,
  createVoltOpsRunManager,
} from "../voltops/run.js";
import {
  buildAggregatorSummary,
  createAggregatorState,
  normalizePassCriteria,
  recordAggregatorResult,
} from "./aggregator.js";
import {
  type ExperimentDatasetReference,
  getExperimentDatasetRegistry,
  resolveExperimentDataset,
} from "./dataset.js";
import { type ExperimentRuntimeScorerBundle, resolveExperimentScorers } from "./scorers.js";
import {
  EXPERIMENT_DEFINITION_KIND,
  type ExperimentConfig,
  type ExperimentDatasetItem,
  type ExperimentDefinition,
  type ExperimentItemResult,
  type ExperimentPassCriteria,
  type ExperimentResult,
  type ExperimentRunner,
  type ExperimentRunnerContext,
  type ExperimentRunnerReturn,
  type ExperimentRunnerSnapshot,
  type ExperimentRuntimeMetadata,
  type ExperimentRuntimePayload,
  type ExperimentScore,
} from "./types.js";

export interface RunExperimentProgressEvent {
  completed: number;
  total?: number;
}

export interface RunExperimentItemEvent<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
  Output = unknown,
> {
  index: number;
  item: Item;
  result: ExperimentItemResult<Item, Output>;
  summary: ExperimentResult<Item, Output>["summary"];
}

export interface RunExperimentOptions<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
  Output = unknown,
  TVoltOpsClient = unknown,
> {
  concurrency?: number;
  signal?: AbortSignal;
  voltOpsClient?: TVoltOpsClient;
  onItem?: (event: RunExperimentItemEvent<Item, Output>) => void | Promise<void>;
  onProgress?: (event: RunExperimentProgressEvent) => void | Promise<void>;
}

type ExperimentInput<Item extends ExperimentDatasetItem, Output, TVoltOpsClient> =
  | ExperimentDefinition<Item, Output, TVoltOpsClient>
  | ExperimentConfig<Item, Output, TVoltOpsClient>;

export async function runExperiment<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
  Output = unknown,
  TVoltOpsClient = unknown,
>(
  experiment: ExperimentInput<Item, Output, TVoltOpsClient>,
  options: RunExperimentOptions<Item, Output, TVoltOpsClient> = {},
): Promise<ExperimentResult<Item, Output>> {
  ensureNotAborted(options.signal);

  const definition = normalizeExperimentDefinition(experiment);
  const config = definition.config;

  if (!config.dataset) {
    throw new Error("Experiment configuration must provide a dataset descriptor.");
  }

  const registry = getExperimentDatasetRegistry();
  const passCriteria = normalizePassCriteria(config.passCriteria);
  const scorerBundles = resolveExperimentScorers(config.scorers);
  const scorerDefinitions = scorerBundles.map((bundle) => bundle.definition);
  const scorerMap = new Map(scorerBundles.map((bundle) => [bundle.id, bundle]));

  const voltOpsClientCandidate = options.voltOpsClient ?? config.voltOps?.client ?? undefined;
  const hydratedDataset = attachVoltOpsDatasetResolver(config.dataset, voltOpsClientCandidate);

  const datasetReference: ExperimentDatasetReference<Item> = hydratedDataset ?? config.dataset;

  const datasetStream = await resolveExperimentDataset(datasetReference, {
    limit: hydratedDataset?.limit ?? config.dataset?.limit,
    signal: options.signal,
    registry,
  });

  const aggregatorState = createAggregatorState(datasetStream.total);
  const runtimeMetadata: ExperimentRuntimeMetadata = {
    runId: undefined,
    startedAt: aggregatorState.startedAt,
    tags: config.tags ?? [],
  };

  const voltOpsRun = voltOpsClientCandidate
    ? createVoltOpsRunManager<ExperimentItemResult<Item, Output>>({
        client: voltOpsClientCandidate as unknown as VoltOpsClientLike,
        config,
        dataset: datasetStream.dataset,
      })
    : undefined;

  const runnerContextBase = {
    voltOpsClient: voltOpsClientCandidate,
    runtime: runtimeMetadata,
  } as const;

  const results: Array<ExperimentItemResult<Item, Output> | undefined> = [];
  const concurrency = Math.max(1, Math.trunc(options.concurrency ?? 1) || 1);
  let indexCounter = 0;
  const active = new Set<Promise<void>>();

  try {
    if (voltOpsRun) {
      voltOpsRun.setDataset(datasetStream.dataset);
      await voltOpsRun.prepare();
    }

    for await (const item of datasetStream.items as AsyncIterable<Item>) {
      ensureNotAborted(options.signal);
      const currentIndex = indexCounter++;

      const task = (async () => {
        const result = await processExperimentItem({
          item,
          index: currentIndex,
          total: datasetStream.total,
          config,
          scorerDefinitions,
          scorerMap,
          aggregatorState,
          passCriteria,
          runtimeMetadata,
          runnerContextBase,
          options,
          voltOpsRun,
        });

        results[currentIndex] = result.itemResult;

        await maybeCall(options.onItem, {
          index: currentIndex,
          item,
          result: result.itemResult,
          summary: result.summary,
        });

        await maybeCall(options.onProgress, {
          completed: aggregatorState.completedCount,
          total: datasetStream.total ?? undefined,
        });
      })();

      active.add(task);
      void task.finally(() => {
        active.delete(task);
      });

      if (active.size >= concurrency) {
        await Promise.race(active);
      }
    }

    if (active.size > 0) {
      await Promise.all(active);
    }

    const finalSummary = buildAggregatorSummary(aggregatorState, passCriteria, Date.now());

    await voltOpsRun?.complete({ summary: finalSummary });

    const orderedItems = results.filter(
      (value): value is ExperimentItemResult<Item, Output> => value !== undefined,
    );

    const metadata = mergeMetadata(config.metadata, voltOpsRun?.getMetadata());

    return {
      runId: voltOpsRun?.runId,
      summary: finalSummary,
      items: orderedItems,
      metadata,
    };
  } catch (error) {
    await voltOpsRun?.fail(error);
    throw error;
  }
}

interface ProcessItemArgs<Item extends ExperimentDatasetItem, Output, TVoltOpsClient> {
  item: Item;
  index: number;
  total?: number;
  config: ExperimentConfig<Item, Output, TVoltOpsClient>;
  scorerDefinitions: Array<ExperimentRuntimeScorerBundle<Item>["definition"]>;
  scorerMap: Map<string, ExperimentRuntimeScorerBundle<Item>>;
  aggregatorState: ReturnType<typeof createAggregatorState>;
  passCriteria: ExperimentPassCriteria[];
  runtimeMetadata: ExperimentRuntimeMetadata;
  runnerContextBase: {
    voltOpsClient?: TVoltOpsClient;
    runtime: ExperimentRuntimeMetadata;
  };
  options: RunExperimentOptions<Item, Output, TVoltOpsClient>;
  voltOpsRun?: VoltOpsRunManager<ExperimentItemResult<Item, Output>>;
}

interface ProcessItemResult<Item extends ExperimentDatasetItem, Output> {
  itemResult: ExperimentItemResult<Item, Output>;
  summary: ExperimentResult<Item, Output>["summary"];
}

async function processExperimentItem<Item extends ExperimentDatasetItem, Output, TVoltOpsClient>(
  args: ProcessItemArgs<Item, Output, TVoltOpsClient>,
): Promise<ProcessItemResult<Item, Output>> {
  const {
    item,
    index,
    total,
    config,
    scorerDefinitions,
    scorerMap,
    aggregatorState,
    passCriteria,
    runtimeMetadata,
    runnerContextBase,
    options,
    voltOpsRun,
  } = args;

  ensureNotAborted(options.signal);

  const itemStartedAt = Date.now();
  const runnerSnapshot: ExperimentRunnerSnapshot<Output> = {
    startedAt: itemStartedAt,
  };

  let runnerOutput: Output | undefined;
  let runnerError: unknown;

  try {
    const runnerResult = await executeRunner(config.runner, {
      item,
      index,
      total,
      signal: options.signal,
      voltOpsClient: runnerContextBase.voltOpsClient,
      runtime: runtimeMetadata,
    });

    runnerOutput = runnerResult.output;
    runnerSnapshot.output = runnerResult.output;
    runnerSnapshot.metadata = runnerResult.metadata ?? null;
    runnerSnapshot.traceIds = runnerResult.traceIds;
  } catch (error) {
    runnerError = error;
    runnerSnapshot.error = error;
  } finally {
    const completedAt = Date.now();
    runnerSnapshot.completedAt = completedAt;
    runnerSnapshot.durationMs = completedAt - runnerSnapshot.startedAt;
  }

  const scores: Record<string, ExperimentScore> = {};
  let scoringError: unknown;

  if (!runnerError && scorerDefinitions.length > 0) {
    try {
      const payload = createRuntimePayload(item, runnerOutput);
      const execution = await runLocalScorers({
        payload,
        baseArgs: (context: ExperimentRuntimePayload<Item>) => ({
          output: context.output,
          expected: context.expected,
          input: context.input,
          item: context.item,
          datasetId: context.datasetId,
          datasetVersionId: context.datasetVersionId,
          datasetName: context.datasetName,
        }),
        scorers: scorerDefinitions,
      });

      for (const result of execution.results) {
        const bundle = scorerMap.get(result.id);
        scores[result.id] = toExperimentScore(result, bundle);
      }
    } catch (error) {
      scoringError = error;
    }
  }

  const statusEvaluation = evaluateItemStatus(scores, runnerError, scoringError);
  const itemCompletedAt = Date.now();

  const itemResult: ExperimentItemResult<Item, Output> = {
    item,
    itemId: item.id,
    index,
    status: statusEvaluation.status,
    runner: runnerSnapshot,
    scores,
    thresholdPassed: statusEvaluation.thresholdPassed,
    error: statusEvaluation.error,
    durationMs: itemCompletedAt - itemStartedAt,
    datasetId: item.datasetId ?? undefined,
    datasetVersionId: item.datasetVersionId ?? undefined,
    datasetName: item.datasetName ?? undefined,
  };

  recordAggregatorResult(aggregatorState, itemResult);
  const summary = buildAggregatorSummary(aggregatorState, passCriteria, itemCompletedAt);

  await voltOpsRun?.appendResult({ item: itemResult });

  return {
    itemResult,
    summary,
  };
}

async function executeRunner<Item extends ExperimentDatasetItem, Output, TVoltOpsClient>(
  runner: ExperimentRunner<Item, Output, TVoltOpsClient>,
  context: ExperimentRunnerContext<Item, TVoltOpsClient>,
): Promise<{
  output: Output | undefined;
  metadata?: Record<string, unknown> | null;
  traceIds?: string[];
}> {
  ensureNotAborted(context.signal);
  const runnerResult = await runner(context);
  return normalizeRunnerResult(runnerResult);
}

function normalizeRunnerResult<Output>(value: ExperimentRunnerReturn<Output>): {
  output: Output | undefined;
  metadata?: Record<string, unknown> | null;
  traceIds?: string[];
} {
  if (isRunnerResultObject(value)) {
    return {
      output: (value as { output: Output }).output,
      metadata: normalizeMetadata(
        (value as { metadata?: Record<string, unknown> | null }).metadata,
      ),
      traceIds: Array.isArray((value as { traceIds?: string[] }).traceIds)
        ? (value as { traceIds?: string[] }).traceIds
        : undefined,
    };
  }

  return {
    output: value as Output,
    metadata: null,
    traceIds: undefined,
  };
}

function createRuntimePayload<Item extends ExperimentDatasetItem, Output>(
  item: Item,
  output: Output | undefined,
): ExperimentRuntimePayload<Item> {
  return {
    input: item.input,
    expected: item.expected,
    output: output as unknown,
    item,
    datasetId: item.datasetId,
    datasetVersionId: item.datasetVersionId,
    datasetName: item.datasetName,
  };
}

function resolveNumericThreshold(...values: Array<unknown>): number | undefined {
  for (const value of values) {
    const numeric = normalizeNumericValue(value);
    if (numeric !== undefined) {
      return numeric;
    }
  }
  return undefined;
}

function normalizeNumericValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return undefined;
}

function toExperimentScore<Item extends ExperimentDatasetItem>(
  result: LocalScorerExecutionResult,
  bundle?: ExperimentRuntimeScorerBundle<Item>,
): ExperimentScore {
  const metadata = normalizeMetadata(result.metadata);
  const voltAgentMeta = extractVoltAgentMetadata(metadata);

  const thresholdValue = resolveNumericThreshold(
    bundle?.threshold,
    voltAgentMeta ? (voltAgentMeta.threshold as unknown) : undefined,
    metadata ? (metadata.threshold as unknown) : undefined,
  );

  const threshold = thresholdValue ?? null;

  let thresholdPassed: boolean | null | undefined =
    typeof voltAgentMeta?.thresholdPassed === "boolean" ? voltAgentMeta.thresholdPassed : undefined;

  if (thresholdPassed === undefined && threshold !== null && result.status === "success") {
    thresholdPassed = typeof result.score === "number" ? result.score >= threshold : null;
  }

  const reason = extractReason(metadata);

  return {
    ...result,
    metadata,
    threshold: threshold ?? null,
    thresholdPassed: thresholdPassed ?? null,
    reason: reason ?? null,
  };
}

function evaluateItemStatus(
  scores: Record<string, ExperimentScore>,
  runnerError: unknown,
  scoringError: unknown,
): { status: ExperimentItemResult["status"]; thresholdPassed?: boolean | null; error?: unknown } {
  if (runnerError) {
    return {
      status: "error",
      thresholdPassed: undefined,
      error: runnerError,
    };
  }

  if (scoringError) {
    return {
      status: "error",
      thresholdPassed: undefined,
      error: scoringError,
    };
  }

  const scoreList = Object.values(scores);
  if (scoreList.some((score) => score.status === "error")) {
    const firstError = scoreList.find((score) => score.error !== undefined)?.error;
    return {
      status: "error",
      thresholdPassed: undefined,
      error: firstError,
    };
  }

  if (!scoreList.length) {
    return {
      status: "passed",
      thresholdPassed: true,
    };
  }

  const hasFailure = scoreList.some((score) => score.thresholdPassed === false);

  if (hasFailure) {
    return {
      status: "failed",
      thresholdPassed: false,
    };
  }

  return {
    status: "passed",
    thresholdPassed: true,
  };
}

function normalizeExperimentDefinition<Item extends ExperimentDatasetItem, Output, TVoltOpsClient>(
  experiment: ExperimentInput<Item, Output, TVoltOpsClient>,
): ExperimentDefinition<Item, Output, TVoltOpsClient> {
  if (isExperimentDefinition(experiment)) {
    return experiment;
  }

  return {
    kind: EXPERIMENT_DEFINITION_KIND,
    config: Object.freeze(experiment),
  };
}

function isExperimentDefinition<Item extends ExperimentDatasetItem, Output, TVoltOpsClient>(
  value: ExperimentInput<Item, Output, TVoltOpsClient>,
): value is ExperimentDefinition<Item, Output, TVoltOpsClient> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as unknown as Record<string, unknown>;
  return record.kind === EXPERIMENT_DEFINITION_KIND;
}

function ensureNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason ?? new Error("Experiment run aborted");
  }
}

function maybeCall<T>(fn: ((arg: T) => void | Promise<void>) | undefined, arg: T): Promise<void> {
  if (!fn) {
    return Promise.resolve();
  }
  return Promise.resolve(fn(arg));
}

function isRunnerResultObject<Output>(
  value: ExperimentRunnerReturn<Output>,
): value is { output: Output; metadata?: Record<string, unknown> | null; traceIds?: string[] } {
  return (
    Boolean(value) && typeof value === "object" && "output" in (value as Record<string, unknown>)
  );
}

function normalizeMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!metadata) {
    return null;
  }
  if (typeof metadata !== "object") {
    return null;
  }
  return { ...metadata };
}

function extractVoltAgentMetadata(
  metadata: Record<string, unknown> | null,
): Record<string, unknown> | null | undefined {
  if (!metadata) {
    return null;
  }
  const voltAgent = metadata.voltAgent;
  if (voltAgent && typeof voltAgent === "object") {
    return voltAgent as Record<string, unknown>;
  }
  return null;
}

function extractReason(metadata: Record<string, unknown> | null): string | undefined {
  if (!metadata) {
    return undefined;
  }

  if (typeof metadata.reason === "string") {
    return metadata.reason;
  }

  const voltAgent = extractVoltAgentMetadata(metadata);
  if (voltAgent && typeof voltAgent.reason === "string") {
    return voltAgent.reason;
  }

  return undefined;
}

function mergeMetadata(
  base: Record<string, unknown> | null | undefined,
  extra?: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  const normalizedBase =
    base && typeof base === "object" && !Array.isArray(base)
      ? { ...(base as Record<string, unknown>) }
      : {};

  if (extra && typeof extra === "object" && !Array.isArray(extra)) {
    Object.assign(normalizedBase, extra as Record<string, unknown>);
  }

  return Object.keys(normalizedBase).length > 0 ? normalizedBase : null;
}

function attachVoltOpsDatasetResolver<Item extends ExperimentDatasetItem>(
  descriptor: ExperimentConfig<Item>["dataset"],
  voltOpsClient: unknown,
): ExperimentConfig<Item>["dataset"] {
  if (!descriptor) {
    return descriptor;
  }

  if (descriptor.items || descriptor.resolve) {
    return descriptor;
  }

  if (!voltOpsClient || !isVoltOpsDatasetClient(voltOpsClient)) {
    return descriptor;
  }

  return {
    ...descriptor,
    resolve: async ({ limit, signal }) =>
      resolveVoltOpsDatasetStream<Item>({
        sdk: voltOpsClient,
        config: {
          id: descriptor.id,
          name: descriptor.name,
          versionId: descriptor.versionId,
          limit: descriptor.limit,
        },
        limit,
        signal,
      }),
  };
}

function isVoltOpsDatasetClient(value: unknown): value is VoltOpsRestClient {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as VoltOpsRestClient).resolveDatasetVersionId === "function" &&
      typeof (value as VoltOpsRestClient).getDataset === "function" &&
      typeof (value as VoltOpsRestClient).listDatasetItems === "function",
  );
}
