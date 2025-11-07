import { VoltAgentCoreAPI } from "../client";
import type {
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
  ResolveExperimentIdOptions,
  ResolveExperimentIdResult,
  VoltAgentClientOptions,
} from "../types";

export class VoltOpsRestClient {
  private readonly client: VoltAgentCoreAPI;
  public readonly evals: VoltAgentCoreAPI["evals"];

  constructor(options: VoltAgentClientOptions) {
    this.client = new VoltAgentCoreAPI(options);
    this.evals = this.client.evals;
  }

  async createEvalRun(payload: CreateEvalRunRequest = {}): Promise<EvalRunSummary> {
    return await this.client.evals.runs.create(payload);
  }

  async appendEvalResults(
    runId: string,
    payload: AppendEvalRunResultsRequest,
  ): Promise<EvalRunSummary> {
    return await this.client.evals.runs.appendResults(runId, payload);
  }

  async completeEvalRun(runId: string, payload: CompleteEvalRunRequest): Promise<EvalRunSummary> {
    return await this.client.evals.runs.complete(runId, payload);
  }

  async failEvalRun(runId: string, payload: FailEvalRunRequest): Promise<EvalRunSummary> {
    return await this.client.evals.runs.fail(runId, payload);
  }

  async createEvalScorer(payload: CreateEvalScorerRequest): Promise<EvalScorerSummary> {
    return await this.client.evals.scorers.create(payload);
  }

  async listDatasets(name?: string): Promise<EvalDatasetSummary[]> {
    return await this.client.evals.datasets.list(name);
  }

  async getDataset(datasetId: string): Promise<EvalDatasetDetail | null> {
    return await this.client.evals.datasets.get(datasetId);
  }

  async getDatasetByName(name: string): Promise<EvalDatasetDetail | null> {
    const datasets = await this.listDatasets(name);
    const match = datasets.find((dataset) => dataset.name === name);
    if (!match) {
      return null;
    }
    return await this.getDataset(match.id);
  }

  async listDatasetItems(
    datasetId: string,
    versionId: string,
    options?: ListEvalDatasetItemsOptions,
  ): Promise<EvalDatasetItemsResponse> {
    return await this.client.evals.datasets.listItems(datasetId, versionId, options);
  }

  async getLatestDatasetVersionId(datasetId: string): Promise<string | null> {
    return await this.client.evals.datasets.getLatestVersionId(datasetId);
  }

  async resolveDatasetVersionId(params: {
    datasetId?: string;
    datasetName?: string;
    datasetVersionId?: string;
  }): Promise<{ datasetId: string; datasetVersionId: string } | null> {
    const { datasetId, datasetName, datasetVersionId } = params;

    if (datasetId && datasetVersionId) {
      return { datasetId, datasetVersionId };
    }

    let resolvedDatasetId = datasetId ?? null;

    if (!resolvedDatasetId && datasetName) {
      const datasetDetail = await this.getDatasetByName(datasetName);
      if (!datasetDetail) {
        return null;
      }
      resolvedDatasetId = datasetDetail.id;
      if (datasetVersionId) {
        return { datasetId: resolvedDatasetId, datasetVersionId };
      }
      const latest = datasetDetail.versions?.[0];
      if (!latest) {
        return null;
      }
      return { datasetId: resolvedDatasetId, datasetVersionId: latest.id };
    }

    if (!resolvedDatasetId) {
      return null;
    }

    if (datasetVersionId) {
      return { datasetId: resolvedDatasetId, datasetVersionId };
    }

    const latestId = await this.getLatestDatasetVersionId(resolvedDatasetId);
    if (!latestId) {
      return null;
    }

    return { datasetId: resolvedDatasetId, datasetVersionId: latestId };
  }

  async listExperiments(
    options: ListEvalExperimentsOptions = {},
  ): Promise<EvalExperimentSummary[]> {
    return await this.client.evals.experiments.list(options);
  }

  async getExperiment(
    experimentId: string,
    options: { projectId?: string } = {},
  ): Promise<EvalExperimentDetail | null> {
    return await this.client.evals.experiments.get(experimentId, options);
  }

  async createExperiment(payload: CreateEvalExperimentRequest): Promise<EvalExperimentSummary> {
    return await this.client.evals.experiments.create(payload);
  }

  async resolveExperimentId(
    options: ResolveExperimentIdOptions,
  ): Promise<ResolveExperimentIdResult | null> {
    if (options.experimentId) {
      const detail = await this.getExperiment(options.experimentId, {
        projectId: options.projectId,
      });
      return {
        experimentId: options.experimentId,
        name: detail?.name ?? options.experimentName ?? null,
        created: false,
      };
    }

    const name = options.experimentName?.trim();
    if (!name) {
      return null;
    }

    const searchResults = await this.listExperiments({
      projectId: options.projectId,
      datasetId: options.datasetId ?? undefined,
      search: name,
      limit: 50,
    });

    const match = searchResults.find(
      (experiment) => experiment.name.toLowerCase() === name.toLowerCase(),
    );

    if (match) {
      return {
        experimentId: match.id,
        name: match.name,
        created: false,
      };
    }

    if (!options.autoCreate) {
      return null;
    }

    const createPayload: CreateEvalExperimentRequest = {
      name,
      description: options.description ?? null,
      datasetId: options.datasetId ?? null,
      datasetVersionId: options.datasetVersionId ?? null,
      targetType: options.targetType,
      targetId: options.targetId ?? null,
      metadata: options.metadata ?? null,
      config: options.config ?? null,
      tags: options.tags ?? null,
      enabled: options.enabled ?? true,
    };

    const created = await this.createExperiment(createPayload);
    return {
      experimentId: created.id,
      name: created.name,
      created: true,
    };
  }

  get httpClient(): VoltAgentCoreAPI {
    return this.client;
  }
}
