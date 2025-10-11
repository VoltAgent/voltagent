import { VoltOpsRestClient } from "@voltagent/sdk";

import type { AuthConfig } from "../../utils/config";
import type { DatasetFile, DatasetFileItem } from "./dataset-loader";

interface FetchDatasetOptions {
  auth: AuthConfig;
  datasetId?: string;
  datasetName?: string;
  versionId?: string;
  pageSize?: number;
  onProgress?: (fetched: number, total: number | null) => void;
}

interface FetchDatasetResult {
  datasetId: string;
  datasetName: string;
  datasetDescription?: string | null;
  datasetTags?: string[] | null;
  versionId: string;
  versionLabel?: string | null;
  itemCount: number;
  datasetFile: DatasetFile;
}

const DEFAULT_PAGE_SIZE = 200;

export const fetchDatasetFromVoltOps = async (
  options: FetchDatasetOptions,
): Promise<FetchDatasetResult> => {
  const {
    auth,
    datasetId: initialDatasetId,
    datasetName: requestedDatasetName,
    versionId,
    pageSize,
  } = options;

  const sdk = new VoltOpsRestClient(auth);

  let datasetId = initialDatasetId ?? null;
  let datasetName = requestedDatasetName ?? null;

  let datasetDetail = null;

  if (datasetId) {
    datasetDetail = await sdk.getDataset(datasetId);
    if (!datasetDetail) {
      throw new Error(`Dataset with id ${datasetId} not found.`);
    }
    datasetName = datasetDetail.name;
  } else if (datasetName) {
    datasetDetail = await sdk.getDatasetByName(datasetName);
    if (!datasetDetail) {
      throw new Error(`Dataset named "${datasetName}" not found.`);
    }
    datasetId = datasetDetail.id;
  } else {
    throw new Error(
      "Provide dataset name (--name) or dataset id (--id). Alternatively set VOLTAGENT_DATASET_NAME or VOLTAGENT_DATASET_ID.",
    );
  }

  if (!datasetDetail) {
    datasetDetail = await sdk.getDataset(datasetId);
    if (!datasetDetail) {
      throw new Error(`Dataset (${datasetId}) could not be retrieved.`);
    }
  }

  const targetVersionId =
    versionId ??
    process.env.VOLTAGENT_DATASET_VERSION_ID ??
    datasetDetail.versions?.[0]?.id ??
    null;

  if (!targetVersionId) {
    throw new Error("Dataset has no versions. Please create a version before pulling items.");
  }

  const versionSummary = datasetDetail.versions?.find((version) => version.id === targetVersionId);
  if (!versionSummary) {
    throw new Error(`Version ${targetVersionId} not found for dataset ${datasetDetail.name}.`);
  }

  const limit = pageSize ?? DEFAULT_PAGE_SIZE;
  let offset = 0;
  let total = 0;
  const items: DatasetFileItem[] = [];

  while (true) {
    const response = await sdk.listDatasetItems(datasetId, targetVersionId, {
      limit,
      offset,
    });

    const fetched = response.items ?? [];
    total = response.total ?? fetched.length;

    for (const item of fetched) {
      items.push({
        name: item.label ?? undefined,
        input: item.input,
        expected: item.expected,
        extra: item.extra ?? null,
      });
    }

    offset += fetched.length;
    options.onProgress?.(items.length, total);

    if (items.length >= total || fetched.length === 0) {
      break;
    }
  }

  const datasetFile: DatasetFile = {
    name: datasetDetail.name,
    description: datasetDetail.description ?? versionSummary.description ?? null,
    tags: datasetDetail.tags ?? null,
    metadata: null,
    checksum: null,
    data: items,
  };

  return {
    datasetId,
    datasetName: datasetDetail.name,
    datasetDescription: datasetDetail.description ?? null,
    datasetTags: datasetDetail.tags ?? null,
    versionId: targetVersionId,
    versionLabel: versionSummary.description ?? null,
    itemCount: items.length,
    datasetFile,
  };
};
