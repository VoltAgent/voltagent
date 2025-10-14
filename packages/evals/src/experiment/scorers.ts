import type { LocalScorerDefinition } from "@voltagent/scorers";

import type {
  ExperimentDatasetItem,
  ExperimentRuntimePayload,
  ExperimentScorerConfig,
  ExperimentScorerConfigEntry,
} from "./types.js";

interface VoltAgentMetadata {
  scorer?: string;
  threshold?: number;
  thresholdPassed?: boolean;
  [key: string]: unknown;
}

export interface ExperimentRuntimeScorerBundle<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
> {
  id: string;
  name: string;
  definition: LocalScorerDefinition<ExperimentRuntimePayload<Item>, any>;
  threshold?: number;
}

export function resolveExperimentScorers<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
>(
  configs: ReadonlyArray<ExperimentScorerConfig<Item>> | undefined,
): ExperimentRuntimeScorerBundle<Item>[] {
  if (!configs || configs.length === 0) {
    return [];
  }

  return configs.map((entry, index) => {
    if (isLocalDefinition(entry)) {
      const adapted = adaptScorerDefinitionForExperiment<Item, any, any>(entry, {});
      const fallbackName = adapted.name ?? adapted.id ?? `scorer-${index + 1}`;
      return createBundleFromDefinition(adapted, fallbackName);
    }

    if (isScorerConfigObject(entry)) {
      const scorer = adaptScorerDefinitionForExperiment<Item, any, any>(entry.scorer, {
        buildPayload: entry.buildPayload,
        buildParams: entry.buildParams,
        params: entry.params,
      });
      const threshold = normalizeThreshold(entry.threshold);
      const metadata = entry.metadata;

      const fallbackName = entry.name ?? scorer.name ?? scorer.id ?? `scorer-${index + 1}`;
      return createBundleFromDefinition(scorer, fallbackName, threshold, metadata);
    }

    throw new Error("Invalid experiment scorer configuration entry.");
  });
}

function createBundleFromDefinition<Item extends ExperimentDatasetItem>(
  definition: LocalScorerDefinition<ExperimentRuntimePayload<Item>, any>,
  fallbackName: string,
  threshold?: number,
  metadata?: Record<string, unknown>,
): ExperimentRuntimeScorerBundle<Item> {
  const id = definition.id ?? fallbackName;
  const name = definition.name ?? id;
  const mergedMetadata = mergeMetadata(
    definition.metadata,
    buildVoltAgentMetadata(name, threshold, metadata),
  );

  return {
    id,
    name,
    threshold,
    definition: {
      ...definition,
      id,
      name,
      metadata: mergedMetadata,
    },
  };
}

function isLocalDefinition<_Item extends ExperimentDatasetItem>(
  value: unknown,
): value is LocalScorerDefinition<any, any> {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as LocalScorerDefinition<any, any>;
  return (
    typeof candidate.scorer === "function" &&
    ("id" in candidate || "metadata" in candidate || "sampling" in candidate)
  );
}

function isScorerConfigObject<Item extends ExperimentDatasetItem>(
  value: ExperimentScorerConfig<Item>,
): value is ExperimentScorerConfigEntry<Item, any, any> {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "scorer" in (value as { scorer?: unknown });
}

type ExperimentScorerAdaptOptions<
  Item extends ExperimentDatasetItem,
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = {
  buildPayload?: (context: ExperimentRuntimePayload<Item>) => Payload | Promise<Payload>;
  buildParams?: (
    context: ExperimentRuntimePayload<Item>,
  ) => Params | undefined | Promise<Params | undefined>;
  params?:
    | Params
    | ((
        context: ExperimentRuntimePayload<Item>,
      ) => Params | undefined | Promise<Params | undefined>);
};

function adaptScorerDefinitionForExperiment<
  Item extends ExperimentDatasetItem,
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(
  definition: LocalScorerDefinition<Payload, Params>,
  options: ExperimentScorerAdaptOptions<Item, Payload, Params>,
): LocalScorerDefinition<ExperimentRuntimePayload<Item>, Params> {
  const { buildPayload, buildParams, params } = options;
  const baseParams = definition.params;

  async function resolvePayload(runtime: ExperimentRuntimePayload<Item>): Promise<Payload> {
    const payloadOverrides = buildPayload ? await buildPayload(runtime) : undefined;
    return normalizeExperimentScorerPayload(runtime, payloadOverrides) as Payload;
  }

  async function resolveConfigParams(
    runtime: ExperimentRuntimePayload<Item>,
  ): Promise<Record<string, unknown>> {
    const merged: Record<string, unknown> = {};

    if (params !== undefined) {
      const value = typeof params === "function" ? await params(runtime) : params;
      if (isPlainRecord(value)) {
        Object.assign(merged, value);
      }
    }

    if (buildParams) {
      const value = await buildParams(runtime);
      if (isPlainRecord(value)) {
        Object.assign(merged, value);
      }
    }

    return merged;
  }

  const adaptedParams: LocalScorerDefinition<ExperimentRuntimePayload<Item>, Params>["params"] =
    undefined;

  const adaptedScorer: LocalScorerDefinition<ExperimentRuntimePayload<Item>, Params>["scorer"] =
    async ({ payload, params: runtimeParams }) => {
      const runtime = payload as ExperimentRuntimePayload<Item>;
      const resolvedPayload = await resolvePayload(runtime);

      const resolvedParams: Record<string, unknown> = isPlainRecord(runtimeParams)
        ? { ...runtimeParams }
        : {};

      if (typeof baseParams === "function") {
        const base = await baseParams(resolvedPayload);
        if (isPlainRecord(base)) {
          Object.assign(resolvedParams, base);
        }
      } else if (isPlainRecord(baseParams)) {
        Object.assign(resolvedParams, baseParams);
      }

      const configParams = await resolveConfigParams(runtime);
      if (Object.keys(configParams).length > 0) {
        Object.assign(resolvedParams, configParams);
      }

      return definition.scorer({
        payload: resolvedPayload,
        params: (resolvedParams as Params) ?? ({} as Params),
      });
    };

  return {
    ...definition,
    params: adaptedParams,
    scorer: adaptedScorer,
  };
}

function normalizeExperimentScorerPayload<
  Item extends ExperimentDatasetItem,
  Payload extends Record<string, unknown> | undefined,
>(runtime: ExperimentRuntimePayload<Item>, basePayload: Payload): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ...runtime,
    ...(basePayload ?? {}),
  };

  if (!("input" in payload)) {
    payload.input = runtime.input;
  }

  if (!("output" in payload)) {
    payload.output = runtime.output;
  }

  if (!("expected" in payload) && runtime.expected !== undefined) {
    payload.expected = runtime.expected;
  }

  payload.item = runtime.item;
  payload.datasetId = runtime.datasetId;
  payload.datasetVersionId = runtime.datasetVersionId;
  payload.datasetName = runtime.datasetName;

  return payload;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeMetadata(
  existing: Record<string, unknown> | null | undefined,
  extra: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!existing) {
    return Object.keys(extra).length > 0 ? extra : null;
  }
  const merged = { ...existing };
  for (const [key, value] of Object.entries(extra)) {
    merged[key] = value;
  }
  return merged;
}

function buildVoltAgentMetadata(
  name: string,
  threshold?: number,
  metadata?: Record<string, unknown>,
): Record<string, unknown> {
  const voltAgent: VoltAgentMetadata = {
    scorer: name,
  };

  if (threshold !== undefined && threshold !== null) {
    voltAgent.threshold = threshold;
  }

  if (metadata && typeof metadata === "object") {
    Object.assign(voltAgent, metadata);
  }

  return {
    voltAgent,
  };
}

function normalizeThreshold(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  return numeric;
}
