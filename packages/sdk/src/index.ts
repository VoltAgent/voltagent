import { VoltOpsClient as CoreVoltOpsClient } from "@voltagent/core";

export { VoltAgentCoreAPI } from "./client";

export class VoltOpsClient extends CoreVoltOpsClient {}
export { VoltOpsRestClient } from "./evals";
export { VoltAgentObservabilitySDK } from "./observability";
export { VoltOpsActionsClient } from "@voltagent/core";
export type {
  VoltAgentClientOptions,
  ApiError,
  EvalRunStatus,
  TerminalEvalRunStatus,
  EvalResultStatus,
  CreateEvalRunRequest,
  AppendEvalRunResultsRequest,
  AppendEvalRunResultPayload,
  EvalRunResultScorePayload,
  CompleteEvalRunRequest,
  FailEvalRunRequest,
  EvalRunSummary,
  EvalRunCompletionSummaryPayload,
  EvalRunErrorPayload,
  EvalDatasetDetail,
  EvalDatasetSummary,
  EvalDatasetItemSummary,
  EvalDatasetItemsResponse,
  EvalDatasetVersionSummary,
  ListEvalDatasetItemsOptions,
  ListEvalExperimentsOptions,
  CreateEvalExperimentRequest,
  EvalExperimentSummary,
  EvalExperimentDetail,
  ResolveExperimentIdOptions,
  ResolveExperimentIdResult,
} from "./types";
export type {
  VoltOpsActionExecutionResult,
  VoltOpsAirtableCreateRecordParams,
} from "@voltagent/core";
