import {
  type Attributes,
  type Span,
  type SpanContext,
  SpanKind,
  SpanStatusCode,
  context as otelContext,
  trace,
} from "@opentelemetry/api";
import type { Logger } from "@voltagent/internal";
import { safeStringify } from "@voltagent/internal/utils";
import {
  type LocalScorerDefinition,
  type ScorerLifecycleScope,
  runLocalScorers,
} from "../eval/runtime";
import type { VoltAgentObservability } from "../observability";
import { randomUUID } from "../utils/id";
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

type ScorerDescriptor = {
  key: string;
  config: AgentEvalScorerConfig;
  definition: LocalScorerDefinition<AgentEvalContext, Record<string, unknown>>;
};

interface ScoreMetrics {
  combinedMetadata: Record<string, unknown> | null;
  scoreValue: number | null;
  thresholdValue?: number;
  thresholdPassed: boolean | null;
  datasetMetadata?: ReturnType<typeof extractDatasetMetadataFromCombinedMetadata>;
}

async function resolveScorerDescriptors(
  config: AgentEvalConfig,
  host: AgentEvalHost,
): Promise<ScorerDescriptor[]> {
  const scorerEntries = Object.entries(config.scorers ?? {});
  if (scorerEntries.length === 0) {
    return [];
  }

  const descriptors: ScorerDescriptor[] = [];
  for (const [key, scorerConfig] of scorerEntries) {
    try {
      const definition = await resolveEvalScorersDefinition(key, scorerConfig);
      if (!definition) {
        host.logger.warn(`[Agent:${host.name}] Unknown eval scorer for key ${key}`);
        continue;
      }
      descriptors.push({ key, config: scorerConfig, definition });
    } catch (error) {
      host.logger.warn(`[Agent:${host.name}] Failed to resolve eval scorer for key ${key}`, {
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  return descriptors;
}

function buildScoreMetrics(
  storagePayload: AgentEvalPayload,
  result: Awaited<ReturnType<typeof runLocalScorers>>["results"][number],
): ScoreMetrics {
  const combinedMetadata = combineEvalMetadata(storagePayload, result.metadata);
  const scoreValue = result.score ?? null;
  const thresholdValue = resolveThresholdFromMetadata(combinedMetadata);
  let thresholdPassed = resolveThresholdPassedFromMetadata(combinedMetadata);
  if (thresholdPassed === null && thresholdValue !== undefined && scoreValue !== null) {
    thresholdPassed = scoreValue >= thresholdValue;
  }

  const datasetMetadata = extractDatasetMetadataFromCombinedMetadata(combinedMetadata);

  return {
    combinedMetadata,
    scoreValue,
    thresholdValue,
    thresholdPassed,
    datasetMetadata,
  };
}

function createScorerSpanAttributes(
  host: AgentEvalHost,
  descriptor: ScorerDescriptor,
  config: AgentEvalConfig,
  storagePayload: AgentEvalPayload,
  metrics: ScoreMetrics,
  result: Awaited<ReturnType<typeof runLocalScorers>>["results"][number],
): Attributes {
  const { definition } = descriptor;
  const scorerLabel = definition.name ?? descriptor.key ?? definition.id;
  const attributes: Attributes = {
    "span.type": "scorer",
    "voltagent.label": scorerLabel,
    "entity.id": host.id,
    "entity.name": host.name,
    "eval.scorer.id": definition.id,
    "eval.scorer.key": descriptor.key,
    "eval.scorer.name": scorerLabel,
    "eval.scorer.kind": "live",
    "eval.scorer.status": result.status,
    "eval.operation.id": storagePayload.operationId,
    "eval.operation.type": storagePayload.operationType,
    "eval.trace.id": storagePayload.traceId,
    "eval.source.span_id": storagePayload.spanId,
    "eval.trigger_source": config.triggerSource ?? "live",
    "eval.environment": config.environment,
  };

  if (metrics.scoreValue !== null) {
    attributes["eval.scorer.score"] = metrics.scoreValue;
  }
  if (metrics.thresholdValue !== undefined) {
    attributes["eval.scorer.threshold"] = metrics.thresholdValue;
  }
  if (metrics.thresholdPassed !== null) {
    attributes["eval.scorer.threshold_passed"] = metrics.thresholdPassed;
  }
  if (result.durationMs !== undefined) {
    attributes["eval.scorer.duration_ms"] = result.durationMs;
  }
  if (result.sampling?.applied !== undefined) {
    attributes["eval.scorer.sampling.applied"] = result.sampling.applied;
  }
  if (result.sampling?.rate !== undefined) {
    attributes["eval.scorer.sampling.rate"] = result.sampling.rate;
  }
  if (result.sampling?.strategy) {
    attributes["eval.scorer.sampling.strategy"] = result.sampling.strategy;
  }
  if (metrics.datasetMetadata?.datasetId) {
    attributes["eval.dataset.id"] = metrics.datasetMetadata.datasetId;
  }
  if (metrics.datasetMetadata?.datasetVersionId) {
    attributes["eval.dataset.version_id"] = metrics.datasetMetadata.datasetVersionId;
  }
  if (metrics.datasetMetadata?.datasetItemId) {
    attributes["eval.dataset.item_id"] = metrics.datasetMetadata.datasetItemId;
  }
  if (metrics.datasetMetadata?.datasetItemHash) {
    attributes["eval.dataset.item_hash"] = metrics.datasetMetadata.datasetItemHash;
  }
  if (storagePayload.userId) {
    attributes["user.id"] = storagePayload.userId;
  }
  if (storagePayload.conversationId) {
    attributes["conversation.id"] = storagePayload.conversationId;
  }

  return attributes;
}

function finalizeScorerSpan(
  span: Span,
  host: AgentEvalHost,
  descriptor: ScorerDescriptor,
  config: AgentEvalConfig,
  storagePayload: AgentEvalPayload,
  metrics: ScoreMetrics,
  result: Awaited<ReturnType<typeof runLocalScorers>>["results"][number],
): void {
  const attributes = createScorerSpanAttributes(
    host,
    descriptor,
    config,
    storagePayload,
    metrics,
    result,
  );

  span.setAttributes(attributes);

  if (metrics.combinedMetadata && Object.keys(metrics.combinedMetadata).length > 0) {
    try {
      span.setAttribute("eval.scorer.metadata", safeStringify(metrics.combinedMetadata));
    } catch {
      span.setAttribute("eval.scorer.metadata", "[unserializable]");
    }
  }

  span.addEvent("eval.scorer.result", {
    status: result.status,
    score: metrics.scoreValue ?? undefined,
    threshold: metrics.thresholdValue ?? undefined,
    thresholdPassed: metrics.thresholdPassed ?? undefined,
  });

  if (result.status === "error") {
    const errorMessage = extractErrorMessage(result.error);
    span.setAttribute("eval.scorer.error_message", errorMessage);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: errorMessage,
    });
    if (result.error instanceof Error) {
      span.recordException(result.error);
    } else if (result.error) {
      span.recordException({ message: errorMessage });
    }
  } else {
    span.setStatus({
      code: SpanStatusCode.OK,
      message: result.status === "skipped" ? "skipped" : undefined,
    });
  }

  span.end();
}

export interface AgentEvalHost {
  readonly id: string;
  readonly name: string;
  readonly logger: Logger;
  readonly evalConfig?: AgentEvalConfig;
  getObservability(): VoltAgentObservability;
}

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

  const rootSpan = args.oc.traceContext.getRootSpan();
  const rootSpanContext = rootSpan.spanContext();

  const rawPayload = buildEvalPayload(args.oc, args.output, args.operation, args.metadata);
  if (!rawPayload) {
    return;
  }

  const storagePayload =
    config.redact?.(cloneEvalPayload(rawPayload)) ?? cloneEvalPayload(rawPayload);

  if (rootSpanContext.traceId && rootSpanContext.spanId) {
    const scorerKeys = Object.keys(config.scorers ?? {});
    if (scorerKeys.length > 0) {
      rootSpan.setAttribute("eval.scorers.count", scorerKeys.length);
      rootSpan.setAttribute("eval.scorers.trigger_source", config.triggerSource ?? "live");
      rootSpan.setAttribute("eval.operation.type", rawPayload.operationType);
      rootSpan.setAttribute("eval.operation.id", rawPayload.operationId);
      if (config.environment) {
        rootSpan.setAttribute("eval.environment", config.environment);
      }
      if (config.sampling?.type === "ratio" && config.sampling.rate !== undefined) {
        const boundedRate = Math.max(0, Math.min(1, config.sampling.rate));
        rootSpan.setAttribute("eval.sampling.rate", boundedRate);
        rootSpan.setAttribute("eval.sampling.percentage", boundedRate * 100);
      }
      rootSpan.addEvent("eval.scorers.scheduled", {
        count: scorerKeys.length,
        operation: rawPayload.operationType,
        trigger: config.triggerSource ?? "live",
      });
    }
  }

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
      rootSpanContext,
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
  rootSpanContext: SpanContext;
}

async function runEvalScorers(host: AgentEvalHost, args: RunEvalScorersArgs): Promise<void> {
  const { config, context, rawPayload, storagePayload, observability, rootSpanContext } = args;
  const descriptors = await resolveScorerDescriptors(config, host);
  if (descriptors.length === 0) {
    return;
  }

  const descriptorById = new Map<string, ScorerDescriptor>();
  for (const descriptor of descriptors) {
    descriptorById.set(descriptor.definition.id, descriptor);
  }

  const tracer = observability.getTracer();
  const parentContext =
    rootSpanContext.traceId && rootSpanContext.spanId
      ? trace.setSpanContext(otelContext.active(), rootSpanContext)
      : otelContext.active();

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
    onScorerStart: ({ definition }) => {
      const descriptor = descriptorById.get(definition.id);
      if (!descriptor) {
        return undefined;
      }

      const links =
        rootSpanContext.traceId && rootSpanContext.spanId
          ? [
              {
                context: {
                  traceId: rootSpanContext.traceId,
                  spanId: rootSpanContext.spanId,
                  traceFlags: rootSpanContext.traceFlags,
                  traceState: rootSpanContext.traceState,
                },
                attributes: {
                  "link.type": "eval-scorer",
                  "eval.operation.id": storagePayload.operationId,
                  "eval.operation.type": storagePayload.operationType,
                },
              },
            ]
          : undefined;

      const span = tracer.startSpan(
        `eval.scorer.${definition.id}`,
        {
          kind: SpanKind.INTERNAL,
          attributes: { "span.type": "scorer" },
          links,
        },
        parentContext,
      );

      span.setAttributes({
        "voltagent.label": definition.name ?? descriptor.key ?? definition.id,
        "entity.id": host.id,
        "entity.type": "agent",
        "entity.name": host.name,
        "eval.scorer.id": definition.id,
        "eval.scorer.key": descriptor.key,
        "eval.scorer.name": definition.name ?? definition.id,
        "eval.scorer.kind": "live",
        "eval.scorer.status": "running",
        "eval.operation.id": storagePayload.operationId,
        "eval.operation.type": storagePayload.operationType,
        "eval.trace.id": storagePayload.traceId,
        "eval.source.span_id": storagePayload.spanId,
        "eval.trigger_source": config.triggerSource ?? "live",
        "eval.environment": config.environment,
      });

      if (storagePayload.userId) {
        span.setAttribute("user.id", storagePayload.userId);
      }
      if (storagePayload.conversationId) {
        span.setAttribute("conversation.id", storagePayload.conversationId);
      }

      span.addEvent("eval.scorer.started");
      const spanContext = trace.setSpan(parentContext, span);
      return {
        span,
        run: <T>(executor: () => T | Promise<T>) =>
          otelContext.with(spanContext, () => {
            try {
              return Promise.resolve(executor());
            } catch (error) {
              return Promise.reject(error);
            }
          }),
      };
    },
    onScorerComplete: ({ definition, execution: scorerExecution, context: lifecycleContext }) => {
      const lifecycleScope = lifecycleContext as
        | (ScorerLifecycleScope & { span?: Span })
        | undefined;
      const span = lifecycleScope?.span;
      if (!span) {
        return;
      }

      const descriptor = descriptorById.get(definition.id);
      if (!descriptor) {
        span.end();
        return;
      }

      const metrics = buildScoreMetrics(storagePayload, scorerExecution);
      finalizeScorerSpan(span, host, descriptor, config, storagePayload, metrics, scorerExecution);
    },
  });

  for (const result of execution.results) {
    const descriptor = descriptorById.get(result.id);
    if (!descriptor) {
      host.logger.warn(
        `[Agent:${host.name}] Received eval scorer result for unknown id ${result.id}`,
      );
      continue;
    }

    const metrics = buildScoreMetrics(storagePayload, result);

    await invokeEvalResultCallback(host, descriptor.config, {
      scorerId: descriptor.definition.id,
      scorerName: descriptor.definition.name,
      status: result.status,
      score: result.score ?? null,
      metadata: metrics.combinedMetadata ?? undefined,
      error: result.error,
      durationMs: result.durationMs,
      payload: storagePayload,
      rawPayload,
    });

    if (result.status === "error") {
      host.logger.warn(`[Agent:${host.name}] Eval scorer '${descriptor.definition.name}' failed`, {
        error: result.error instanceof Error ? result.error.message : result.error,
        scorerId: descriptor.definition.id,
      });
    }
  }
}

async function resolveEvalScorersDefinition(
  key: string,
  config: AgentEvalScorerConfig,
): Promise<LocalScorerDefinition<AgentEvalContext, Record<string, unknown>> | null> {
  const scorerRef = config.scorer;
  let baseDefinition: LocalScorerDefinition<any, Record<string, unknown>> | null = null;

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

  const adaptedDefinition = adaptScorerDefinitionForAgent(baseDefinition, config);
  return applyEvalConfigOverrides(adaptedDefinition, key, config);
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

function adaptScorerDefinitionForAgent(
  definition: LocalScorerDefinition<any, Record<string, unknown>>,
  config: AgentEvalScorerConfig,
): LocalScorerDefinition<AgentEvalContext, Record<string, unknown>> {
  const { buildPayload, buildParams } = config;

  const baseParams = definition.params;

  const computeMergedParams =
    buildParams || baseParams
      ? async (agentContext: AgentEvalContext, normalizedPayload: Record<string, unknown>) => {
          const merged: Record<string, unknown> = {};

          if (typeof baseParams === "function") {
            const baseResult = await baseParams(normalizedPayload);
            if (isPlainRecord(baseResult)) {
              Object.assign(merged, baseResult);
            }
          } else if (isPlainRecord(baseParams)) {
            Object.assign(merged, baseParams);
          }

          if (buildParams) {
            const override = await buildParams(agentContext);
            if (isPlainRecord(override)) {
              Object.assign(merged, override);
            }
          }

          return merged;
        }
      : undefined;

  const adaptedParams =
    computeMergedParams !== undefined
      ? async (agentContext: AgentEvalContext) => {
          const rawPayload = buildPayload ? await buildPayload(agentContext) : undefined;
          const normalizedPayload = normalizeScorerPayload(agentContext, rawPayload);
          return computeMergedParams(agentContext, normalizedPayload);
        }
      : undefined;

  const adaptedScorer: LocalScorerDefinition<AgentEvalContext, Record<string, unknown>>["scorer"] =
    async ({ payload, params }) => {
      const agentPayload = payload;
      const rawPayload = buildPayload ? await buildPayload(agentPayload) : undefined;
      const payloadForBase = normalizeScorerPayload(agentPayload, rawPayload);

      let resolvedParams = params;
      if ((!resolvedParams || Object.keys(resolvedParams).length === 0) && computeMergedParams) {
        resolvedParams = await computeMergedParams(agentPayload, payloadForBase);
      }

      return definition.scorer({
        payload: payloadForBase,
        params: (resolvedParams ?? {}) as Record<string, unknown>,
      });
    };

  return {
    ...definition,
    scorer: adaptedScorer,
    params: adaptedParams,
  } as LocalScorerDefinition<AgentEvalContext, Record<string, unknown>>;
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
): value is LocalScorerDefinition<any, Record<string, unknown>> {
  return (
    Boolean(value) && typeof value === "object" && "scorer" in (value as Record<string, unknown>)
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeScorerPayload(
  agentContext: AgentEvalContext,
  basePayload?: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ...agentContext,
    ...(basePayload ?? {}),
  };

  payload.input = ensureScorerText(
    basePayload?.input ?? agentContext.input ?? agentContext.rawInput ?? null,
  );
  payload.output = ensureScorerText(
    basePayload?.output ?? agentContext.output ?? agentContext.rawOutput ?? null,
  );

  return payload;
}

function ensureScorerText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    try {
      return safeStringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
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
