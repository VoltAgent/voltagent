import {
  type Attributes,
  type Span,
  type SpanContext,
  SpanKind,
  SpanStatusCode,
  context as otelContext,
  trace,
} from "@opentelemetry/api";
import { safeStringify } from "@voltagent/internal/utils";
import {
  type LocalScorerDefinition,
  type ScorerLifecycleScope,
  runLocalScorers,
} from "../../eval/runtime";
import type { VoltAgentObservability } from "../../observability";
import { randomUUID } from "../../utils/id";
import type {
  WorkflowEvalConfig,
  WorkflowEvalContext,
  WorkflowEvalHost,
  WorkflowEvalPayload,
  WorkflowEvalResult,
  WorkflowEvalScorerConfig,
  WorkflowEvalScorerReference,
  WorkflowEvalStepConfig,
  WorkflowEvalStepInfo,
} from "./types";

const scheduleAsync =
  typeof setImmediate === "function"
    ? (fn: () => void) => {
        setImmediate(fn);
      }
    : (fn: () => void) => {
        setTimeout(fn, 0);
      };

type WorkflowScorerDescriptor = {
  key: string;
  config: WorkflowEvalScorerConfig;
  definition: LocalScorerDefinition<WorkflowEvalContext, Record<string, unknown>>;
};

interface ScoreMetrics {
  combinedMetadata: Record<string, unknown> | null;
  scoreValue: number | null;
  thresholdValue?: number;
  thresholdPassed: boolean | null;
  datasetMetadata?: ReturnType<typeof extractDatasetMetadataFromCombinedMetadata>;
}

async function resolveScorerDescriptors(
  config: WorkflowEvalStepConfig,
  host: WorkflowEvalHost,
  scope: string,
): Promise<WorkflowScorerDescriptor[]> {
  const scorerEntries = Object.entries(config.scorers ?? {});
  if (scorerEntries.length === 0) {
    return [];
  }

  const descriptors: WorkflowScorerDescriptor[] = [];
  for (const [key, scorerConfig] of scorerEntries) {
    try {
      const definition = await resolveEvalScorersDefinition(key, scorerConfig);
      if (!definition) {
        host.logger.warn(`[Workflow:${host.name}][${scope}] Unknown eval scorer for key ${key}`);
        continue;
      }
      descriptors.push({ key, config: scorerConfig, definition });
    } catch (error) {
      host.logger.warn(
        `[Workflow:${host.name}][${scope}] Failed to resolve eval scorer for key ${key}`,
        {
          error: error instanceof Error ? error.message : error,
        },
      );
    }
  }

  return descriptors;
}

function buildScoreMetrics(
  storagePayload: WorkflowEvalPayload,
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
  host: WorkflowEvalHost,
  descriptor: WorkflowScorerDescriptor,
  config: WorkflowEvalStepConfig,
  storagePayload: WorkflowEvalPayload,
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
    "entity.type": "workflow",
    "eval.scorer.id": definition.id,
    "eval.scorer.key": descriptor.key,
    "eval.scorer.name": scorerLabel,
    "eval.scorer.kind": "live",
    "eval.scorer.status": result.status,
    "eval.operation.id": storagePayload.executionId,
    "eval.operation.type": storagePayload.operationType,
    "eval.operation.status": storagePayload.status,
    "eval.target": storagePayload.target,
    "eval.trace.id": storagePayload.traceId,
    "eval.source.span_id": storagePayload.spanId,
    "eval.trigger_source": config.triggerSource ?? "live",
    "eval.environment": config.environment,
    "workflow.execution.id": storagePayload.executionId,
    "workflow.id": storagePayload.workflowId,
    "workflow.name": storagePayload.workflowName,
    "workflow.status": storagePayload.status,
  };

  if (storagePayload.step) {
    attributes["workflow.step.id"] = storagePayload.step.id;
    if (storagePayload.step.name) {
      attributes["workflow.step.name"] = storagePayload.step.name;
    }
    if (typeof storagePayload.step.index === "number") {
      attributes["workflow.step.index"] = storagePayload.step.index;
    }
    if (storagePayload.step.type) {
      attributes["workflow.step.type"] = storagePayload.step.type;
    }
  }

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
  host: WorkflowEvalHost,
  descriptor: WorkflowScorerDescriptor,
  config: WorkflowEvalStepConfig,
  storagePayload: WorkflowEvalPayload,
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

export interface EnqueueWorkflowEvalScoringArgs {
  span: Span;
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: WorkflowEvalPayload["status"];
  input?: unknown;
  output?: unknown;
  rawInput?: unknown;
  rawOutput?: unknown;
  userId?: string;
  conversationId?: string;
  operation: WorkflowEvalPayload["operationType"];
  metadata?: Record<string, unknown>;
  target?: WorkflowEvalPayload["target"];
  step?: WorkflowEvalStepInfo;
}

export function enqueueWorkflowEvalScoring(
  host: WorkflowEvalHost,
  args: EnqueueWorkflowEvalScoringArgs,
): void {
  scheduleEvalScoring(
    host,
    host.evalConfig,
    { ...args, target: args.target ?? "workflow" },
    "workflow",
  );
}

export function enqueueWorkflowStepEvalScoring(
  host: WorkflowEvalHost,
  args: EnqueueWorkflowEvalScoringArgs & { step: WorkflowEvalStepInfo },
  overrideConfig?: WorkflowEvalStepConfig | null,
): void {
  const stepId = args.step.id;
  const config =
    overrideConfig ?? host.evalConfig?.steps?.[stepId] ?? host.evalConfig?.steps?.["*"];
  if (!config) {
    return;
  }

  scheduleEvalScoring(host, config, { ...args, target: "step" }, `step:${stepId}`);
}

function scheduleEvalScoring(
  host: WorkflowEvalHost,
  config: WorkflowEvalStepConfig | undefined,
  args: EnqueueWorkflowEvalScoringArgs,
  scope: string,
): void {
  if (!config || !config.scorers || Object.keys(config.scorers).length === 0) {
    return;
  }

  const span = args.span;
  const spanContext = span.spanContext();

  const normalizedArgs: EnqueueWorkflowEvalScoringArgs = {
    ...args,
    target: args.target ?? (args.step ? "step" : "workflow"),
  };

  const rawPayload = buildEvalPayload(normalizedArgs, spanContext);
  if (!rawPayload) {
    return;
  }

  const storagePayload =
    config.redact?.(cloneEvalPayload(rawPayload)) ?? cloneEvalPayload(rawPayload);

  if (spanContext.traceId && spanContext.spanId) {
    const scorerKeys = Object.keys(config.scorers ?? {});
    if (scorerKeys.length > 0) {
      span.setAttribute("eval.scorers.count", scorerKeys.length);
      span.setAttribute("eval.scorers.trigger_source", config.triggerSource ?? "live");
      span.setAttribute("eval.operation.type", rawPayload.operationType);
      span.setAttribute("eval.operation.id", rawPayload.executionId);
      span.setAttribute("eval.operation.status", rawPayload.status);
      span.setAttribute("eval.target", rawPayload.target);
      if (rawPayload.step) {
        span.setAttribute("workflow.step.id", rawPayload.step.id);
        if (rawPayload.step.name) {
          span.setAttribute("workflow.step.name", rawPayload.step.name);
        }
        if (typeof rawPayload.step.index === "number") {
          span.setAttribute("workflow.step.index", rawPayload.step.index);
        }
        if (rawPayload.step.type) {
          span.setAttribute("workflow.step.type", rawPayload.step.type);
        }
      }
      if (config.environment) {
        span.setAttribute("eval.environment", config.environment);
      }
      if (config.sampling?.type === "ratio" && config.sampling.rate !== undefined) {
        const boundedRate = Math.max(0, Math.min(1, config.sampling.rate));
        span.setAttribute("eval.sampling.rate", boundedRate);
        span.setAttribute("eval.sampling.percentage", boundedRate * 100);
      }
      span.addEvent("eval.scorers.scheduled", {
        count: scorerKeys.length,
        operation: rawPayload.operationType,
        trigger: config.triggerSource ?? "live",
        target: rawPayload.target,
        scope,
      });
    }
  }

  const context: WorkflowEvalContext = {
    ...rawPayload,
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
      rootSpanContext: spanContext,
      scope,
    }).catch((error) => {
      host.logger.warn(`[Workflow:${host.name}][${scope}] eval scoring failed`, {
        error: error instanceof Error ? error.message : error,
      });
    });
  });
}

interface RunEvalScorersArgs {
  config: WorkflowEvalStepConfig;
  context: WorkflowEvalContext;
  rawPayload: WorkflowEvalPayload;
  storagePayload: WorkflowEvalPayload;
  observability: VoltAgentObservability;
  rootSpanContext: SpanContext;
  scope: string;
}

async function runEvalScorers(host: WorkflowEvalHost, args: RunEvalScorersArgs): Promise<void> {
  const { config, context, rawPayload, storagePayload, observability, rootSpanContext, scope } =
    args;
  const descriptors = await resolveScorerDescriptors(config, host, scope);
  if (descriptors.length === 0) {
    return;
  }

  const descriptorById = new Map<string, WorkflowScorerDescriptor>();
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
      const base: Record<string, unknown> = {};
      if (payload.input !== undefined) {
        base.input = payload.input ?? "";
      }
      if (payload.output !== undefined) {
        base.output = payload.output ?? "";
      }
      base.status = payload.status;
      base.target = payload.target;
      if (payload.step) {
        base.step = payload.step;
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
                  "eval.operation.id": storagePayload.executionId,
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
        "entity.type": "workflow",
        "entity.name": host.name,
        "eval.scorer.id": definition.id,
        "eval.scorer.key": descriptor.key,
        "eval.scorer.name": definition.name ?? definition.id,
        "eval.scorer.kind": "live",
        "eval.scorer.status": "running",
        "eval.operation.id": storagePayload.executionId,
        "eval.operation.type": storagePayload.operationType,
        "eval.operation.status": storagePayload.status,
        "eval.target": storagePayload.target,
        "eval.scope": scope,
        "eval.trace.id": storagePayload.traceId,
        "eval.source.span_id": storagePayload.spanId,
        "eval.trigger_source": config.triggerSource ?? "live",
        "eval.environment": config.environment,
      });

      if (storagePayload.step) {
        span.setAttribute("workflow.step.id", storagePayload.step.id);
        if (storagePayload.step.name) {
          span.setAttribute("workflow.step.name", storagePayload.step.name);
        }
        if (typeof storagePayload.step.index === "number") {
          span.setAttribute("workflow.step.index", storagePayload.step.index);
        }
        if (storagePayload.step.type) {
          span.setAttribute("workflow.step.type", storagePayload.step.type);
        }
      }

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
        `[Workflow:${host.name}][${scope}] Received eval scorer result for unknown id ${result.id}`,
      );
      continue;
    }

    const metrics = buildScoreMetrics(storagePayload, result);

    await invokeEvalResultCallback(
      host,
      descriptor.config,
      {
        scorerId: descriptor.definition.id,
        scorerName: descriptor.definition.name,
        status: result.status,
        score: result.score ?? null,
        metadata: metrics.combinedMetadata ?? undefined,
        error: result.error,
        durationMs: result.durationMs,
        payload: storagePayload,
        rawPayload,
      },
      scope,
    );

    if (result.status === "error") {
      host.logger.warn(
        `[Workflow:${host.name}][${scope}] Eval scorer '${descriptor.definition.name}' failed`,
        {
          error: result.error instanceof Error ? result.error.message : result.error,
          scorerId: descriptor.definition.id,
        },
      );
    }
  }
}

async function resolveEvalScorersDefinition(
  key: string,
  config: WorkflowEvalScorerConfig,
): Promise<LocalScorerDefinition<WorkflowEvalContext, Record<string, unknown>> | null> {
  const scorerRef = config.scorer;
  let baseDefinition: LocalScorerDefinition<any, Record<string, unknown>> | null = null;

  if (isLocalScorerDefinition(scorerRef)) {
    baseDefinition = scorerRef;
  } else if (typeof scorerRef === "function") {
    const resolved = await scorerRef();
    if (!isLocalScorerDefinition(resolved)) {
      throw new Error(
        `Workflow eval scorer factory for key '${key}' did not return a LocalScorerDefinition.`,
      );
    }
    baseDefinition = resolved;
  }

  if (!baseDefinition) {
    return null;
  }

  const adaptedDefinition = adaptScorerDefinitionForWorkflow(baseDefinition, config);
  return applyEvalConfigOverrides(adaptedDefinition, key, config);
}

function applyEvalConfigOverrides(
  baseDefinition: LocalScorerDefinition<WorkflowEvalContext, Record<string, unknown>>,
  key: string,
  config: WorkflowEvalScorerConfig,
): LocalScorerDefinition<WorkflowEvalContext, Record<string, unknown>> {
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

function adaptScorerDefinitionForWorkflow(
  definition: LocalScorerDefinition<any, Record<string, unknown>>,
  config: WorkflowEvalScorerConfig,
): LocalScorerDefinition<WorkflowEvalContext, Record<string, unknown>> {
  const { buildPayload, buildParams } = config;

  const baseParams = definition.params;

  const computeMergedParams =
    buildParams || baseParams
      ? async (
          workflowContext: WorkflowEvalContext,
          normalizedPayload: Record<string, unknown>,
        ) => {
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
            const override = await buildParams(workflowContext);
            if (isPlainRecord(override)) {
              Object.assign(merged, override);
            }
          }

          return merged;
        }
      : undefined;

  const adaptedParams =
    computeMergedParams !== undefined
      ? async (workflowContext: WorkflowEvalContext) => {
          const rawPayload = buildPayload ? await buildPayload(workflowContext) : undefined;
          const normalizedPayload = normalizeScorerPayload(workflowContext, rawPayload);
          return computeMergedParams(workflowContext, normalizedPayload);
        }
      : undefined;

  const adaptedScorer: LocalScorerDefinition<
    WorkflowEvalContext,
    Record<string, unknown>
  >["scorer"] = async ({ payload, params }) => {
    const workflowPayload = payload;
    const rawPayload = buildPayload ? await buildPayload(workflowPayload) : undefined;
    const payloadForBase = normalizeScorerPayload(workflowPayload, rawPayload);

    let resolvedParams = params;
    if ((!resolvedParams || Object.keys(resolvedParams).length === 0) && computeMergedParams) {
      resolvedParams = await computeMergedParams(workflowPayload, payloadForBase);
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
  } as LocalScorerDefinition<WorkflowEvalContext, Record<string, unknown>>;
}

function mergeParamsSources(
  baseParams: LocalScorerDefinition<WorkflowEvalContext, Record<string, unknown>>["params"],
  override: WorkflowEvalScorerConfig["params"],
): LocalScorerDefinition<WorkflowEvalContext, Record<string, unknown>>["params"] | undefined {
  if (!override) {
    return baseParams;
  }

  if (!baseParams) {
    return typeof override === "function" ? override : { ...override };
  }

  return async (payload: WorkflowEvalContext) => {
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
    | LocalScorerDefinition<WorkflowEvalContext, Record<string, unknown>>["params"]
    | WorkflowEvalScorerConfig["params"],
  payload: WorkflowEvalContext,
): Promise<Record<string, unknown>> {
  if (!source) {
    return {};
  }

  if (typeof source === "function") {
    const result = await source(payload);
    return isPlainRecord(result) ? result : {};
  }

  if (isPlainRecord(source)) {
    return source;
  }

  return {};
}

function isLocalScorerDefinition(
  value: WorkflowEvalScorerReference,
): value is LocalScorerDefinition<WorkflowEvalContext, Record<string, unknown>> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LocalScorerDefinition<any, any>).scorer === "function"
  );
}

function normalizeScorerPayload(
  workflowContext: WorkflowEvalContext,
  rawPayload?: Record<string, unknown>,
): Record<string, unknown> {
  if (isPlainRecord(rawPayload)) {
    return rawPayload;
  }

  const payload: Record<string, unknown> = {
    target: workflowContext.target,
    workflowId: workflowContext.workflowId,
    workflowName: workflowContext.workflowName,
    executionId: workflowContext.executionId,
    operationType: workflowContext.operationType,
    status: workflowContext.status,
    input: ensureScorerText(workflowContext.input),
    output: ensureScorerText(workflowContext.output),
    metadata: isPlainRecord(workflowContext.metadata) ? workflowContext.metadata : undefined,
  };

  if (workflowContext.userId) {
    payload.userId = workflowContext.userId;
  }
  if (workflowContext.conversationId) {
    payload.conversationId = workflowContext.conversationId;
  }
  if (workflowContext.step) {
    const stepPayload: Record<string, unknown> = {
      id: workflowContext.step.id,
    };
    if (workflowContext.step.name) {
      stepPayload.name = workflowContext.step.name;
    }
    if (typeof workflowContext.step.index === "number") {
      stepPayload.index = workflowContext.step.index;
    }
    if (workflowContext.step.type) {
      stepPayload.type = workflowContext.step.type;
    }
    if (workflowContext.step.metadata && Object.keys(workflowContext.step.metadata).length > 0) {
      stepPayload.metadata = workflowContext.step.metadata;
    }
    payload.step = stepPayload;
  }

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
  args: EnqueueWorkflowEvalScoringArgs,
  spanContext: SpanContext,
): WorkflowEvalPayload | undefined {
  if (!spanContext.traceId || !spanContext.spanId) {
    return undefined;
  }

  const target = args.target ?? (args.step ? "step" : "workflow");
  const stepInfo = args.step
    ? {
        id: args.step.id,
        name: args.step.name,
        index: args.step.index,
        type: args.step.type,
        metadata: args.step.metadata,
      }
    : undefined;

  return {
    target,
    executionId: args.executionId,
    workflowId: args.workflowId,
    workflowName: args.workflowName,
    operationType: args.operation,
    status: args.status,
    input: normalizeEvalString(args.input),
    output: normalizeEvalString(args.output),
    rawInput: args.rawInput,
    rawOutput: args.rawOutput,
    userId: args.userId,
    conversationId: args.conversationId,
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    metadata: args.metadata,
    step: stepInfo,
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

function cloneEvalPayload(payload: WorkflowEvalPayload): WorkflowEvalPayload {
  return JSON.parse(safeStringify(payload)) as WorkflowEvalPayload;
}

function combineEvalMetadata(
  payload: WorkflowEvalPayload,
  scorerMetadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  const combined: Record<string, unknown> = {
    target: payload.target,
    workflow: {
      id: payload.workflowId,
      name: payload.workflowName,
      executionId: payload.executionId,
      status: payload.status,
    },
  };

  if (payload.step) {
    const stepRecord: Record<string, unknown> = {
      id: payload.step.id,
    };
    if (payload.step.name) {
      stepRecord.name = payload.step.name;
    }
    if (typeof payload.step.index === "number") {
      stepRecord.index = payload.step.index;
    }
    if (payload.step.type) {
      stepRecord.type = payload.step.type;
    }
    if (payload.step.metadata && Object.keys(payload.step.metadata).length > 0) {
      stepRecord.metadata = payload.step.metadata;
    }
    combined.step = stepRecord;
  }

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

function collectVoltAgentMetadataFromSources(
  ...sources: Array<Record<string, unknown> | undefined>
): Record<string, unknown> | undefined {
  const voltAgentRecords: Record<string, unknown>[] = [];

  for (const source of sources) {
    if (!isPlainRecord(source)) {
      continue;
    }

    if (hasVoltAgentMetadataShape(source)) {
      voltAgentRecords.push(source);
      continue;
    }

    const nestedVoltAgent = extractVoltAgentMetadataFromNested(source);
    if (nestedVoltAgent && Object.keys(nestedVoltAgent).length > 0) {
      voltAgentRecords.push(nestedVoltAgent);
    }
  }

  if (voltAgentRecords.length === 0) {
    return undefined;
  }

  return voltAgentRecords.reduce<Record<string, unknown>>((acc, record) => {
    Object.assign(acc, record);
    return acc;
  }, {});
}

function hasVoltAgentMetadataShape(source: Record<string, unknown>): boolean {
  return (
    typeof source.threshold === "number" ||
    typeof source.thresholdPassed === "boolean" ||
    typeof source.useCase === "string" ||
    typeof source.dataset === "object"
  );
}

function extractVoltAgentMetadataFromNested(
  source: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const voltAgent = source.voltAgent;
  if (!isPlainRecord(voltAgent)) {
    return undefined;
  }

  const metadata: Record<string, unknown> = {};
  for (const key of Object.keys(voltAgent)) {
    metadata[key] = (voltAgent as Record<string, unknown>)[key];
  }
  return metadata;
}

function collectDatasetMetadataFromSources(
  ...sources: Array<Record<string, unknown> | undefined>
): Record<string, unknown> | undefined {
  const datasetRecords: Record<string, unknown>[] = [];
  const seen = new Set<Record<string, unknown>>();

  for (const source of sources) {
    if (!isPlainRecord(source)) {
      continue;
    }
    gatherDatasetRecords(source, datasetRecords, seen);
  }

  if (datasetRecords.length === 0) {
    return undefined;
  }

  return datasetRecords.reduce<Record<string, unknown>>((acc, record) => {
    Object.assign(acc, record);
    return acc;
  }, {});
}

function gatherDatasetRecords(
  current: Record<string, unknown>,
  out: Record<string, unknown>[],
  seen: Set<Record<string, unknown>>,
  deep = false,
): void {
  if (seen.has(current)) {
    return;
  }
  seen.add(current);

  if (hasDatasetShape(current)) {
    out.push(current);
  }

  if (!deep) {
    const dataset = current.dataset;
    if (isPlainRecord(dataset)) {
      gatherDatasetRecords(dataset, out, seen, true);
    }
    const voltAgent = current.voltAgent;
    if (isPlainRecord(voltAgent)) {
      gatherDatasetRecords(voltAgent, out, seen, true);
    }
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
    datasetId: datasetMetadata.datasetId as string | undefined,
    datasetVersionId: datasetMetadata.datasetVersionId as string | undefined,
    datasetItemHash: datasetMetadata.datasetItemHash as string | undefined,
    datasetItemId: datasetMetadata.datasetItemId as string | undefined,
  };
}

function collectLiveEvalMetadata(
  ...sources: Array<Record<string, unknown> | undefined>
): Record<string, unknown> | undefined {
  const records: Record<string, unknown>[] = [];
  for (const source of sources) {
    if (!isPlainRecord(source)) {
      continue;
    }
    const liveEval = source.liveEval;
    if (isPlainRecord(liveEval)) {
      records.push(liveEval);
    }
  }

  if (records.length === 0) {
    return undefined;
  }

  return records.reduce<Record<string, unknown>>((acc, record) => {
    Object.assign(acc, record);
    return acc;
  }, {});
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
  host: WorkflowEvalHost,
  config: WorkflowEvalScorerConfig,
  result: WorkflowEvalResult,
  scope: string,
): Promise<void> {
  if (!config.onResult) {
    return;
  }

  try {
    await config.onResult(result);
  } catch (error) {
    host.logger.warn(
      `[Workflow:${host.name}][${scope}] Eval scorer callback threw for scorer '${result.scorerId}'`,
      { error: error instanceof Error ? error.message : error },
    );
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype
  );
}
