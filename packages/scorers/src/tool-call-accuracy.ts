import {
  type AgentEvalToolCall,
  type AgentEvalToolResult,
  type BuilderScoreContext,
  type LocalScorerDefinition,
  buildScorer,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";

export interface ToolCallAccuracyPayload extends Record<string, unknown> {
  toolCalls?: AgentEvalToolCall[];
  toolResults?: AgentEvalToolResult[];
  messages?: unknown[];
  output?: unknown;
  rawOutput?: unknown;
}

export interface ToolCallAccuracyParams extends Record<string, unknown> {}

type ToolCallAccuracyScoreContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderScoreContext<Payload, Params>;

interface ResolvedToolCallAccuracyPayload {
  toolCalls?: AgentEvalToolCall[];
  toolResults?: AgentEvalToolResult[];
  messages?: unknown[];
  output?: unknown;
  rawOutput?: unknown;
}

interface ToolCallAccuracyEvaluation {
  score: number;
  actualTools: string[];
  expectedTool?: string;
  expectedToolOrder?: string[];
  strictMode: boolean;
  hasToolCalls: boolean;
  correctToolCalled: boolean;
  correctOrderCalled: boolean | null;
  mode: "single_tool" | "tool_order";
}

export interface ToolCallAccuracyScorerCodeOptions<
  Payload extends Record<string, unknown> = ToolCallAccuracyPayload,
  Params extends Record<string, unknown> = ToolCallAccuracyParams,
> {
  id?: string;
  name?: string;
  expectedTool?: string;
  expectedToolOrder?: string[];
  strictMode?: boolean;
  metadata?: Record<string, unknown> | null;
  buildPayload?: (
    context: ToolCallAccuracyScoreContext<Payload, Params>,
  ) => ResolvedToolCallAccuracyPayload;
}

export function createToolCallAccuracyScorerCode<
  Payload extends Record<string, unknown> = ToolCallAccuracyPayload,
  Params extends Record<string, unknown> = ToolCallAccuracyParams,
>({
  id = "toolCallAccuracyCode",
  name = "Tool Call Accuracy (Code)",
  expectedTool,
  expectedToolOrder,
  strictMode = false,
  metadata,
  buildPayload,
}: ToolCallAccuracyScorerCodeOptions<Payload, Params>): LocalScorerDefinition<Payload, Params> {
  const normalizedExpectedTool = normalizeToolName(expectedTool);
  const normalizedExpectedToolOrder = normalizeExpectedToolOrder(expectedToolOrder);

  if (!normalizedExpectedTool && normalizedExpectedToolOrder.length === 0) {
    throw new Error(
      "createToolCallAccuracyScorerCode requires either expectedTool or expectedToolOrder",
    );
  }

  const mode: ToolCallAccuracyEvaluation["mode"] =
    normalizedExpectedToolOrder.length > 0 ? "tool_order" : "single_tool";

  return buildScorer<Payload, Params>({
    id,
    label: name,
    metadata: mergeMetadata(metadata, {
      voltAgent: {
        scorer: id,
        category: "tool_call_accuracy",
        mode: "code",
      },
    }),
  })
    .score((context) => {
      const payload = resolvePayload(context, buildPayload);
      const actualTools = extractToolNames(payload);
      const hasToolCalls = actualTools.length > 0;

      let correctToolCalled = false;
      let correctOrderCalled: boolean | null = null;

      if (mode === "tool_order") {
        correctOrderCalled = checkToolOrder(actualTools, normalizedExpectedToolOrder, strictMode);
      } else if (normalizedExpectedTool) {
        correctToolCalled = strictMode
          ? actualTools.length === 1 && actualTools[0] === normalizedExpectedTool
          : actualTools.includes(normalizedExpectedTool);
      }

      const score =
        mode === "tool_order" ? (correctOrderCalled ? 1 : 0) : correctToolCalled ? 1 : 0;

      const evaluation: ToolCallAccuracyEvaluation = {
        score,
        actualTools,
        expectedTool: normalizedExpectedTool,
        expectedToolOrder:
          normalizedExpectedToolOrder.length > 0 ? normalizedExpectedToolOrder : undefined,
        strictMode,
        hasToolCalls,
        correctToolCalled,
        correctOrderCalled,
        mode,
      };

      context.results.raw.toolCallAccuracyEvaluation = evaluation;
      return score;
    })
    .reason(({ results }) => {
      const evaluation = results.raw.toolCallAccuracyEvaluation as ToolCallAccuracyEvaluation;
      if (!evaluation) {
        return { reason: "Tool call accuracy evaluation was not available." };
      }

      return {
        reason: buildReason(evaluation),
        metadata: {
          toolCallAccuracy: {
            mode: evaluation.mode,
            strictMode: evaluation.strictMode,
            hasToolCalls: evaluation.hasToolCalls,
            actualTools: evaluation.actualTools,
            expectedTool: evaluation.expectedTool,
            expectedToolOrder: evaluation.expectedToolOrder,
            correctToolCalled: evaluation.correctToolCalled,
            correctOrderCalled: evaluation.correctOrderCalled,
            score: evaluation.score,
          },
        },
      };
    })
    .build();
}

function resolvePayload<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(
  context: ToolCallAccuracyScoreContext<Payload, Params>,
  buildPayload?: (
    context: ToolCallAccuracyScoreContext<Payload, Params>,
  ) => ResolvedToolCallAccuracyPayload,
): ResolvedToolCallAccuracyPayload {
  if (buildPayload) {
    return buildPayload(context);
  }

  const payload = context.payload as ToolCallAccuracyPayload;
  return {
    toolCalls: payload.toolCalls,
    toolResults: payload.toolResults,
    messages: payload.messages,
    output: payload.output,
    rawOutput: payload.rawOutput,
  };
}

function extractToolNames(payload: ResolvedToolCallAccuracyPayload): string[] {
  const directToolCalls = extractToolNamesFromList(payload.toolCalls);
  if (directToolCalls.length > 0) {
    return directToolCalls;
  }

  const messageToolCalls = extractToolNamesFromMessages(payload.messages);
  if (messageToolCalls.length > 0) {
    return messageToolCalls;
  }

  const rawOutputToolCalls = extractToolNamesFromOutput(payload.rawOutput);
  if (rawOutputToolCalls.length > 0) {
    return rawOutputToolCalls;
  }

  return extractToolNamesFromOutput(payload.output);
}

function extractToolNamesFromOutput(value: unknown): string[] {
  if (Array.isArray(value)) {
    return extractToolNamesFromMessages(value);
  }

  if (!isPlainRecord(value)) {
    return [];
  }

  const fromToolCalls = extractToolNamesFromList(value.toolCalls);
  if (fromToolCalls.length > 0) {
    return fromToolCalls;
  }

  const fromMessages = extractToolNamesFromMessages(value.messages);
  if (fromMessages.length > 0) {
    return fromMessages;
  }

  if (Array.isArray(value.steps)) {
    const fromSteps = extractToolNamesFromMessages(value.steps);
    if (fromSteps.length > 0) {
      return fromSteps;
    }
  }

  return [];
}

function extractToolNamesFromMessages(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const toolNames: string[] = [];

  for (const message of value) {
    if (!isPlainRecord(message)) {
      continue;
    }

    const messageType = normalizeMessageType(message.type);
    if (messageType === "tool_call") {
      const directToolName = extractToolName(message);
      if (directToolName) {
        toolNames.push(directToolName);
      }
    }

    if (Array.isArray(message.toolInvocations)) {
      toolNames.push(...extractToolNamesFromList(message.toolInvocations));
    }

    if (Array.isArray(message.parts)) {
      toolNames.push(...extractToolNamesFromParts(message.parts));
    }

    if (isPlainRecord(message.content)) {
      if (Array.isArray(message.content.toolInvocations)) {
        toolNames.push(...extractToolNamesFromList(message.content.toolInvocations));
      }
      if (Array.isArray(message.content.parts)) {
        toolNames.push(...extractToolNamesFromParts(message.content.parts));
      }
    } else if (Array.isArray(message.content)) {
      toolNames.push(...extractToolNamesFromParts(message.content));
    }
  }

  return toolNames;
}

function extractToolNamesFromParts(parts: unknown[]): string[] {
  const toolNames: string[] = [];

  for (const part of parts) {
    if (!isPlainRecord(part)) {
      continue;
    }

    const partType = normalizeMessageType(part.type);
    if (partType !== "tool_call") {
      continue;
    }

    const toolName = extractToolName(part);
    if (toolName) {
      toolNames.push(toolName);
    }
  }

  return toolNames;
}

function extractToolNamesFromList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const toolNames: string[] = [];
  for (const entry of value) {
    const toolName = extractToolName(entry);
    if (toolName) {
      toolNames.push(toolName);
    }
  }
  return toolNames;
}

function extractToolName(value: unknown): string | undefined {
  if (typeof value === "string") {
    return normalizeToolName(value);
  }

  if (!isPlainRecord(value)) {
    return undefined;
  }

  if (typeof value.toolName === "string") {
    return normalizeToolName(value.toolName);
  }

  if (typeof value.name === "string") {
    return normalizeToolName(value.name);
  }

  if (isPlainRecord(value.payload)) {
    if (typeof value.payload.toolName === "string") {
      return normalizeToolName(value.payload.toolName);
    }
    if (typeof value.payload.name === "string") {
      return normalizeToolName(value.payload.name);
    }
  }

  if (typeof value.type === "string") {
    const normalizedType = normalizeMessageType(value.type);
    if (shouldExtractToolNameFromType(normalizedType)) {
      return normalizeToolTypeName(value.type);
    }
  }

  return undefined;
}

function shouldExtractToolNameFromType(normalizedType: string | undefined): boolean {
  if (!normalizedType) {
    return false;
  }

  if (!normalizedType.startsWith("tool")) {
    return false;
  }

  if (
    normalizedType === "tool" ||
    normalizedType === "tool_call" ||
    normalizedType === "tool_result"
  ) {
    return false;
  }

  const streamEventPrefixes = [
    "tool_input_",
    "tool_output_",
    "tool_call_",
    "tool_result_",
    "tool_invocation_",
    "tool_execution_",
  ];
  if (streamEventPrefixes.some((prefix) => normalizedType.startsWith(prefix))) {
    return false;
  }

  const streamEventSuffixes = ["_start", "_end", "_delta", "_chunk", "_done"];
  if (streamEventSuffixes.some((suffix) => normalizedType.endsWith(suffix))) {
    return false;
  }

  return normalizedType.startsWith("tool_");
}

function normalizeToolName(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed;
}

function normalizeExpectedToolOrder(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: string[] = [];
  for (const item of value) {
    const toolName = normalizeToolName(item);
    if (toolName) {
      normalized.push(toolName);
    }
  }

  return normalized;
}

function normalizeMessageType(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return value.toLowerCase().replace(/-/g, "_");
}

function normalizeToolTypeName(value: string): string | undefined {
  const normalized = value.toLowerCase();
  if (
    normalized.startsWith("tool-") &&
    normalized !== "tool-call" &&
    normalized !== "tool-result"
  ) {
    return normalizeToolName(value.slice(5));
  }
  if (
    normalized.startsWith("tool_") &&
    normalized !== "tool_call" &&
    normalized !== "tool_result"
  ) {
    return normalizeToolName(value.slice(5));
  }
  return undefined;
}

function checkToolOrder(
  actualTools: string[],
  expectedOrder: string[],
  strictMode: boolean,
): boolean {
  if (strictMode) {
    if (actualTools.length !== expectedOrder.length) {
      return false;
    }
    for (let i = 0; i < expectedOrder.length; i++) {
      if (actualTools[i] !== expectedOrder[i]) {
        return false;
      }
    }
    return true;
  }

  let searchIndex = 0;
  for (const expectedTool of expectedOrder) {
    const foundIndex = actualTools.indexOf(expectedTool, searchIndex);
    if (foundIndex === -1) {
      return false;
    }
    searchIndex = foundIndex + 1;
  }
  return true;
}

function buildReason(evaluation: ToolCallAccuracyEvaluation): string {
  const actualTools = safeStringify(evaluation.actualTools);

  if (evaluation.mode === "tool_order") {
    const expectedOrder = safeStringify(evaluation.expectedToolOrder ?? []);
    if (!evaluation.hasToolCalls) {
      return `No tool calls were made. Expected order: ${expectedOrder}.`;
    }

    if (evaluation.correctOrderCalled) {
      return `Tool calls matched expected order ${expectedOrder}. Actual tools: ${actualTools}.`;
    }

    return `Tool call order mismatch. Expected order ${expectedOrder}, actual tools ${actualTools}.`;
  }

  const expectedTool = evaluation.expectedTool ?? "";
  if (!evaluation.hasToolCalls) {
    return `No tool calls were made. Expected tool: "${expectedTool}".`;
  }

  if (evaluation.correctToolCalled) {
    return `Expected tool "${expectedTool}" was called. Actual tools: ${actualTools}.`;
  }

  return `Expected tool "${expectedTool}" was not called. Actual tools: ${actualTools}.`;
}

function isPlainRecord(value: unknown): value is Record<string, any> {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function mergeMetadata(
  base: Record<string, unknown> | null | undefined,
  additional: Record<string, unknown>,
): Record<string, unknown> {
  return { ...base, ...additional };
}
