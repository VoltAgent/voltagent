import { safeStringify } from "@voltagent/internal";
import type { AuthConfig } from "../../utils/config";
import type { DatasetFile } from "./dataset-loader";

export interface PushDatasetResult {
  datasetId: string;
  datasetVersionId: string;
  itemCount: number;
}

const buildHeaders = (auth: AuthConfig): Record<string, string> => ({
  "Content-Type": "application/json",
  "X-Public-Key": auth.publicKey,
  "X-Secret-Key": auth.secretKey,
});

const joinUrl = (baseUrl: string, pathname: string): string => {
  const trimmed = baseUrl.replace(/\/$/, "");
  return `${trimmed}${pathname}`;
};

const handleResponse = async (response: Response): Promise<any> => {
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return await response.json();
  }
  return undefined;
};

export interface PushDatasetOptions {
  datasetName: string;
  dataset: DatasetFile;
  auth: AuthConfig;
}

export const pushDatasetToVoltOps = async (
  options: PushDatasetOptions,
): Promise<PushDatasetResult> => {
  const { datasetName, dataset, auth } = options;
  const headers = buildHeaders(auth);

  const datasetPayload = {
    name: dataset.name ?? datasetName,
    description: dataset.description ?? null,
    tags: dataset.tags ?? [],
    metadata: dataset.metadata ?? null,
  } as Record<string, unknown>;

  const datasetResponse = await fetch(joinUrl(auth.baseUrl, "/evals/datasets"), {
    method: "POST",
    headers,
    body: safeStringify(datasetPayload),
  });

  let datasetId: string;
  if (datasetResponse.ok) {
    const datasetJson = (await datasetResponse.json()) as { id: string };
    datasetId = datasetJson.id;
  } else if (datasetResponse.status === 409 || datasetResponse.status === 400) {
    const fallbackUrl = new URL(joinUrl(auth.baseUrl, "/evals/datasets"));
    fallbackUrl.searchParams.set("name", datasetPayload.name as string);
    const existingResponse = await fetch(fallbackUrl, { headers });
    const existingJson = await handleResponse(existingResponse);
    const match = Array.isArray(existingJson?.data)
      ? existingJson.data.find((item: any) => item?.name === datasetPayload.name)
      : Array.isArray(existingJson)
        ? existingJson.find((item: any) => item?.name === datasetPayload.name)
        : null;
    if (!match?.id) {
      const bodyText = await datasetResponse.text().catch(() => datasetResponse.statusText);
      throw new Error(`Failed to create dataset: ${bodyText}`);
    }
    datasetId = match.id as string;
  } else {
    const bodyText = await datasetResponse.text().catch(() => datasetResponse.statusText);
    throw new Error(`Failed to create dataset (${datasetResponse.status}): ${bodyText}`);
  }

  const versionPayload = {
    description: dataset.description ?? null,
    metadata: dataset.metadata ?? null,
    checksum: dataset.checksum ?? null,
  };

  const versionResponse = await fetch(
    joinUrl(auth.baseUrl, `/evals/datasets/${datasetId}/versions`),
    {
      method: "POST",
      headers,
      body: safeStringify(versionPayload),
    },
  );

  const versionJson = (await handleResponse(versionResponse)) as { id: string };
  const datasetVersionId = versionJson.id;

  const items = dataset.data ?? [];
  for (const item of items) {
    const itemPayload = {
      input: item.input,
      expected: item.expected ?? null,
      extra: item.extra ?? null,
      label: item.name ?? null,
    } as Record<string, unknown>;

    const itemResponse = await fetch(
      joinUrl(auth.baseUrl, `/evals/datasets/${datasetId}/versions/${datasetVersionId}/items`),
      {
        method: "POST",
        headers,
        body: safeStringify(itemPayload),
      },
    );

    if (!itemResponse.ok) {
      const text = await itemResponse.text().catch(() => itemResponse.statusText);
      throw new Error(`Failed to create dataset item (${item.name ?? "unnamed"}): ${text}`);
    }
  }

  return {
    datasetId,
    datasetVersionId,
    itemCount: items.length,
  };
};
