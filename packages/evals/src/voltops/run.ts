import { safeStringify } from "@voltagent/internal/utils";
import type {
  AppendEvalRunResultsRequest,
  CompleteEvalRunRequest,
  CreateEvalRunRequest,
  FailEvalRunRequest,
  ResolveExperimentIdResult,
  VoltOpsRestClient,
} from "@voltagent/sdk";

import type {
  ExperimentConfig,
  ExperimentDatasetInfo,
  ExperimentItemResult,
  ExperimentSummary,
} from "../experiment/types.js";

type VoltOpsClientLike = Pick<
  VoltOpsRestClient,
  "createEvalRun" | "appendEvalResults" | "completeEvalRun" | "failEvalRun"
> &
  Partial<Pick<VoltOpsRestClient, "resolveExperimentId">>;

export interface VoltOpsRunManagerOptions<
  _ItemResult extends ExperimentItemResult = ExperimentItemResult,
> {
  client: VoltOpsClientLike;
  config: Readonly<ExperimentConfig<any, any, any>>;
  dataset?: ExperimentDatasetInfo;
}

interface AppendResultContext<ItemResult extends ExperimentItemResult = ExperimentItemResult> {
  item: ItemResult;
}

interface CompleteRunContext {
  summary: ExperimentSummary;
}

const DEFAULT_TRIGGER_SOURCE = "run-experiment";

export class VoltOpsRunManager<ItemResult extends ExperimentItemResult = ExperimentItemResult> {
  readonly #client: VoltOpsClientLike;
  readonly #config: Readonly<ExperimentConfig<any, any, any>>;
  #dataset: ExperimentDatasetInfo | undefined;
  #runId: string | undefined;
  #creatingRun: Promise<void> | undefined;
  #disabled = false;
  #experimentId: string | undefined;
  #experimentName: string | undefined;
  #experimentCreated = false;
  #experimentResolution: Promise<void> | undefined;
  #experimentResolved = false;
  #experimentAutoCreateAttempted = false;
  #experimentAutoCreateSupported = true;
  #experimentAutoCreateReason: string | undefined;

  constructor(options: VoltOpsRunManagerOptions<ItemResult>) {
    this.#client = options.client;
    this.#config = options.config;
    this.#dataset = options.dataset;

    if (this.#config.experiment?.id) {
      this.#experimentId = this.#config.experiment.id;
    }
    if (this.#config.experiment?.name) {
      this.#experimentName = this.#config.experiment.name.trim();
    }
  }

  get runId(): string | undefined {
    return this.#runId;
  }

  isEnabled(): boolean {
    return !this.#disabled;
  }

  setDataset(dataset: ExperimentDatasetInfo | undefined): void {
    if (!dataset) {
      return;
    }

    this.#dataset = mergeDatasetInfo(this.#dataset, dataset);
  }

  async prepare(): Promise<void> {
    await this.#ensureRunCreated();
  }

  async appendResult(context: AppendResultContext<ItemResult>): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    this.setDataset(extractDatasetInfoFromItem(context.item));
    await this.#ensureRunCreated();

    if (!this.#runId) {
      return;
    }

    const payload = createAppendPayload(context.item);
    const request: AppendEvalRunResultsRequest = {
      results: [payload],
    };

    await this.#client.appendEvalResults(this.#runId, request);
  }

  async complete(context: CompleteRunContext): Promise<void> {
    if (!this.#runId || !this.isEnabled()) {
      return;
    }

    const { summary } = context;
    const status = inferTerminalStatus(summary);
    const request: CompleteEvalRunRequest = {
      status,
      summary: mapSummary(summary),
    };

    await this.#client.completeEvalRun(this.#runId, request);
  }

  async fail(error: unknown): Promise<void> {
    if (!this.#runId || !this.isEnabled()) {
      return;
    }

    const request: FailEvalRunRequest = {
      error: serializeError(error),
    };

    await this.#client.failEvalRun(this.#runId, request);
  }

  getMetadata(): Record<string, unknown> | undefined {
    const experimentMetadata =
      this.#experimentId || this.#experimentName || this.#experimentAutoCreateAttempted
        ? {
            id: this.#experimentId ?? null,
            name: this.#experimentName ?? this.#config.experiment?.name ?? null,
            created: this.#experimentCreated,
            autoCreateAttempted: this.#experimentAutoCreateAttempted,
            autoCreateSupported: this.#experimentAutoCreateSupported,
            autoCreateReason: this.#experimentAutoCreateReason ?? null,
          }
        : undefined;

    if (!this.#runId && !experimentMetadata) {
      return undefined;
    }

    return {
      voltOps: {
        runId: this.#runId ?? null,
        experiment: experimentMetadata,
      },
    };
  }

  async #ensureRunCreated(): Promise<void> {
    if (this.#runId || this.#disabled) {
      return;
    }

    if (!this.#canCreateRun()) {
      return;
    }

    if (!this.#creatingRun) {
      this.#creatingRun = this.#createRun();
    }

    try {
      await this.#creatingRun;
    } finally {
      this.#creatingRun = undefined;
    }
  }

  async #createRun(): Promise<void> {
    const dataset = this.#dataset;
    if (!dataset?.versionId) {
      this.#disabled = true;
      return;
    }

    await this.#ensureExperimentResolved();

    const payload: CreateEvalRunRequest = {
      datasetVersionId: dataset.versionId,
      experimentId: this.#experimentId,
      triggerSource: this.#config.voltOps?.triggerSource ?? DEFAULT_TRIGGER_SOURCE,
    };

    try {
      const summary = await this.#client.createEvalRun(payload);
      this.#runId = summary.id;
    } catch (error) {
      this.#disabled = true;
      throw error;
    }
  }

  async #ensureExperimentResolved(): Promise<void> {
    if (this.#experimentResolved) {
      return;
    }

    if (this.#experimentResolution) {
      await this.#experimentResolution;
      return;
    }

    const binding = this.#config.experiment;
    if (!binding) {
      this.#experimentResolved = true;
      return;
    }

    if (binding.id) {
      this.#experimentId = binding.id;
      this.#experimentName = binding.name?.trim() ?? this.#experimentName;
      this.#experimentResolved = true;
      return;
    }

    const experimentName = binding.name?.trim();
    if (!experimentName) {
      this.#experimentResolved = true;
      return;
    }

    const resolver = this.#client.resolveExperimentId?.bind(this.#client);
    if (!resolver) {
      if (binding.autoCreate) {
        this.#experimentAutoCreateAttempted = true;
        this.#experimentAutoCreateSupported = false;
        this.#experimentAutoCreateReason = "VoltOps client does not support experiment auto-create";
      }
    } else {
      this.#experimentAutoCreateSupported = true;
      this.#experimentResolution = (async () => {
        try {
          const resolution: ResolveExperimentIdResult | null = await resolver({
            experimentName,
            autoCreate: binding.autoCreate ?? false,
            datasetId: this.#dataset?.id ?? null,
            datasetVersionId: this.#dataset?.versionId ?? null,
            description: this.#config.description ?? null,
            tags: this.#config.voltOps?.tags ? Array.from(this.#config.voltOps.tags) : null,
            metadata: this.#config.metadata ?? null,
            projectId: undefined,
            enabled: true,
          });

          if (resolution) {
            this.#experimentId = resolution.experimentId;
            this.#experimentName = resolution.name ?? experimentName;
            this.#experimentCreated = Boolean(resolution.created);
            if (binding.autoCreate) {
              this.#experimentAutoCreateAttempted = true;
              this.#experimentAutoCreateSupported = true;
            }
          } else if (binding.autoCreate) {
            this.#experimentAutoCreateAttempted = true;
            this.#experimentAutoCreateReason = "Experiment not found";
          }
        } catch (error) {
          if (binding.autoCreate) {
            this.#experimentAutoCreateAttempted = true;
            this.#experimentAutoCreateReason =
              error instanceof Error ? error.message : "Failed to resolve experiment";
          }
        } finally {
          this.#experimentResolution = undefined;
          this.#experimentResolved = true;
        }
      })();

      await this.#experimentResolution;
      return;
    }

    this.#experimentName = experimentName;
    this.#experimentResolved = true;
  }

  #canCreateRun(): boolean {
    if (this.#disabled || this.#runId) {
      return false;
    }

    if (this.#config.voltOps?.autoCreateRun === false) {
      this.#disabled = true;
      return false;
    }

    return Boolean(this.#dataset?.versionId);
  }
}

export function createVoltOpsRunManager<
  ItemResult extends ExperimentItemResult = ExperimentItemResult,
>(options: VoltOpsRunManagerOptions<ItemResult>): VoltOpsRunManager<ItemResult> | undefined {
  const client = options.client;
  if (!isVoltOpsClient(client)) {
    return undefined;
  }

  return new VoltOpsRunManager<ItemResult>({
    client,
    config: options.config,
    dataset: options.dataset,
  });
}

function isVoltOpsClient(value: unknown): value is VoltOpsClientLike {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.createEvalRun === "function" &&
    typeof record.appendEvalResults === "function" &&
    typeof record.completeEvalRun === "function" &&
    typeof record.failEvalRun === "function"
  );
}

function mergeDatasetInfo(
  base: ExperimentDatasetInfo | undefined,
  extra: ExperimentDatasetInfo | undefined,
): ExperimentDatasetInfo | undefined {
  if (!base) {
    return extra ? { ...extra } : undefined;
  }

  if (!extra) {
    return base;
  }

  return {
    id: extra.id ?? base.id,
    versionId: extra.versionId ?? base.versionId,
    name: extra.name ?? base.name,
    description: extra.description ?? base.description,
    metadata: extra.metadata ?? base.metadata ?? null,
  };
}

function extractDatasetInfoFromItem(
  result: ExperimentItemResult,
): ExperimentDatasetInfo | undefined {
  const item = result.item;
  if (!item) {
    return undefined;
  }

  const datasetId = item.datasetId;
  const datasetVersionId = item.datasetVersionId;
  const datasetName = item.datasetName ?? item.dataset?.name;

  if (!datasetId && !datasetVersionId && !datasetName) {
    return undefined;
  }

  return {
    id: datasetId,
    versionId: datasetVersionId,
    name: datasetName,
  };
}

function createAppendPayload(
  item: ExperimentItemResult,
): AppendEvalRunResultsRequest["results"][number] {
  const scores = Object.values(item.scores).map((score) => ({
    scorerId: score.id,
    score: score.score ?? null,
    threshold: score.threshold ?? null,
    thresholdPassed: score.thresholdPassed ?? null,
    metadata: score.metadata ?? null,
  }));

  const metadata = createResultMetadata(item);

  return {
    datasetItemId: item.itemId ?? null,
    datasetItemHash: String(item.itemId ?? item.index),
    datasetId: item.datasetId ?? null,
    datasetVersionId: item.datasetVersionId ?? null,
    datasetItemLabel: item.item?.label ?? null,
    status: item.status,
    input: item.item?.input,
    expected: item.item?.expected,
    output: item.runner.output,
    durationMs: item.runner.durationMs ?? null,
    thresholdPassed: item.thresholdPassed ?? null,
    metadata,
    scores,
    traceIds: item.runner.traceIds ?? null,
  };
}

function createResultMetadata(item: ExperimentItemResult): Record<string, unknown> | null {
  const metadata: Record<string, unknown> = {};

  if (item.runner.metadata && Object.keys(item.runner.metadata).length > 0) {
    metadata.runner = item.runner.metadata;
  }

  if (item.error) {
    metadata.error = serializeError(item.error);
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}

function inferTerminalStatus(summary: ExperimentSummary): CompleteEvalRunRequest["status"] {
  const hasErrors = summary.errorCount > 0;
  const hasFailures = summary.failureCount > 0;
  const criteriaEvaluations = summary.criteria ?? [];
  const passedAllCriteria =
    criteriaEvaluations.length === 0 || criteriaEvaluations.every((entry) => entry.passed);

  if (hasErrors || hasFailures || !passedAllCriteria) {
    return "failed";
  }

  return "succeeded";
}

function mapSummary(summary: ExperimentSummary): CompleteEvalRunRequest["summary"] {
  return {
    itemCount: summary.totalCount,
    successCount: summary.successCount,
    failureCount: summary.failureCount,
    meanScore: summary.meanScore ?? null,
    passRate: summary.passRate ?? null,
    durationMs: summary.durationMs ?? null,
    metadata: {
      criteria: summary.criteria,
      scorers: summary.scorers,
    },
  };
}

function serializeError(error: unknown): { message: string; name?: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  let message: string;

  if (typeof error === "string") {
    message = error;
  } else if (typeof error === "object") {
    try {
      message = safeStringify(error);
    } catch {
      message = String(error);
    }
  } else {
    message = String(error);
  }

  return {
    message,
  };
}

export type { VoltOpsClientLike };
