import type { EvalDatasetItemSummary, VoltOpsRestClient } from "@voltagent/sdk";
import type { ExperimentDatasetItem } from "../experiment/types.js";
import type { VoltEvalDatasetConfig, VoltOpsDatasetStream } from "./types.js";

const DEFAULT_PAGE_SIZE = 200;

interface ResolveDatasetIdentifiersResult {
  datasetId: string;
  datasetVersionId: string;
  datasetName: string;
}

export interface ResolveVoltOpsDatasetOptions {
  sdk: VoltOpsRestClient;
  config: VoltEvalDatasetConfig;
  limit?: number;
  signal?: AbortSignal;
}

interface IterateItemsOptions {
  sdk: VoltOpsRestClient;
  datasetId: string;
  datasetVersionId: string;
  datasetName: string;
  limit?: number;
}

export async function resolveVoltOpsDatasetStream<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
>(options: ResolveVoltOpsDatasetOptions): Promise<VoltOpsDatasetStream<Item>> {
  const { sdk, config, limit } = options;

  const identifiers = await resolveDatasetIdentifiers(sdk, config);
  const iterator = iterateDatasetItems({
    sdk,
    datasetId: identifiers.datasetId,
    datasetVersionId: identifiers.datasetVersionId,
    datasetName: identifiers.datasetName,
    limit,
  });

  const stream: VoltOpsDatasetStream<Item> = {
    items: iterator as unknown as AsyncIterable<Item>,
    dataset: {
      id: identifiers.datasetId,
      versionId: identifiers.datasetVersionId,
      name: identifiers.datasetName,
    },
  };

  return stream;
}

async function resolveDatasetIdentifiers(
  sdk: VoltOpsRestClient,
  config: VoltEvalDatasetConfig,
): Promise<ResolveDatasetIdentifiersResult> {
  if (config.id && config.versionId) {
    return {
      datasetId: config.id,
      datasetVersionId: config.versionId,
      datasetName: config.name ?? config.id,
    };
  }

  const resolved = await sdk.resolveDatasetVersionId({
    datasetId: config.id,
    datasetName: config.name,
    datasetVersionId: config.versionId,
  });

  if (!resolved) {
    throw new Error(
      `Failed to resolve dataset information. Provide a valid dataset name or id (received name=${config.name ?? ""}, id=${config.id ?? ""}).`,
    );
  }

  const detail = await sdk.getDataset(resolved.datasetId);
  const datasetName = detail?.name ?? config.name ?? resolved.datasetId;

  return {
    datasetId: resolved.datasetId,
    datasetVersionId: resolved.datasetVersionId,
    datasetName,
  };
}

async function* iterateDatasetItems(
  options: IterateItemsOptions,
): AsyncIterable<ExperimentDatasetItem> {
  const { sdk, datasetId, datasetVersionId, datasetName } = options;
  const limit = normalizeLimit(options.limit);
  let offset = 0;
  let yielded = 0;
  let total: number | undefined;

  while (true) {
    const remaining =
      limit === undefined
        ? DEFAULT_PAGE_SIZE
        : Math.max(Math.min(DEFAULT_PAGE_SIZE, limit - yielded), 0);

    if (limit !== undefined && remaining <= 0) {
      break;
    }

    const response = await sdk.listDatasetItems(datasetId, datasetVersionId, {
      limit: remaining > 0 ? remaining : DEFAULT_PAGE_SIZE,
      offset,
    });

    if (!total && typeof response.total === "number") {
      total = response.total;
    }

    const items = response.items ?? [];
    if (items.length === 0) {
      break;
    }

    for (const rawItem of items) {
      yield mapDatasetItem(rawItem, {
        datasetId,
        datasetVersionId,
        datasetName,
      });
      yielded += 1;
      if (limit !== undefined && yielded >= limit) {
        return;
      }
    }

    offset += items.length;

    if (limit !== undefined && yielded >= limit) {
      break;
    }

    if (total !== undefined && yielded >= total) {
      break;
    }
  }
}

function mapDatasetItem(
  item: EvalDatasetItemSummary,
  identifiers: { datasetId: string; datasetVersionId: string; datasetName: string },
): ExperimentDatasetItem {
  return {
    id: item.id,
    label: item.label ?? null,
    input: item.input,
    expected: item.expected,
    extra: item.extra ?? null,
    datasetId: identifiers.datasetId,
    datasetVersionId: identifiers.datasetVersionId,
    datasetName: identifiers.datasetName,
    dataset: {
      id: identifiers.datasetId,
      versionId: identifiers.datasetVersionId,
      name: identifiers.datasetName,
    },
    raw: item,
  };
}

function normalizeLimit(value?: number): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  if (numeric <= 0) {
    return 0;
  }
  return Math.floor(numeric);
}
