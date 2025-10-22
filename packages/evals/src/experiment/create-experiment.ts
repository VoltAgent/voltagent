import {
  EXPERIMENT_DEFINITION_KIND,
  type ExperimentConfig,
  type ExperimentDatasetDescriptor,
  type ExperimentDatasetInfo,
  type ExperimentDatasetItem,
  type ExperimentDefinition,
  type ExperimentPassCriteria,
  type ExperimentPassCriteriaInput,
} from "./types.js";

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

type InferDatasetItem<Config extends ExperimentConfig<any, any, any>> =
  Config["dataset"] extends ExperimentDatasetDescriptor<infer Item> ? Item : ExperimentDatasetItem;

type InferRunnerOutput<Config extends ExperimentConfig<any, any, any>> =
  Config extends ExperimentConfig<any, infer Output, any> ? Output : unknown;

type InferVoltOpsClient<Config extends ExperimentConfig<any, any, any>> =
  Config extends ExperimentConfig<any, any, infer Client> ? Client : unknown;

function normalizeTags(tags: readonly string[] | undefined): readonly string[] | undefined {
  if (!tags) {
    return undefined;
  }

  const normalized = tags.map((tag) => String(tag).trim()).filter((tag) => tag.length > 0);

  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const tag of normalized) {
    if (!seen.has(tag)) {
      seen.add(tag);
      deduped.push(tag);
    }
  }

  return Object.freeze(deduped);
}

function cloneMetadata(metadata: ExperimentDatasetInfo["metadata"]) {
  if (!metadata || typeof metadata !== "object") {
    return metadata ?? null;
  }
  return { ...(metadata as Record<string, unknown>) };
}

function cloneDatasetDescriptor<Descriptor extends ExperimentDatasetDescriptor>(
  descriptor: Descriptor | undefined,
): Descriptor | undefined {
  if (!descriptor) {
    return undefined;
  }

  const copy: Mutable<Descriptor> = {
    ...descriptor,
  };

  if ("metadata" in copy) {
    copy.metadata = cloneMetadata(copy.metadata);
  }

  return copy;
}

function cloneCriteria(criteria: ExperimentPassCriteria): ExperimentPassCriteria {
  return { ...criteria };
}

function clonePassCriteria(
  criteria: ExperimentPassCriteriaInput | undefined,
): ExperimentPassCriteriaInput | undefined {
  if (!criteria) {
    return undefined;
  }

  if (Array.isArray(criteria)) {
    return criteria.map((entry) => cloneCriteria(entry as ExperimentPassCriteria));
  }

  return cloneCriteria(criteria as ExperimentPassCriteria);
}

function cloneVoltOpsOptions<TClient>(
  options: ExperimentConfig<any, any, TClient>["voltOps"],
): ExperimentConfig<any, any, TClient>["voltOps"] {
  if (!options) {
    return undefined;
  }

  const copy: Mutable<NonNullable<typeof options>> = {
    ...options,
  };

  copy.tags = normalizeTags(copy.tags);

  return copy;
}

export function createExperiment<Config extends ExperimentConfig<any, any, any>>(
  config: Config,
): ExperimentDefinition<
  InferDatasetItem<Config>,
  InferRunnerOutput<Config>,
  InferVoltOpsClient<Config>
> {
  if (!config || typeof config !== "object") {
    throw new TypeError("createExperiment requires a configuration object.");
  }

  if (!config.id || typeof config.id !== "string") {
    throw new TypeError("Experiment configuration must include a non-empty `id` string.");
  }

  if (typeof config.runner !== "function") {
    throw new TypeError("Experiment configuration must include a `runner` function.");
  }

  const dataset = cloneDatasetDescriptor(config.dataset);
  const tags = normalizeTags(config.tags);
  const scorers = config.scorers ? Object.freeze(Array.from(config.scorers)) : Object.freeze([]);
  const passCriteria = clonePassCriteria(config.passCriteria);
  const voltOps = cloneVoltOpsOptions(config.voltOps);
  const experimentBinding = config.experiment
    ? {
        ...config.experiment,
        autoCreate: config.experiment.autoCreate ?? true,
      }
    : undefined;
  const metadata = config.metadata ?? null;

  const definition: ExperimentDefinition<
    InferDatasetItem<Config>,
    InferRunnerOutput<Config>,
    InferVoltOpsClient<Config>
  > = {
    kind: EXPERIMENT_DEFINITION_KIND,
    config: Object.freeze({
      ...config,
      dataset,
      tags,
      scorers,
      passCriteria,
      voltOps,
      experiment: experimentBinding,
      metadata,
    }),
  };

  return definition;
}
