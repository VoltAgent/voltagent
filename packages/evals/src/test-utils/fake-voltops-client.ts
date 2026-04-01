import type {
  AppendEvalRunResultsRequest,
  CompleteEvalRunRequest,
  CreateEvalRunRequest,
  EvalRunStatus,
  EvalRunSummary,
  FailEvalRunRequest,
} from "@voltagent/sdk";
import type { VoltOpsClientLike } from "../voltops/run.js";

export class FakeVoltOpsClient implements VoltOpsClientLike {
  readonly createCalls: CreateEvalRunRequest[] = [];
  readonly appendCalls: Array<{ runId: string; payload: AppendEvalRunResultsRequest }> = [];
  readonly completeCalls: Array<{ runId: string; payload: CompleteEvalRunRequest }> = [];
  readonly failCalls: Array<{ runId: string; payload: FailEvalRunRequest }> = [];
  private runCounter = 0;
  public readonly evals = {
    runs: {
      create: this.createEvalRun.bind(this),
      appendResults: this.appendEvalResults.bind(this),
      complete: this.completeEvalRun.bind(this),
      fail: this.failEvalRun.bind(this),
    },
  };

  async createEvalRun(payload: CreateEvalRunRequest = {}): Promise<EvalRunSummary> {
    this.createCalls.push(payload);
    this.runCounter += 1;
    return createRunSummary(`run-${this.runCounter}`, "running", payload.triggerSource ?? "test");
  }

  async appendEvalResults(
    runId: string,
    payload: AppendEvalRunResultsRequest,
  ): Promise<EvalRunSummary> {
    this.appendCalls.push({ runId, payload });
    return createRunSummary(runId, "running");
  }

  async completeEvalRun(runId: string, payload: CompleteEvalRunRequest): Promise<EvalRunSummary> {
    this.completeCalls.push({ runId, payload });
    return createRunSummary(runId, payload.status);
  }

  async failEvalRun(runId: string, payload: FailEvalRunRequest): Promise<EvalRunSummary> {
    this.failCalls.push({ runId, payload });
    return createRunSummary(runId, "failed");
  }
}

export function createRunSummary(
  id: string,
  status: EvalRunStatus,
  triggerSource = "test",
): EvalRunSummary {
  const timestamp = new Date().toISOString();
  return {
    id,
    status,
    triggerSource,
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
    startedAt: timestamp,
    completedAt: null,
    durationMs: null,
    tags: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
