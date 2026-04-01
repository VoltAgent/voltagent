import { VoltOpsActionsClient } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";

import type {
  ApiError,
  AppendEvalRunResultsRequest,
  CompleteEvalRunRequest,
  CreateEvalExperimentRequest,
  CreateEvalRunRequest,
  CreateEvalScorerRequest,
  EvalDatasetDetail,
  EvalDatasetItemsResponse,
  EvalDatasetSummary,
  EvalExperimentDetail,
  EvalExperimentSummary,
  EvalRunSummary,
  EvalScorerSummary,
  FailEvalRunRequest,
  ListEvalDatasetItemsOptions,
  ListEvalExperimentsOptions,
  VoltAgentClientOptions,
} from "../types";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_API_BASE_URL = "https://api.voltagent.dev";

export class VoltAgentAPIError extends Error {
  readonly status: number;
  readonly errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "VoltAgentAPIError";
    this.status = status;
    this.errors = errors;
  }
}

type EvalRunsAPI = {
  create: (payload?: CreateEvalRunRequest) => Promise<EvalRunSummary>;
  appendResults: (runId: string, payload: AppendEvalRunResultsRequest) => Promise<EvalRunSummary>;
  complete: (runId: string, payload: CompleteEvalRunRequest) => Promise<EvalRunSummary>;
  fail: (runId: string, payload: FailEvalRunRequest) => Promise<EvalRunSummary>;
};

type EvalScorersAPI = {
  create: (payload: CreateEvalScorerRequest) => Promise<EvalScorerSummary>;
};

type EvalDatasetsAPI = {
  get: (datasetId: string) => Promise<EvalDatasetDetail | null>;
  list: (name?: string) => Promise<EvalDatasetSummary[]>;
  listItems: (
    datasetId: string,
    versionId: string,
    options?: ListEvalDatasetItemsOptions,
  ) => Promise<EvalDatasetItemsResponse>;
  getLatestVersionId: (datasetId: string) => Promise<string | null>;
};

type EvalExperimentsAPI = {
  list: (options?: ListEvalExperimentsOptions) => Promise<EvalExperimentSummary[]>;
  get: (
    experimentId: string,
    options?: { projectId?: string },
  ) => Promise<EvalExperimentDetail | null>;
  create: (payload: CreateEvalExperimentRequest) => Promise<EvalExperimentSummary>;
};

type VoltAgentEvalsAPI = {
  runs: EvalRunsAPI;
  scorers: EvalScorersAPI;
  datasets: EvalDatasetsAPI;
  experiments: EvalExperimentsAPI;
};

export class VoltAgentCoreAPI {
  private readonly baseUrl: string;
  private readonly headers: HeadersInit;
  private readonly timeout: number;
  public readonly actions: VoltOpsActionsClient;
  public readonly evals: VoltAgentEvalsAPI;

  constructor(options: VoltAgentClientOptions) {
    const baseUrl = (options.baseUrl ?? DEFAULT_API_BASE_URL).trim();
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;

    if (!options.publicKey || !options.secretKey) {
      throw new VoltAgentAPIError("VoltOpsRestClient requires both publicKey and secretKey", 401);
    }

    this.headers = {
      "Content-Type": "application/json",
      "x-public-key": options.publicKey,
      "x-secret-key": options.secretKey,
      ...options.headers,
    } satisfies HeadersInit;

    this.actions = new VoltOpsActionsClient(this);
    this.evals = {
      runs: {
        create: this.createEvalRun.bind(this),
        appendResults: this.appendEvalResults.bind(this),
        complete: this.completeEvalRun.bind(this),
        fail: this.failEvalRun.bind(this),
      },
      scorers: {
        create: this.createEvalScorer.bind(this),
      },
      datasets: {
        get: this.getEvalDataset.bind(this),
        list: this.listEvalDatasets.bind(this),
        listItems: this.listEvalDatasetItems.bind(this),
        getLatestVersionId: this.getLatestDatasetVersionId.bind(this),
      },
      experiments: {
        list: this.listEvalExperiments.bind(this),
        get: this.getEvalExperiment.bind(this),
        create: this.createEvalExperiment.bind(this),
      },
    };
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new VoltAgentAPIError("Request timeout", 408);
      }

      if (error instanceof TypeError) {
        throw new VoltAgentAPIError("Network error", 0);
      }

      throw error;
    }
  }

  private async request<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const fetchOptions: RequestInit = {
      method: "GET",
      ...init,
      headers: {
        ...this.headers,
        ...(init?.headers ?? {}),
      },
    };

    const response = await this.fetchWithTimeout(url, fetchOptions);

    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    const hasJson = response.headers.get("content-type")?.includes("application/json");
    const data = hasJson ? await response.json() : undefined;

    if (!response.ok) {
      const error: ApiError = {
        status: response.status,
        message: typeof data?.message === "string" ? data.message : "Request failed",
        errors: typeof data?.errors === "object" ? data.errors : undefined,
      };
      throw new VoltAgentAPIError(error.message, error.status, error.errors);
    }

    return data as T;
  }

  public async sendRequest(path: string, init?: RequestInit): Promise<Response> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${this.baseUrl}${normalizedPath}`;
    const fetchOptions: RequestInit = {
      method: "GET",
      ...init,
      headers: {
        ...this.headers,
        ...(init?.headers ?? {}),
      },
    };

    return await this.fetchWithTimeout(url, fetchOptions);
  }

  private async createEvalRun(payload: CreateEvalRunRequest = {}): Promise<EvalRunSummary> {
    return await this.request<EvalRunSummary>("/evals/runs", {
      method: "POST",
      body: safeStringify(payload),
    });
  }

  private async appendEvalResults(
    runId: string,
    payload: AppendEvalRunResultsRequest,
  ): Promise<EvalRunSummary> {
    return await this.request<EvalRunSummary>(`/evals/runs/${runId}/results`, {
      method: "POST",
      body: safeStringify(payload),
    });
  }

  private async completeEvalRun(
    runId: string,
    payload: CompleteEvalRunRequest,
  ): Promise<EvalRunSummary> {
    return await this.request<EvalRunSummary>(`/evals/runs/${runId}/complete`, {
      method: "POST",
      body: safeStringify(payload),
    });
  }

  private async failEvalRun(runId: string, payload: FailEvalRunRequest): Promise<EvalRunSummary> {
    return await this.request<EvalRunSummary>(`/evals/runs/${runId}/fail`, {
      method: "POST",
      body: safeStringify(payload),
    });
  }

  private async createEvalScorer(payload: CreateEvalScorerRequest): Promise<EvalScorerSummary> {
    return await this.request<EvalScorerSummary>("/evals/scorers", {
      method: "POST",
      body: safeStringify(payload),
    });
  }

  private async getEvalDataset(datasetId: string): Promise<EvalDatasetDetail | null> {
    return await this.request<EvalDatasetDetail | null>(`/evals/datasets/${datasetId}`);
  }

  private async listEvalDatasets(name?: string): Promise<EvalDatasetSummary[]> {
    const params = new URLSearchParams();
    if (name && name.trim().length > 0) {
      params.set("name", name.trim());
    }

    const query = params.size > 0 ? `?${params.toString()}` : "";

    return await this.request<EvalDatasetSummary[]>(`/evals/datasets${query}`);
  }

  private async listEvalDatasetItems(
    datasetId: string,
    versionId: string,
    options?: ListEvalDatasetItemsOptions,
  ): Promise<EvalDatasetItemsResponse> {
    const params = new URLSearchParams();

    if (options?.limit !== undefined) {
      params.set("limit", String(options.limit));
    }

    if (options?.offset !== undefined) {
      params.set("offset", String(options.offset));
    }

    if (options?.search) {
      params.set("search", options.search);
    }

    const query = params.size > 0 ? `?${params.toString()}` : "";

    return await this.request<EvalDatasetItemsResponse>(
      `/evals/datasets/${datasetId}/versions/${versionId}/items${query}`,
    );
  }

  private async getLatestDatasetVersionId(datasetId: string): Promise<string | null> {
    const detail = await this.getEvalDataset(datasetId);
    const latest = detail?.versions?.[0];
    return latest?.id ?? null;
  }

  private async listEvalExperiments(
    options: ListEvalExperimentsOptions = {},
  ): Promise<EvalExperimentSummary[]> {
    const params = new URLSearchParams();

    if (options.projectId) {
      params.set("projectId", options.projectId);
    }
    if (options.datasetId) {
      params.set("datasetId", options.datasetId);
    }
    if (options.targetType) {
      params.set("targetType", options.targetType);
    }
    if (options.search && options.search.trim().length > 0) {
      params.set("search", options.search.trim());
    }
    if (options.limit !== undefined) {
      params.set("limit", String(options.limit));
    }

    const query = params.size > 0 ? `?${params.toString()}` : "";

    return await this.request<EvalExperimentSummary[]>(`/evals/experiments${query}`);
  }

  private async getEvalExperiment(
    experimentId: string,
    options: { projectId?: string } = {},
  ): Promise<EvalExperimentDetail | null> {
    const params = new URLSearchParams();
    if (options.projectId) {
      params.set("projectId", options.projectId);
    }
    const query = params.size > 0 ? `?${params.toString()}` : "";

    return await this.request<EvalExperimentDetail | null>(
      `/evals/experiments/${experimentId}${query}`,
    );
  }

  private async createEvalExperiment(
    payload: CreateEvalExperimentRequest,
  ): Promise<EvalExperimentSummary> {
    return await this.request<EvalExperimentSummary>("/evals/experiments", {
      method: "POST",
      body: safeStringify(payload),
    });
  }
}
