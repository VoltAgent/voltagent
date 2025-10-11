import type {
  ExperimentDatasetItem,
  ExperimentDatasetResolvedStream,
} from "../experiment/types.js";

export interface VoltEvalDatasetConfig {
  name?: string;
  id?: string;
  versionId?: string;
  limit?: number;
}

export type VoltOpsDatasetStream<Item extends ExperimentDatasetItem = ExperimentDatasetItem> =
  ExperimentDatasetResolvedStream<Item>;
