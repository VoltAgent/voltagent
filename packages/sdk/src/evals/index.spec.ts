import { beforeEach, describe, expect, it, vi } from "vitest";

import { safeStringify } from "@voltagent/internal";

import { VoltOpsRestClient } from ".";
import type {
  AppendEvalRunResultsRequest,
  CompleteEvalRunRequest,
  EvalDatasetDetail,
  EvalDatasetItemsResponse,
  EvalDatasetSummary,
  EvalRunSummary,
  FailEvalRunRequest,
} from "../types";

describe("VoltOpsRestClient", () => {
  const fetchMock = vi.fn();

  const defaultOptions = {
    baseUrl: "https://api.voltagent.dev",
    publicKey: "pk_test",
    secretKey: "sk_test",
  } as const;

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it("runs full lifecycle with idempotent append handling", async () => {
    const seenHashes = new Set<string>();
    let currentSummary: EvalRunSummary | null = null;

    const jsonResponse = (body: unknown): Response =>
      ({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => body,
      }) satisfies Response;

    const handleCreateRunRequest = (): Response => {
      currentSummary = {
        id: "run-abc",
        status: "pending",
        triggerSource: "manual",
        datasetId: null,
        datasetVersionId: null,
        datasetVersionLabel: null,
        itemCount: 0,
        successCount: 0,
        failureCount: 0,
        meanScore: null,
        medianScore: null,
        sumScore: null,
        passRate: null,
        startedAt: null,
        completedAt: null,
        durationMs: null,
        tags: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies EvalRunSummary;
      return jsonResponse(currentSummary);
    };

    const handleAppendResultsRequest = (init: RequestInit | undefined): Response => {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
      const payload = body as AppendEvalRunResultsRequest;

      for (const result of payload.results ?? []) {
        if (seenHashes.has(result.datasetItemHash)) {
          continue;
        }
        seenHashes.add(result.datasetItemHash);
        if (!currentSummary) {
          throw new Error("Run summary not initialised");
        }
        currentSummary.itemCount += 1;
        currentSummary.successCount += result.status === "passed" ? 1 : 0;
        currentSummary.failureCount += result.status === "failed" ? 1 : 0;
        currentSummary.updatedAt = new Date().toISOString();
      }

      return jsonResponse(currentSummary);
    };

    const handleCompleteRequest = (init: RequestInit | undefined): Response => {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
      const payload = body as CompleteEvalRunRequest;

      if (currentSummary) {
        currentSummary.status = payload.status;
        currentSummary.completedAt = new Date().toISOString();
        currentSummary.durationMs = payload.summary?.durationMs ?? null;
        currentSummary.passRate = payload.summary?.passRate ?? currentSummary.passRate;
      }

      return jsonResponse(currentSummary);
    };

    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/evals/runs") && init?.method === "POST") {
        return handleCreateRunRequest();
      }

      if (url.endsWith("/results") && init?.method === "POST") {
        return handleAppendResultsRequest(init);
      }

      if (url.endsWith("/complete") && init?.method === "POST") {
        return handleCompleteRequest(init);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    const sdk = new VoltOpsRestClient(defaultOptions);

    const created = await sdk.createEvalRun({ triggerSource: "cli" });
    expect(created.status).toBe("pending");

    const firstBatch: AppendEvalRunResultsRequest = {
      results: [
        {
          datasetItemHash: "hash-1",
          status: "passed",
          input: { prompt: "foo" },
          output: { text: "bar" },
        },
      ],
    };

    const afterFirstAppend = await sdk.appendEvalResults(created.id, firstBatch);
    expect(afterFirstAppend.itemCount).toBe(1);
    expect(afterFirstAppend.successCount).toBe(1);

    const idempotentAppend = await sdk.appendEvalResults(created.id, firstBatch);
    expect(idempotentAppend.itemCount).toBe(1);
    expect(seenHashes.size).toBe(1);

    const secondBatch: AppendEvalRunResultsRequest = {
      results: [
        {
          datasetItemHash: "hash-2",
          status: "failed",
          input: { prompt: "baz" },
          output: { text: "qux" },
        },
      ],
    };

    const afterSecondAppend = await sdk.appendEvalResults(created.id, secondBatch);
    expect(afterSecondAppend.itemCount).toBe(2);
    expect(afterSecondAppend.failureCount).toBe(1);

    const completionPayload: CompleteEvalRunRequest = {
      status: "succeeded",
      summary: {
        durationMs: 4200,
        passRate: 0.5,
      },
    };

    const completed = await sdk.completeEvalRun(created.id, completionPayload);
    expect(completed.status).toBe("succeeded");
    expect(completed.durationMs).toBe(4200);
    expect(completed.passRate).toBe(0.5);

    // Ensure safeStringify has been used for payloads
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.voltagent.dev/evals/runs",
      expect.objectContaining({
        method: "POST",
        body: safeStringify({ triggerSource: "cli" }),
      }),
    );
  });

  it("marks run as failed", async () => {
    const currentSummary: EvalRunSummary | null = {
      id: "run-xyz",
      status: "running",
      triggerSource: "manual",
      datasetId: null,
      datasetVersionId: null,
      datasetVersionLabel: null,
      itemCount: 0,
      successCount: 0,
      failureCount: 0,
      meanScore: null,
      medianScore: null,
      sumScore: null,
      passRate: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      durationMs: null,
      tags: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/evals/runs/run-xyz/fail") && init?.method === "POST") {
        const body = typeof init.body === "string" ? JSON.parse(init.body) : {};
        const _payload = body as FailEvalRunRequest;
        if (currentSummary) {
          currentSummary.status = "failed";
          currentSummary.completedAt = new Date().toISOString();
          currentSummary.updatedAt = new Date().toISOString();
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => currentSummary,
        } satisfies Response;
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    const sdk = new VoltOpsRestClient(defaultOptions);
    const failed = await sdk.failEvalRun("run-xyz", {
      error: {
        message: "agent crashed",
        code: "AGENT_CRASH",
      },
    });

    expect(failed.status).toBe("failed");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.voltagent.dev/evals/runs/run-xyz/fail",
      expect.objectContaining({
        body: safeStringify({
          error: {
            message: "agent crashed",
            code: "AGENT_CRASH",
          },
        }),
      }),
    );
  });

  it("fetches dataset detail via helper", async () => {
    const dataset: EvalDatasetDetail = {
      id: "dataset-123",
      name: "Capitals",
      description: null,
      tags: null,
      projectId: "project-abc",
      versionCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [
        {
          id: "version-abc",
          version: 1,
          description: null,
          itemCount: 10,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => dataset,
    });

    const sdk = new VoltOpsRestClient(defaultOptions);
    const response = await sdk.getDataset("dataset-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.voltagent.dev/evals/datasets/dataset-123",
      expect.objectContaining({ method: "GET" }),
    );
    expect(response).toEqual(dataset);
  });

  it("lists dataset items with options", async () => {
    const items: EvalDatasetItemsResponse = {
      total: 2,
      items: [
        {
          id: "item-1",
          datasetVersionId: "version-abc",
          label: "Question 1",
          input: { prompt: "Capital of Spain" },
          expected: "Madrid",
          extra: null,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => items,
    });

    const sdk = new VoltOpsRestClient(defaultOptions);
    const response = await sdk.listDatasetItems("dataset-123", "version-abc", {
      limit: 10,
      offset: 5,
      search: "Madrid",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.voltagent.dev/evals/datasets/dataset-123/versions/version-abc/items?limit=10&offset=5&search=Madrid",
      expect.objectContaining({ method: "GET" }),
    );
    expect(response).toEqual(items);
  });

  it("lists datasets and resolves by name", async () => {
    const datasets: EvalDatasetSummary[] = [
      {
        id: "dataset-1",
        name: "capitals",
        description: null,
        tags: null,
        projectId: "project-1",
        versionCount: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const detail: EvalDatasetDetail = {
      ...datasets[0],
      versions: [
        {
          id: "version-1",
          version: 1,
          description: null,
          itemCount: 5,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => datasets,
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => detail,
    });

    const sdk = new VoltOpsRestClient(defaultOptions);
    const result = await sdk.getDatasetByName("capitals");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.voltagent.dev/evals/datasets?name=capitals",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.voltagent.dev/evals/datasets/dataset-1",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result).toEqual(detail);
  });

  it("resolves dataset version id with helper", async () => {
    const datasets: EvalDatasetSummary[] = [
      {
        id: "dataset-1",
        name: "capitals",
        description: null,
        tags: null,
        projectId: "project-1",
        versionCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const detail: EvalDatasetDetail = {
      ...datasets[0],
      versions: [
        {
          id: "version-1",
          version: 1,
          description: null,
          itemCount: 5,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => datasets,
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => detail,
    });

    const sdk = new VoltOpsRestClient(defaultOptions);
    const resolved = await sdk.resolveDatasetVersionId({ datasetName: "capitals" });

    expect(resolved).toEqual({ datasetId: "dataset-1", datasetVersionId: "version-1" });
  });
});
