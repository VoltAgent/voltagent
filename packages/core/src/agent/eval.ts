import type { Logger } from "@voltagent/internal";
import { safeStringify } from "@voltagent/internal/utils";
import { type LocalScorerDefinition, runLocalScorers } from "../eval/runtime";
import type { VoltAgentObservability } from "../observability";
import type { ObservabilityEvalScoreRecord } from "../observability/types";
import { AgentRegistry } from "../registries/agent-registry";
import { randomUUID } from "../utils/id";
import type {
  VoltOpsAppendEvalRunResultsRequest,
  VoltOpsClient,
  VoltOpsCompleteEvalRunRequest,
  VoltOpsCreateEvalRunRequest,
  VoltOpsEvalRunCompletionSummaryPayload,
  VoltOpsTerminalEvalRunStatus,
} from "../voltops";
import type {
  AgentEvalConfig,
  AgentEvalContext,
  AgentEvalOperationType,
  AgentEvalPayload,
  AgentEvalResult,
  AgentEvalScorerConfig,
  OperationContext,
} from "./types";

const scheduleAsync =
  typeof setImmediate === "function"
    ? (fn: () => void) => {
        setImmediate(fn);
      }
    : (fn: () => void) => {
        setTimeout(fn, 0);
      };

export interface AgentEvalHost {
  readonly id: string;
  readonly name: string;
  readonly logger: Logger;
  readonly evalConfig?: AgentEvalConfig;
  getObservability(): VoltAgentObservability;
}

const ensuredVoltOpsScorers = new Set<string>();

export interface EnqueueEvalScoringArgs {
  oc: OperationContext;
  output: unknown;
  operation: AgentEvalOperationType;
  metadata?: Record<string, unknown>;
}

export function enqueueEvalScoring(host: AgentEvalHost, args: EnqueueEvalScoringArgs): void {
  const config = host.evalConfig;
  if (!config || !config.scorers || Object.keys(config.scorers).length === 0) {
    return;
  }

  const rawPayload = buildEvalPayload(args.oc, args.output, args.operation, args.metadata);
  if (!rawPayload) {
    return;
  }

  const storagePayload =
    config.redact?.(cloneEvalPayload(rawPayload)) ?? cloneEvalPayload(rawPayload);

  const context: AgentEvalContext = {
    ...rawPayload,
    agentId: host.id,
    agentName: host.name,
    timestamp: new Date().toISOString(),
    rawPayload,
  };

  const observability = host.getObservability();

  scheduleAsync(() => {
    runEvalScorers(host, {
      config,
      context,
      rawPayload,
      storagePayload,
      observability,
    }).catch((error) => {
      host.logger.warn(`[Agent:${host.name}] eval scoring failed`, {
        error: error instanceof Error ? error.message : error,
      });
    });
  });
}

interface RunEvalScorersArgs {
  config: AgentEvalConfig;
  context: AgentEvalContext;
  rawPayload: AgentEvalPayload;
  storagePayload: AgentEvalPayload;
  observability: VoltAgentObservability;
}

async function runEvalScorers(host: AgentEvalHost, args: RunEvalScorersArgs): Promise<void> {
  const { config, context, rawPayload, storagePayload, observability } = args;
  const scorerEntries = Object.entries(config.scorers ?? {});
  if (scorerEntries.length === 0) {
    return;
  }

  type ScorerDescriptor = {
    key: string;
    config: AgentEvalScorerConfig;
    definition: LocalScorerDefinition<AgentEvalContext, Record<string, unknown>>;
  };

  const descriptors: ScorerDescriptor[] = [];
  for (const [key, scorerConfig] of scorerEntries) {
    let definition: LocalScorerDefinition<AgentEvalContext, Record<string, unknown>> | null = null;
    try {
      definition = await resolveEvalScorersDefinition(key, scorerConfig);
    } catch (error) {
      host.logger.warn(`[Agent:${host.name}] Failed to resolve eval scorer for key ${key}`, {
        error: error instanceof Error ? error.message : error,
      });
      continue;
    }
    if (!definition) {
      host.logger.warn(`[Agent:${host.name}] Unknown eval scorer for key ${key}`);
      continue;
    }
    descriptors.push({ key, config: scorerConfig, definition });
  }

  if (descriptors.length === 0) {
    return;
  }

  const descriptorById = new Map<string, ScorerDescriptor>();
  for (const descriptor of descriptors) {
    descriptorById.set(descriptor.definition.id, descriptor);
  }

  const execution = await runLocalScorers({
    payload: context,
    defaultSampling: config.sampling,
    baseArgs: (payload) => {
      const base: Record<string, unknown> = {
        output: payload.output ?? "",
      };
      if (payload.input !== undefined) {
        base.input = payload.input ?? "";
      }
      return base;
    },
    scorers: descriptors.map(({ definition }) => definition),
  });

  const voltOpsRecords: ObservabilityEvalScoreRecord[] = [];

  for (const result of execution.results) {
    const descriptor = descriptorById.get(result.id);
    if (!descriptor) {
      host.logger.warn(
        `[Agent:${host.name}] Received eval scorer result for unknown id ${result.id}`,
      );
      continue;
    }

    const { config: scorerConfig, definition } = descriptor;
    const createdAt = new Date();

    const combinedMetadata = combineEvalMetadata(storagePayload, result.metadata);
    const scoreValue = result.score ?? null;
    const thresholdValue = resolveThresholdFromMetadata(combinedMetadata);
    let thresholdPassed = resolveThresholdPassedFromMetadata(combinedMetadata);
    if (thresholdPassed === null && thresholdValue !== undefined && scoreValue !== null) {
      thresholdPassed = scoreValue >= thresholdValue;
    }
    const datasetMetadata = extractDatasetMetadataFromCombinedMetadata(combinedMetadata);

    const record: ObservabilityEvalScoreRecord = {
      id: randomUUID(),
      agentId: host.id,
      agentName: host.name,
      traceId: storagePayload.traceId,
      spanId: storagePayload.spanId,
      operationId: storagePayload.operationId,
      operationType: storagePayload.operationType,
      scorerId: definition.id,
      scorerName: definition.name,
      status: result.status,
      score: scoreValue,
      metadata: combinedMetadata,
      sampling: result.sampling,
      triggerSource: config.triggerSource ?? "live",
      environment: config.environment,
      durationMs: result.durationMs,
      errorMessage: result.error ? extractErrorMessage(result.error) : undefined,
      createdAt: createdAt.toISOString(),
      threshold: thresholdValue ?? null,
      thresholdPassed,
      datasetId: datasetMetadata?.datasetId,
      datasetVersionId: datasetMetadata?.datasetVersionId,
      datasetItemHash: datasetMetadata?.datasetItemHash,
      datasetItemId: datasetMetadata?.datasetItemId,
    };

    await persistEvalScore(observability, record, host, { forward: false });

    await invokeEvalResultCallback(host, scorerConfig, {
      scorerId: definition.id,
      scorerName: definition.name,
      status: result.status,
      score: result.score ?? null,
      metadata: record.metadata ?? undefined,
      error: result.error,
      durationMs: result.durationMs,
      payload: storagePayload,
      rawPayload,
    });

    if (result.status === "error") {
      host.logger.warn(`[Agent:${host.name}] Eval scorer '${definition.name}' failed`, {
        error: result.error instanceof Error ? result.error.message : result.error,
        scorerId: definition.id,
      });
    }

    if (result.status !== "skipped") {
      voltOpsRecords.push(record);
    }
  }

  if (voltOpsRecords.length > 0) {
    scheduleAsync(() => {
      void forwardEvalScoresToVoltOps(voltOpsRecords, host).catch((error) => {
        host.logger.warn(`[Agent:${host.name}] Failed to sync eval scores to VoltOps`, {
          error: error instanceof Error ? error.message : error,
        });
      });
    });
  }
}

async function resolveEvalScorersDefinition(
  key: string,
  config: AgentEvalScorerConfig,
): Promise<LocalScorerDefinition<AgentEvalContext, Record<string, unknown>> | null> {
  const scorerRef = config.scorer;
  let baseDefinition: LocalScorerDefinition<AgentEvalContext, Record<string, unknown>> | null =
    null;

  if (isLocalScorerDefinition(scorerRef)) {
    baseDefinition = scorerRef;
  } else if (typeof scorerRef === "function") {
    const resolved = await scorerRef();
    if (!isLocalScorerDefinition(resolved)) {
      throw new Error(
        `Agent eval scorer factory for key '${key}' did not return a LocalScorerDefinition.`,
      );
    }
    baseDefinition = resolved;
  }

  if (!baseDefinition) {
    return null;
  }

  return applyEvalConfigOverrides(baseDefinition, key, config);
}

function applyEvalConfigOverrides(
  baseDefinition: LocalScorerDefinition<AgentEvalContext, Record<string, unknown>>,
  key: string,
  config: AgentEvalScorerConfig,
): LocalScorerDefinition<AgentEvalContext, Record<string, unknown>> {
  const resolvedId = config.id ?? baseDefinition.id ?? key ?? randomUUID();
  const resolvedName = baseDefinition.name ?? resolvedId;

  return {
    ...baseDefinition,
    id: resolvedId,
    name: resolvedName,
    sampling: config.sampling ?? baseDefinition.sampling,
    params: mergeParamsSources(baseDefinition.params, config.params),
  };
}

function mergeParamsSources(
  baseParams: LocalScorerDefinition<AgentEvalContext, Record<string, unknown>>["params"],
  override: AgentEvalScorerConfig["params"],
): LocalScorerDefinition<AgentEvalContext, Record<string, unknown>>["params"] | undefined {
  if (!override) {
    return baseParams;
  }

  if (!baseParams) {
    return typeof override === "function" ? override : { ...override };
  }

  return async (payload: AgentEvalContext) => {
    const baseValue = await resolveParamsSource(baseParams, payload);
    const overrideValue = await resolveParamsSource(override, payload);
    const merged = {
      ...baseValue,
      ...overrideValue,
    };
    return Object.keys(merged).length > 0 ? merged : {};
  };
}

async function resolveParamsSource(
  source:
    | LocalScorerDefinition<AgentEvalContext, Record<string, unknown>>["params"]
    | AgentEvalScorerConfig["params"],
  payload: AgentEvalContext,
): Promise<Record<string, unknown>> {
  if (!source) {
    return {};
  }

  if (typeof source === "function") {
    const value = await source(payload);
    return isPlainRecord(value) ? { ...value } : {};
  }

  return isPlainRecord(source) ? { ...source } : {};
}

function isLocalScorerDefinition(
  value: unknown,
): value is LocalScorerDefinition<AgentEvalContext, Record<string, unknown>> {
  return (
    Boolean(value) && typeof value === "object" && "scorer" in (value as Record<string, unknown>)
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildEvalPayload(
  oc: OperationContext,
  output: unknown,
  operation: AgentEvalOperationType,
  metadata?: Record<string, unknown>,
): AgentEvalPayload | undefined {
  const rootSpan = oc.traceContext.getRootSpan();
  const spanContext = rootSpan.spanContext();
  if (!spanContext.traceId || !spanContext.spanId) {
    return undefined;
  }

  return {
    operationId: oc.operationId,
    operationType: operation,
    input: normalizeEvalString(oc.input),
    output: normalizeEvalString(output),
    rawInput: oc.input,
    rawOutput: output,
    userId: oc.userId,
    conversationId: oc.conversationId,
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    metadata,
  };
}

function normalizeEvalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return safeStringify(value);
}

function cloneEvalPayload(payload: AgentEvalPayload): AgentEvalPayload {
  return JSON.parse(safeStringify(payload)) as AgentEvalPayload;
}

function combineEvalMetadata(
  payload: AgentEvalPayload,
  scorerMetadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  const combined: Record<string, unknown> = {};

  if (payload.input !== undefined) {
    combined.input = payload.input;
  }
  if (payload.output !== undefined) {
    combined.output = payload.output;
  }

  const payloadMetadata = isPlainRecord(payload.metadata)
    ? (payload.metadata as Record<string, unknown>)
    : undefined;
  if (payloadMetadata && Object.keys(payloadMetadata).length > 0) {
    combined.payload = payloadMetadata;
  }

  const scorerRecord = isPlainRecord(scorerMetadata)
    ? (scorerMetadata as Record<string, unknown>)
    : undefined;
  if (scorerRecord && Object.keys(scorerRecord).length > 0) {
    combined.scorer = scorerRecord;
    const builderSnapshot = isPlainRecord(scorerRecord.scorerBuilder)
      ? (scorerRecord.scorerBuilder as Record<string, unknown>)
      : undefined;
    if (builderSnapshot) {
      combined.scorerBuilder = builderSnapshot;
    }
  }

  const voltAgentMetadata = collectVoltAgentMetadataFromSources(payloadMetadata, scorerRecord);
  const datasetMetadata = collectDatasetMetadataFromSources(payloadMetadata, scorerRecord);
  const liveEvalMetadata = collectLiveEvalMetadata(payloadMetadata, scorerRecord);

  if (datasetMetadata) {
    combined.dataset = {
      ...(isPlainRecord(combined.dataset) ? (combined.dataset as Record<string, unknown>) : {}),
      ...datasetMetadata,
    };
  }

  if (voltAgentMetadata || datasetMetadata) {
    const mergedVoltAgent: Record<string, unknown> = {
      ...(voltAgentMetadata ?? {}),
    };
    if (datasetMetadata) {
      const baseDataset = isPlainRecord(mergedVoltAgent.dataset)
        ? (mergedVoltAgent.dataset as Record<string, unknown>)
        : undefined;
      mergedVoltAgent.dataset = {
        ...(baseDataset ?? {}),
        ...datasetMetadata,
      };
    }
    if (Object.keys(mergedVoltAgent).length > 0) {
      combined.voltAgent = mergedVoltAgent;
    }
  }

  if (liveEvalMetadata && Object.keys(liveEvalMetadata).length > 0) {
    combined.liveEval = liveEvalMetadata;
  }

  return Object.keys(combined).length > 0 ? combined : null;
}

interface CombinedDatasetMetadata {
  datasetId?: string;
  datasetVersionId?: string;
  datasetItemHash?: string;
  datasetItemId?: string;
  datasetItemLabel?: string | null;
}

function collectVoltAgentMetadataFromSources(
  ...sources: Array<Record<string, unknown> | undefined>
): Record<string, unknown> | undefined {
  const records: Record<string, unknown>[] = [];
  const seen = new WeakSet<Record<string, unknown>>();

  for (const source of sources) {
    gatherVoltAgentRecords(source, records, seen, false);
  }

  if (records.length === 0) {
    return undefined;
  }

  const merged: Record<string, unknown> = {};
  for (const record of records) {
    Object.assign(merged, record);
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function collectDatasetMetadataFromSources(
  ...sources: Array<Record<string, unknown> | undefined>
): CombinedDatasetMetadata | undefined {
  const candidates: Record<string, unknown>[] = [];
  const seen = new WeakSet<Record<string, unknown>>();

  for (const source of sources) {
    gatherDatasetRecords(source, candidates, seen, true);
  }

  if (candidates.length === 0) {
    return undefined;
  }

  const merged: CombinedDatasetMetadata = {};
  const assignString = (value: unknown, key: keyof CombinedDatasetMetadata) => {
    if (merged[key] !== undefined) {
      return;
    }
    if (typeof value === "string" && value.length > 0) {
      merged[key] = value;
    }
  };

  for (const candidate of candidates) {
    assignString(candidate.datasetId, "datasetId");
    assignString(candidate.id, "datasetId");
    assignString(candidate.datasetVersionId, "datasetVersionId");
    assignString(candidate.versionId, "datasetVersionId");
    assignString(candidate.datasetItemHash, "datasetItemHash");
    assignString(candidate.itemHash, "datasetItemHash");
    assignString(candidate.datasetItemId, "datasetItemId");
    assignString(candidate.itemId, "datasetItemId");

    if (merged.datasetItemLabel === undefined) {
      const labelValue = candidate.datasetItemLabel;
      if (labelValue === null || typeof labelValue === "string") {
        merged.datasetItemLabel = labelValue ?? null;
      }
    }

    if (merged.datasetItemLabel === undefined) {
      const altLabel = candidate.itemLabel;
      if (altLabel === null || typeof altLabel === "string") {
        merged.datasetItemLabel = altLabel ?? null;
      }
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function collectLiveEvalMetadata(
  ...sources: Array<Record<string, unknown> | undefined>
): Record<string, unknown> | undefined {
  const merged: Record<string, unknown> = {};
  let found = false;

  for (const source of sources) {
    if (!source) {
      continue;
    }
    const candidate = source.liveEval;
    if (isPlainRecord(candidate)) {
      Object.assign(merged, candidate as Record<string, unknown>);
      found = true;
    }
  }

  return found && Object.keys(merged).length > 0 ? merged : undefined;
}

function gatherVoltAgentRecords(
  source: Record<string, unknown> | undefined,
  out: Record<string, unknown>[],
  seen: WeakSet<Record<string, unknown>>,
  treatAsVoltAgent: boolean,
): void {
  if (!source || seen.has(source)) {
    return;
  }
  seen.add(source);

  if (treatAsVoltAgent) {
    out.push(source);
  }

  const current = source as Record<string, unknown>;

  const voltAgent = isPlainRecord(current.voltAgent)
    ? (current.voltAgent as Record<string, unknown>)
    : undefined;
  if (voltAgent) {
    gatherVoltAgentRecords(voltAgent, out, seen, true);
  }

  const scorer = isPlainRecord(current.scorer)
    ? (current.scorer as Record<string, unknown>)
    : undefined;
  if (scorer) {
    gatherVoltAgentRecords(scorer, out, seen, false);
  }

  const payload = isPlainRecord(current.payload)
    ? (current.payload as Record<string, unknown>)
    : undefined;
  if (payload) {
    gatherVoltAgentRecords(payload, out, seen, false);
  }
}

function gatherDatasetRecords(
  source: Record<string, unknown> | undefined,
  out: Record<string, unknown>[],
  seen: WeakSet<Record<string, unknown>>,
  inspectSelf: boolean,
): void {
  if (!source || seen.has(source)) {
    return;
  }
  seen.add(source);

  if (inspectSelf && hasDatasetShape(source)) {
    out.push(source);
  }

  const current = source as Record<string, unknown>;

  const dataset = isPlainRecord(current.dataset)
    ? (current.dataset as Record<string, unknown>)
    : undefined;
  if (dataset) {
    gatherDatasetRecords(dataset, out, seen, true);
  }

  const voltAgent = isPlainRecord(current.voltAgent)
    ? (current.voltAgent as Record<string, unknown>)
    : undefined;
  if (voltAgent) {
    gatherDatasetRecords(voltAgent, out, seen, true);
  }

  const payload = isPlainRecord(current.payload)
    ? (current.payload as Record<string, unknown>)
    : undefined;
  if (payload) {
    gatherDatasetRecords(payload, out, seen, true);
  }

  const scorer = isPlainRecord(current.scorer)
    ? (current.scorer as Record<string, unknown>)
    : undefined;
  if (scorer) {
    gatherDatasetRecords(scorer, out, seen, true);
  }
}

function hasDatasetShape(source: Record<string, unknown>): boolean {
  return (
    typeof source.datasetId === "string" ||
    typeof source.datasetVersionId === "string" ||
    typeof source.datasetItemId === "string" ||
    typeof source.datasetItemHash === "string" ||
    typeof source.id === "string" ||
    typeof source.itemId === "string"
  );
}

function resolveThresholdFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): number | undefined {
  const record = isPlainRecord(metadata) ? (metadata as Record<string, unknown>) : undefined;
  const voltAgent = collectVoltAgentMetadataFromSources(record);
  if (!voltAgent) {
    return undefined;
  }
  const threshold = voltAgent.threshold;
  return typeof threshold === "number" ? threshold : undefined;
}

function resolveThresholdPassedFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): boolean | null {
  const record = isPlainRecord(metadata) ? (metadata as Record<string, unknown>) : undefined;
  const voltAgent = collectVoltAgentMetadataFromSources(record);
  if (!voltAgent) {
    return null;
  }
  const value = voltAgent.thresholdPassed;
  return typeof value === "boolean" ? value : null;
}

function extractDatasetMetadataFromCombinedMetadata(
  metadata: Record<string, unknown> | null | undefined,
):
  | {
      datasetId?: string;
      datasetVersionId?: string;
      datasetItemHash?: string;
      datasetItemId?: string;
    }
  | undefined {
  const record = isPlainRecord(metadata) ? (metadata as Record<string, unknown>) : undefined;
  if (!record) {
    return undefined;
  }

  const datasetMetadata = collectDatasetMetadataFromSources(record);
  if (!datasetMetadata) {
    return undefined;
  }

  return {
    datasetId: datasetMetadata.datasetId,
    datasetVersionId: datasetMetadata.datasetVersionId,
    datasetItemHash: datasetMetadata.datasetItemHash,
    datasetItemId: datasetMetadata.datasetItemId,
  };
}

interface PersistEvalScoreOptions {
  forward?: boolean;
}

async function persistEvalScore(
  observability: VoltAgentObservability,
  record: ObservabilityEvalScoreRecord,
  host: AgentEvalHost,
  options: PersistEvalScoreOptions = {},
): Promise<void> {
  const storage = observability.getStorage();
  if (!storage?.saveEvalScore) {
    return;
  }
  try {
    await storage.saveEvalScore(record);

    if (options.forward ?? true) {
      scheduleAsync(() => {
        void forwardEvalScoresToVoltOps([record], host).catch((error) => {
          host.logger.warn(`[Agent:${host.name}] Failed to sync eval score to VoltOps`, {
            error: error instanceof Error ? error.message : error,
            scoreId: record.id,
          });
        });
      });
    }
  } catch (error) {
    host.logger.warn(`[Agent:${host.name}] Failed to persist eval score`, {
      error: error instanceof Error ? error.message : error,
      scorerId: record.scorerId,
    });
  }
}

async function forwardEvalScoresToVoltOps(
  records: ObservabilityEvalScoreRecord[],
  host: AgentEvalHost,
): Promise<void> {
  const voltOpsClient = AgentRegistry.getInstance().getGlobalVoltOpsClient();
  if (!voltOpsClient || !voltOpsClient.hasValidKeys()) {
    return;
  }

  const evaluableRecords = records.filter((record) => record.status !== "skipped");
  if (evaluableRecords.length === 0) {
    return;
  }

  const firstRecord = evaluableRecords[0];
  const runPayload: VoltOpsCreateEvalRunRequest = {
    triggerSource: firstRecord.triggerSource ?? "live-eval",
    autoQueue: false,
  };

  for (const record of evaluableRecords) {
    await ensureVoltOpsScorer(voltOpsClient, record, host);
  }

  const runSummary = await voltOpsClient.createEvalRun(runPayload);

  const appendPayload: VoltOpsAppendEvalRunResultsRequest = {
    results: evaluableRecords.map((record) => buildVoltOpsResultPayload(record)),
  };

  await voltOpsClient.appendEvalRunResults(runSummary.id, appendPayload);

  const completionPayload = buildVoltOpsBatchCompletionPayload(evaluableRecords);

  await voltOpsClient.completeEvalRun(runSummary.id, completionPayload);

  host.logger.debug(`[Agent:${host.name}] Synced eval score to VoltOps`, {
    scoreIds: evaluableRecords.map((record) => record.id),
    runId: runSummary.id,
  });
}

function buildVoltOpsResultPayload(
  record: ObservabilityEvalScoreRecord,
): VoltOpsAppendEvalRunResultsRequest["results"][number] {
  const metadata = cloneMetadata(record.metadata);
  if (record.errorMessage) {
    metadata.errorMessage = record.errorMessage;
  }

  return {
    datasetItemHash: buildDatasetItemHash(record),
    datasetId: record.datasetId ?? null,
    datasetVersionId: record.datasetVersionId ?? null,
    datasetItemId: record.datasetItemId ?? null,
    status: mapEvalResultStatus(record.status),
    input: metadata.input ?? null,
    expected: null,
    output: metadata.output ?? null,
    durationMs: record.durationMs ?? null,
    metadata,
    scores: [
      {
        scorerId: record.scorerId,
        score: record.score ?? null,
        metadata: extractScorerMetadata(record.metadata),
      },
    ],
    traceIds: record.traceId ? [record.traceId] : null,
    liveEval: {
      traceId: record.traceId ?? null,
      spanId: record.spanId ?? null,
      operationId: record.operationId ?? null,
      operationType: record.operationType ?? null,
      sampling: record.sampling ?? null,
      triggerSource: record.triggerSource ?? null,
      environment: record.environment ?? null,
    },
  };
}

function buildVoltOpsBatchCompletionPayload(
  records: ObservabilityEvalScoreRecord[],
): VoltOpsCompleteEvalRunRequest {
  const itemCount = records.length;
  const successCount = records.filter((record) => record.status === "success").length;
  const failureCount = records.filter((record) => record.status === "error").length;
  const scoreValues = records
    .map((record) => (typeof record.score === "number" ? record.score : null))
    .filter((value): value is number => value !== null);

  const meanScore = scoreValues.length
    ? scoreValues.reduce((total, score) => total + score, 0) / scoreValues.length
    : null;
  const passRate = itemCount > 0 ? successCount / itemCount : null;
  const durationValues = records
    .map((record) => (typeof record.durationMs === "number" ? record.durationMs : null))
    .filter((value): value is number => value !== null);
  const totalDuration = durationValues.reduce((total, value) => total + value, 0);

  const createdTimestamps = records
    .map((record) => (record.createdAt ? new Date(record.createdAt).valueOf() : Number.NaN))
    .filter((value) => Number.isFinite(value));
  const startedAt = createdTimestamps.length
    ? new Date(Math.min(...createdTimestamps)).toISOString()
    : undefined;
  const completedAt = createdTimestamps.length
    ? new Date(Math.max(...createdTimestamps)).toISOString()
    : undefined;

  const summaryMetadata = {
    scorers: records.map((record) => ({
      id: record.scorerId,
      name: record.scorerName ?? record.scorerId,
      status: record.status,
      score: record.score ?? null,
      errorMessage: record.errorMessage ?? null,
    })),
  } as Record<string, unknown>;

  const status: VoltOpsTerminalEvalRunStatus = failureCount > 0 ? "failed" : "succeeded";

  const summary: VoltOpsEvalRunCompletionSummaryPayload = {
    itemCount,
    successCount,
    failureCount,
    meanScore,
    passRate,
    durationMs: durationValues.length ? totalDuration : undefined,
    metadata: summaryMetadata,
  };

  if (startedAt) {
    summary.metadata = {
      ...summary.metadata,
      startedAt,
      completedAt,
    };
  }

  return {
    status,
    summary,
    ...(failureCount > 0
      ? {
          error: {
            message: `${failureCount} scorer${failureCount === 1 ? "" : "s"} reported errors`,
          },
        }
      : {}),
  };
}

function mapEvalResultStatus(
  status: ObservabilityEvalScoreRecord["status"],
): VoltOpsAppendEvalRunResultsRequest["results"][number]["status"] {
  switch (status) {
    case "success":
      return "passed";
    case "error":
      return "error";
    default:
      return "pending";
  }
}

function buildDatasetItemHash(record: ObservabilityEvalScoreRecord): string {
  const tracePart = record.traceId ?? "trace";
  return `${tracePart}:${record.id}`;
}

function cloneMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!metadata) {
    return {};
  }
  try {
    return JSON.parse(safeStringify(metadata)) as Record<string, unknown>;
  } catch {
    return { ...metadata };
  }
}

function extractScorerMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!metadata) {
    return null;
  }
  const clone = cloneMetadata(metadata);
  const scorerDetails =
    clone.scorer && typeof clone.scorer === "object" && clone.scorer
      ? (clone.scorer as Record<string, unknown>)
      : undefined;
  const builderDetails =
    clone.scorerBuilder && typeof clone.scorerBuilder === "object"
      ? (clone.scorerBuilder as Record<string, unknown>)
      : undefined;

  const result: Record<string, unknown> = {};
  if (scorerDetails && Object.keys(scorerDetails).length > 0) {
    result.details = scorerDetails;
  }
  if (builderDetails && Object.keys(builderDetails).length > 0) {
    result.builder = builderDetails;
  }

  return Object.keys(result).length > 0 ? result : null;
}

async function ensureVoltOpsScorer(
  client: VoltOpsClient,
  record: ObservabilityEvalScoreRecord,
  host: AgentEvalHost,
): Promise<void> {
  const scorerId = record.scorerId;
  if (ensuredVoltOpsScorers.has(scorerId)) {
    return;
  }
  try {
    await client.createEvalScorer({
      id: scorerId,
      name: record.scorerName ?? scorerId,
      description: `Auto-registered live scorer '${record.scorerName ?? scorerId}' from agent ${host.name}`,
    });
    ensuredVoltOpsScorers.add(scorerId);
  } catch (error) {
    host.logger.warn(`[Agent:${host.name}] Failed to ensure VoltOps scorer`, {
      scorerId,
      error: error instanceof Error ? error.message : error,
    });
  }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return safeStringify(error);
  } catch {
    return String(error);
  }
}

async function invokeEvalResultCallback(
  host: AgentEvalHost,
  config: AgentEvalScorerConfig,
  result: AgentEvalResult,
): Promise<void> {
  if (!config.onResult) {
    return;
  }

  try {
    await config.onResult(result);
  } catch (error) {
    host.logger.warn(`[Agent:${host.name}] Eval scorer onResult callback failed`, {
      error: error instanceof Error ? error.message : error,
      scorerId: result.scorerId,
    });
  }
}
