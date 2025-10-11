/**
 * VoltOps Module
 *
 * Unified client for telemetry export and prompt management functionality.
 * This module replaces the old telemetryExporter approach with a comprehensive solution.
 */

// Export main client class
export { VoltOpsClient } from "./client";

// Export all types
export type {
  VoltOpsClientOptions,
  VoltOpsClient as IVoltOpsClient,
  VoltOpsPromptManager,
  PromptReference,
  PromptHelper,
  PromptApiClient,
  PromptApiResponse,
  CachedPrompt,
  DynamicValueOptions,
  DynamicValue,
  VoltOpsEvalRunStatus,
  VoltOpsTerminalEvalRunStatus,
  VoltOpsEvalResultStatus,
  VoltOpsEvalRunSummary,
  VoltOpsCreateEvalRunRequest,
  VoltOpsEvalRunResultScorePayload,
  VoltOpsEvalRunResultLiveMetadata,
  VoltOpsAppendEvalRunResultPayload,
  VoltOpsAppendEvalRunResultsRequest,
  VoltOpsEvalRunCompletionSummaryPayload,
  VoltOpsEvalRunErrorPayload,
  VoltOpsCompleteEvalRunRequest,
  VoltOpsCreateScorerRequest,
  VoltOpsScorerSummary,
} from "./types";

// Export prompt manager implementation
export { VoltOpsPromptManagerImpl } from "./prompt-manager";

// Export API client implementation
export { VoltOpsPromptApiClient } from "./prompt-api-client";

// Export template engine
export { createSimpleTemplateEngine } from "./template-engine";

// Export factory function for backward compatibility
export { createVoltOpsClient } from "./client";

/**
 * Re-export for convenience - main entry point
 */
export { VoltOpsClient as default } from "./client";
