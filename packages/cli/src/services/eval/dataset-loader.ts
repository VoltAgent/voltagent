import fs from "node:fs/promises";
import path from "node:path";

export interface DatasetFileItem {
  name?: string;
  input: unknown;
  expected?: unknown;
  extra?: Record<string, unknown> | null;
}

export interface DatasetFile {
  name?: string;
  description?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
  checksum?: string | null;
  data?: DatasetFileItem[];
}

export interface ReadDatasetFileOptions {
  filePath?: string;
  cwd?: string;
}

const DEFAULT_DATASET_DIR = ".voltagent/datasets";

export const resolveDatasetFilePath = (
  datasetName: string,
  options: ReadDatasetFileOptions = {},
): string => {
  const workingDir = options.cwd ?? process.cwd();
  if (options.filePath) {
    return path.isAbsolute(options.filePath)
      ? options.filePath
      : path.resolve(workingDir, options.filePath);
  }
  return path.resolve(workingDir, DEFAULT_DATASET_DIR, `${datasetName}.json`);
};

export const readDatasetFile = async (
  datasetName: string,
  options: ReadDatasetFileOptions = {},
): Promise<DatasetFile> => {
  const filePath = resolveDatasetFilePath(datasetName, options);
  const fileContents = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(fileContents) as DatasetFile;
  return parsed;
};

export const writeDatasetFile = async (filePath: string, data: DatasetFile): Promise<void> => {
  const content = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(filePath, content, "utf-8");
};

export const readDatasetFileFromPath = async (filePath: string): Promise<DatasetFile> => {
  const fileContents = await fs.readFile(filePath, "utf-8");
  return JSON.parse(fileContents) as DatasetFile;
};

const sortJsonValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }

  if (value && typeof value === "object" && value.constructor === Object) {
    const sortedEntries = Object.entries(value as Record<string, unknown>).sort(([keyA], [keyB]) =>
      keyA.localeCompare(keyB),
    );
    return sortedEntries.reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = sortJsonValue(val);
      return acc;
    }, {});
  }

  return value;
};

const canonicalizeDataset = (dataset: DatasetFile): string => {
  const clone: DatasetFile = {
    ...dataset,
    data: dataset.data ? dataset.data.map((item) => ({ ...item })) : undefined,
    tags: dataset.tags ? [...dataset.tags] : undefined,
  };

  if (clone.tags) {
    clone.tags.sort((a, b) => a.localeCompare(b));
  }

  if (clone.data) {
    clone.data.sort((left, right) => {
      const leftLabel = left.name ?? "";
      const rightLabel = right.name ?? "";
      return leftLabel.localeCompare(rightLabel);
    });
    clone.data = clone.data.map((item) => {
      const sortedItem = sortJsonValue(item) as DatasetFileItem;
      return sortedItem;
    });
  }

  return JSON.stringify(sortJsonValue(clone));
};

export const datasetsEqual = (left: DatasetFile, right: DatasetFile): boolean => {
  return canonicalizeDataset(left) === canonicalizeDataset(right);
};
