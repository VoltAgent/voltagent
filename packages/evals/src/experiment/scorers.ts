import type { LocalScorerDefinition } from "@voltagent/scorers";

import type {
  ExperimentDatasetItem,
  ExperimentRuntimePayload,
  ExperimentScorerConfig,
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
      const fallbackName = entry.name ?? entry.id ?? `scorer-${index + 1}`;
      return createBundleFromDefinition(entry, fallbackName);
    }

    if (isScorerConfigObject(entry)) {
      const scorer = entry.scorer;
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

function isLocalDefinition<Item extends ExperimentDatasetItem>(
  value: unknown,
): value is LocalScorerDefinition<ExperimentRuntimePayload<Item>, any> {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as LocalScorerDefinition<ExperimentRuntimePayload<Item>, any>;
  return (
    typeof candidate.scorer === "function" &&
    ("id" in candidate || "metadata" in candidate || "sampling" in candidate)
  );
}

function isScorerConfigObject<Item extends ExperimentDatasetItem>(
  value: ExperimentScorerConfig<Item>,
): value is {
  scorer: LocalScorerDefinition<ExperimentRuntimePayload<Item>, any>;
  name?: string;
  threshold?: number;
  metadata?: Record<string, unknown>;
} {
  return (
    Boolean(value) && typeof value === "object" && "scorer" in (value as Record<string, unknown>)
  );
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
