import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { safeStringify } from "@voltagent/internal";
import type {
  AppendEvalRunResultsRequest,
  CompleteEvalRunRequest,
  EvalDatasetDetail,
  EvalDatasetItemsResponse,
  EvalRunSummary,
  FailEvalRunRequest,
} from "../types";
import { VoltAgentCoreAPI } from "./index";

vi.mock("@voltagent/internal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@voltagent/internal")>();
  return {
    ...actual,
    safeStringify: vi.fn(actual.safeStringify),
  };
});

describe("VoltAgentCoreAPI", () => {
  const defaultOptions = {
    baseUrl: "https://api.voltagent.dev",
    publicKey: "pk_test",
    secretKey: "sk_test",
  } as const;

  const runSummary: EvalRunSummary = {
    id: "run-123",
    status: "pending",
    triggerSource: "manual",
    datasetId: "dataset-1",
    datasetVersionId: "version-1",
    datasetVersionLabel: "v1",
    itemCount: 1,
    successCount: 1,
    failureCount: 0,
    meanScore: 0.9,
    medianScore: 0.9,
    sumScore: 0.9,
    passRate: 0.9,
    startedAt: new Date().toISOString(),
    completedAt: null,
    durationMs: 1200,
    tags: ["nightly"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createEvalRun", () => {
    it("sends POST request and returns summary", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => runSummary,
      });

      const api = new VoltAgentCoreAPI(defaultOptions);
      const result = await api.evals.runs.create({ experimentId: "exp-1" });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.voltagent.dev/evals/runs",
        expect.objectContaining({
          method: "POST",
          body: safeStringify({ experimentId: "exp-1" }),
        }),
      );
      expect(result).toEqual(runSummary);
      expect(safeStringify).toHaveBeenCalledWith({ experimentId: "exp-1" });
    });

    it("throws ApiError when request fails", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ message: "Unauthorized" }),
      });

      const api = new VoltAgentCoreAPI(defaultOptions);
      await expect(api.evals.runs.create({})).rejects.toMatchObject({
        status: 401,
        message: "Unauthorized",
      });
    });
  });

  describe("appendEvalResults", () => {
    it("sends results payload to API", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => runSummary,
      });

      const payload: AppendEvalRunResultsRequest = {
        results: [
          {
            datasetItemHash: "hash-1",
            status: "passed",
            input: { question: "foo" },
            output: { answer: "bar" },
          },
        ],
      };

      const api = new VoltAgentCoreAPI(defaultOptions);
      await api.evals.runs.appendResults("run-123", payload);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.voltagent.dev/evals/runs/run-123/results",
        expect.objectContaining({
          method: "POST",
          body: safeStringify(payload),
        }),
      );
    });

    it("serializes live eval metadata when provided", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => runSummary,
      });

      const payload: AppendEvalRunResultsRequest = {
        results: [
          {
            datasetItemHash: "hash-2",
            datasetId: "dataset-9",
            datasetVersionId: "version-3",
            datasetItemId: "item-1",
            datasetItemLabel: "capital",
            threshold: 0.8,
            thresholdPassed: true,
            status: "passed",
            liveEval: {
              traceId: "trace-1",
              spanId: "span-1",
              operationId: "op-1",
              operationType: "generateText",
              sampling: { strategy: "ratio", rate: 0.5 },
              triggerSource: "production",
              environment: "prod",
            },
            scores: [
              {
                scorerId: "levenshtein",
                score: 0.95,
                threshold: 0.8,
                thresholdPassed: true,
              },
            ],
          },
        ],
      };

      const api = new VoltAgentCoreAPI(defaultOptions);
      await api.evals.runs.appendResults("run-456", payload);

      expect(safeStringify).toHaveBeenCalledWith(payload);
    });
  });

  describe("completeEvalRun", () => {
    it("posts completion payload", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ...runSummary, status: "succeeded" }),
      });

      const payload: CompleteEvalRunRequest = {
        status: "succeeded",
        summary: {
          itemCount: 3,
          successCount: 3,
          failureCount: 0,
        },
      };

      const api = new VoltAgentCoreAPI(defaultOptions);
      const result = await api.evals.runs.complete("run-123", payload);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.voltagent.dev/evals/runs/run-123/complete",
        expect.objectContaining({ body: safeStringify(payload) }),
      );
      expect(result.status).toBe("succeeded");
    });
  });

  describe("failEvalRun", () => {
    it("posts failure payload", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ...runSummary, status: "failed" }),
      });

      const payload: FailEvalRunRequest = {
        error: {
          message: "fatal",
          code: "ERR_RUN_FAIL",
        },
      };

      const api = new VoltAgentCoreAPI(defaultOptions);
      const result = await api.evals.runs.fail("run-123", payload);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.voltagent.dev/evals/runs/run-123/fail",
        expect.objectContaining({ body: safeStringify(payload) }),
      );
      expect(result.status).toBe("failed");
    });
  });

  describe("getEvalDataset", () => {
    it("fetches dataset detail", async () => {
      const dataset: EvalDatasetDetail = {
        id: "dataset-1",
        name: "Capitals",
        description: null,
        tags: null,
        projectId: "project-1",
        versionCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versions: [
          {
            id: "version-1",
            version: 1,
            description: null,
            itemCount: 3,
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

      const api = new VoltAgentCoreAPI(defaultOptions);
      const response = await api.evals.datasets.get("dataset-1");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.voltagent.dev/evals/datasets/dataset-1",
        expect.objectContaining({ method: "GET" }),
      );
      expect(response).toEqual(dataset);
    });
  });

  describe("listEvalDatasets", () => {
    it("requests datasets without name filter", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => [],
      });

      const api = new VoltAgentCoreAPI(defaultOptions);
      await api.evals.datasets.list();

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.voltagent.dev/evals/datasets",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("requests datasets filtered by name", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => [],
      });

      const api = new VoltAgentCoreAPI(defaultOptions);
      await api.evals.datasets.list("Capitals");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.voltagent.dev/evals/datasets?name=Capitals",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });

  describe("listEvalDatasetItems", () => {
    it("applies query params and returns dataset items", async () => {
      const apiResponse: EvalDatasetItemsResponse = {
        total: 1,
        items: [
          {
            id: "item-1",
            datasetVersionId: "version-1",
            label: "Paris",
            input: { prompt: "What is the capital of France?" },
            expected: "Paris",
            extra: null,
            createdAt: new Date().toISOString(),
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => apiResponse,
      });

      const api = new VoltAgentCoreAPI(defaultOptions);
      const response = await api.evals.datasets.listItems("dataset-1", "version-1", {
        limit: 20,
        offset: 5,
        search: "Paris",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.voltagent.dev/evals/datasets/dataset-1/versions/version-1/items?limit=20&offset=5&search=Paris",
        expect.objectContaining({ method: "GET" }),
      );
      expect(response).toEqual(apiResponse);
    });
  });
});
