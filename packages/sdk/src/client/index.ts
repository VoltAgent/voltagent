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

export class VoltAgentCoreAPI {
  private readonly baseUrl: string;
  private readonly headers: HeadersInit;
  private readonly timeout: number;

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

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

  async createEvalRun(payload: CreateEvalRunRequest = {}): Promise<EvalRunSummary> {
    return await this.request<EvalRunSummary>("/evals/runs", {
      method: "POST",
      body: safeStringify(payload),
    });
  }

  async appendEvalResults(
    runId: string,
    payload: AppendEvalRunResultsRequest,
  ): Promise<EvalRunSummary> {
    return await this.request<EvalRunSummary>(`/evals/runs/${runId}/results`, {
      method: "POST",
      body: safeStringify(payload),
    });
  }

  async completeEvalRun(runId: string, payload: CompleteEvalRunRequest): Promise<EvalRunSummary> {
    return await this.request<EvalRunSummary>(`/evals/runs/${runId}/complete`, {
      method: "POST",
      body: safeStringify(payload),
    });
  }

  async failEvalRun(runId: string, payload: FailEvalRunRequest): Promise<EvalRunSummary> {
    return await this.request<EvalRunSummary>(`/evals/runs/${runId}/fail`, {
      method: "POST",
      body: safeStringify(payload),
    });
  }

  async createEvalScorer(payload: CreateEvalScorerRequest): Promise<EvalScorerSummary> {
    return await this.request<EvalScorerSummary>("/evals/scorers", {
      method: "POST",
      body: safeStringify(payload),
    });
  }

  async getEvalDataset(datasetId: string): Promise<EvalDatasetDetail | null> {
    return await this.request<EvalDatasetDetail | null>(`/evals/datasets/${datasetId}`);
  }

  async listEvalDatasets(name?: string): Promise<EvalDatasetSummary[]> {
    const params = new URLSearchParams();
    if (name && name.trim().length > 0) {
      params.set("name", name.trim());
    }

    const query = params.size > 0 ? `?${params.toString()}` : "";

    return await this.request<EvalDatasetSummary[]>(`/evals/datasets${query}`);
  }

  async listEvalDatasetItems(
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

  async getLatestDatasetVersionId(datasetId: string): Promise<string | null> {
    const detail = await this.getEvalDataset(datasetId);
    const latest = detail?.versions?.[0];
    return latest?.id ?? null;
  }

  async listEvalExperiments(
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

  async getEvalExperiment(
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

  async createEvalExperiment(payload: CreateEvalExperimentRequest): Promise<EvalExperimentSummary> {
    return await this.request<EvalExperimentSummary>("/evals/experiments", {
      method: "POST",
      body: safeStringify(payload),
    });
  }
}
