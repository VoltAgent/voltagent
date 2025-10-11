import type {
  ExperimentDatasetDescriptor,
  ExperimentDatasetInfo,
  ExperimentDatasetItem,
  ExperimentDatasetResolvedStream,
  ExperimentDatasetResolver,
} from "./types.js";

type AnyDatasetItem = ExperimentDatasetItem<
  Record<string, unknown>,
  unknown,
  Record<string, unknown> | null
>;

interface DatasetRegistryEntry<Item extends ExperimentDatasetItem = ExperimentDatasetItem> {
  name: string;
  descriptor?: ExperimentDatasetDescriptor<Item>;
  resolver: ExperimentDatasetResolver<Item>;
}

interface DatasetRegistryState {
  entries: Map<string, DatasetRegistryEntry>;
}

declare global {
  // eslint-disable-next-line no-var
  var ___volt_experiment_dataset_registry: DatasetRegistryState | undefined;
}

function getGlobalRegistryState(): DatasetRegistryState {
  if (!globalThis.___volt_experiment_dataset_registry) {
    globalThis.___volt_experiment_dataset_registry = {
      entries: new Map(),
    };
  }
  return globalThis.___volt_experiment_dataset_registry;
}

function cloneDescriptor<Item extends ExperimentDatasetItem>(
  descriptor: ExperimentDatasetDescriptor<Item>,
): ExperimentDatasetDescriptor<Item> {
  return {
    ...descriptor,
  };
}

function ensureAsyncIterable<Item>(
  items: Iterable<Item> | AsyncIterable<Item>,
): AsyncIterable<Item> {
  if (!items) {
    throw new TypeError(
      "Dataset resolver returned an invalid items source (received null/undefined).",
    );
  }

  if (typeof (items as AsyncIterable<Item>)[Symbol.asyncIterator] === "function") {
    return items as AsyncIterable<Item>;
  }

  if (typeof (items as Iterable<Item>)[Symbol.iterator] === "function") {
    const iterable = items as Iterable<Item>;
    return (async function* () {
      for (const item of iterable) {
        yield item;
      }
    })();
  }

  throw new TypeError("Dataset resolver returned a source that is not iterable.");
}

function mergeDatasetInfo(
  ...sources: Array<ExperimentDatasetInfo | undefined>
): ExperimentDatasetInfo | undefined {
  const merged: ExperimentDatasetInfo = {};

  for (const source of sources) {
    if (!source) {
      continue;
    }

    if (source.id !== undefined) {
      merged.id = source.id;
    }
    if (source.versionId !== undefined) {
      merged.versionId = source.versionId;
    }
    if (source.name !== undefined) {
      merged.name = source.name;
    }
    if (source.description !== undefined) {
      merged.description = source.description;
    }
    if (source.metadata !== undefined) {
      merged.metadata = source.metadata ?? null;
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function descriptorToInfo(
  descriptor?: ExperimentDatasetDescriptor | ExperimentDatasetDescriptor<AnyDatasetItem>,
): ExperimentDatasetInfo | undefined {
  if (!descriptor) {
    return undefined;
  }

  const info: ExperimentDatasetInfo = {};
  if (descriptor.id !== undefined) {
    info.id = descriptor.id;
  }
  if (descriptor.versionId !== undefined) {
    info.versionId = descriptor.versionId;
  }
  if (descriptor.name !== undefined) {
    info.name = descriptor.name;
  }
  if (descriptor.metadata !== undefined) {
    info.metadata = descriptor.metadata ?? null;
  }

  return Object.keys(info).length > 0 ? info : undefined;
}

function isResolvedStreamObject<Item extends ExperimentDatasetItem>(
  value: unknown,
): value is ExperimentDatasetResolvedStream<Item> {
  return Boolean(
    value && typeof value === "object" && "items" in (value as Record<string, unknown>),
  );
}

function toResolvedStream<Item extends ExperimentDatasetItem>(
  value: ExperimentDatasetResolvedStream<Item> | Iterable<Item> | AsyncIterable<Item>,
  baseDescriptor?: ExperimentDatasetDescriptor<Item>,
  registeredDescriptor?: ExperimentDatasetDescriptor<Item>,
): ExperimentDatasetResolvedStream<Item> {
  if (isResolvedStreamObject<Item>(value)) {
    const datasetInfo = mergeDatasetInfo(
      descriptorToInfo(registeredDescriptor),
      descriptorToInfo(baseDescriptor),
      value.dataset,
    );
    return {
      items: ensureAsyncIterable(value.items),
      total: value.total,
      dataset: datasetInfo,
    };
  }

  const datasetInfo = mergeDatasetInfo(
    descriptorToInfo(registeredDescriptor),
    descriptorToInfo(baseDescriptor),
  );

  return {
    items: ensureAsyncIterable(value),
    dataset: datasetInfo,
  };
}

async function* limitAsyncIterable<Item>(source: AsyncIterable<Item>, limit: number) {
  if (!Number.isFinite(limit) || limit < 0) {
    for await (const item of source) {
      yield item;
    }
    return;
  }

  let count = 0;
  for await (const item of source) {
    if (count >= limit) {
      break;
    }
    yield item;
    count += 1;
  }
}

function normalizeLimit(value?: number): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  if (numeric < 0) {
    return undefined;
  }
  return Math.floor(numeric);
}

export class ExperimentDatasetRegistry {
  #state: DatasetRegistryState;

  constructor(state: DatasetRegistryState) {
    this.#state = state;
  }

  register<Item extends ExperimentDatasetItem>(entry: DatasetRegistryEntry<Item>): void {
    const name = entry.name?.trim();
    if (!name) {
      throw new Error("Experiment dataset entries must include a non-empty name.");
    }
    this.#state.entries.set(name, {
      ...entry,
      name,
      descriptor: entry.descriptor ? cloneDescriptor(entry.descriptor) : undefined,
      resolver: entry.resolver,
    });
  }

  unregister(name: string): void {
    this.#state.entries.delete(name);
  }

  get<Item extends ExperimentDatasetItem = ExperimentDatasetItem>(
    name: string,
  ): DatasetRegistryEntry<Item> | undefined {
    return this.#state.entries.get(name) as DatasetRegistryEntry<Item> | undefined;
  }

  has(name: string): boolean {
    return this.#state.entries.has(name);
  }

  list(): DatasetRegistryEntry[] {
    return Array.from(this.#state.entries.values());
  }
}

export function getExperimentDatasetRegistry(): ExperimentDatasetRegistry {
  const state = getGlobalRegistryState();
  return new ExperimentDatasetRegistry(state);
}

export interface RegisterExperimentDatasetOptions<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
> {
  name: string;
  descriptor?: ExperimentDatasetDescriptor<Item>;
  resolver?: ExperimentDatasetResolver<Item>;
  items?: Iterable<Item> | AsyncIterable<Item>;
}

export function registerExperimentDataset<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
>(options: RegisterExperimentDatasetOptions<Item>): void {
  const { name, descriptor, resolver, items } = options;

  if (!resolver && !items && (!descriptor || (!descriptor.items && !descriptor.resolve))) {
    throw new Error(
      `registerExperimentDataset("${name}") requires either a resolver, items, or a descriptor with items/resolve.`,
    );
  }

  let resolvedResolver: ExperimentDatasetResolver<Item> | undefined = resolver;
  let resolvedDescriptor = descriptor ? cloneDescriptor(descriptor) : undefined;

  if (!resolvedResolver) {
    if (descriptor?.resolve) {
      resolvedResolver = descriptor.resolve;
    } else if (descriptor?.items) {
      const itemsSource = descriptor.items;
      resolvedResolver = () => ({
        items: ensureAsyncIterable(itemsSource),
        dataset: descriptorToInfo(descriptor),
      });
    } else if (items) {
      const itemsSource = items;
      resolvedResolver = () => ({
        items: ensureAsyncIterable(itemsSource),
      });
    }
  }

  if (!resolvedDescriptor && descriptor) {
    resolvedDescriptor = cloneDescriptor(descriptor);
  }

  if (!resolvedResolver) {
    throw new Error(`Failed to resolve dataset resolver for "${name}".`);
  }

  const registry = getExperimentDatasetRegistry();
  registry.register({
    name,
    descriptor: resolvedDescriptor,
    resolver: resolvedResolver,
  });
}

export type ExperimentDatasetReference<Item extends ExperimentDatasetItem = ExperimentDatasetItem> =
  | string
  | ExperimentDatasetDescriptor<Item>
  | undefined;

export interface ResolveExperimentDatasetOptions {
  limit?: number;
  signal?: AbortSignal;
  registry?: ExperimentDatasetRegistry;
}

export async function resolveExperimentDataset<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
>(
  reference: ExperimentDatasetReference<Item>,
  options: ResolveExperimentDatasetOptions = {},
): Promise<ExperimentDatasetResolvedStream<Item>> {
  const registry = options.registry ?? getExperimentDatasetRegistry();

  if (!reference) {
    throw new Error(
      "Experiment definitions must specify a dataset descriptor or registered dataset name.",
    );
  }

  const descriptor: ExperimentDatasetDescriptor<Item> =
    typeof reference === "string"
      ? ({ name: reference } as ExperimentDatasetDescriptor<Item>)
      : reference;

  const optionLimit = normalizeLimit(options.limit);
  const descriptorLimit = normalizeLimit(descriptor.limit);
  const baseLimit = optionLimit ?? descriptorLimit;

  if (descriptor.items) {
    const stream = toResolvedStream<Item>(
      {
        items: descriptor.items,
        dataset: descriptorToInfo(descriptor),
      },
      descriptor,
    );
    return finalizeStream(stream, baseLimit);
  }

  if (descriptor.resolve) {
    const result = await descriptor.resolve({
      limit: baseLimit,
      signal: options.signal,
    });
    const stream = toResolvedStream<Item>(result, descriptor);
    return finalizeStream(stream, baseLimit);
  }

  if (descriptor.name) {
    const entry = registry.get<Item>(descriptor.name);
    if (!entry) {
      throw new Error(
        `Experiment dataset "${descriptor.name}" is not registered. Register it via registerExperimentDataset().`,
      );
    }
    const entryLimit = normalizeLimit(entry.descriptor?.limit);
    const effectiveLimit = baseLimit ?? entryLimit;
    const result = await entry.resolver({
      limit: effectiveLimit,
      signal: options.signal,
    });
    const stream = toResolvedStream<Item>(result, descriptor, entry.descriptor);
    return finalizeStream(stream, effectiveLimit);
  }

  throw new Error(
    "Unsupported experiment dataset descriptor. Provide items, a resolve function, or a registered dataset name.",
  );
}

function finalizeStream<Item extends ExperimentDatasetItem>(
  stream: ExperimentDatasetResolvedStream<Item>,
  limit?: number,
): ExperimentDatasetResolvedStream<Item> {
  const items = ensureAsyncIterable(stream.items);
  const limitedItems = limit !== undefined ? limitAsyncIterable(items, limit) : items;

  return {
    items: limitedItems,
    dataset: stream.dataset,
    total:
      limit !== undefined && stream.total !== undefined
        ? Math.min(stream.total, limit)
        : stream.total,
  };
}
