import { safeStringify } from "@voltagent/internal/utils";

export const TOOL_APPROVAL_OUTPUT_MARKER = "__voltagentToolApproval";

export type ToolApprovalOutputStatus = "requested" | "denied";

export type ToolApprovalOutputPayload = {
  status: ToolApprovalOutputStatus;
  approvalId: string;
  toolCallId: string;
  toolName: string;
  input?: Record<string, unknown>;
  reason?: string;
};

export type ToolApprovalOutputEnvelope = {
  [TOOL_APPROVAL_OUTPUT_MARKER]: ToolApprovalOutputPayload;
};

export function createToolApprovalOutput(
  payload: ToolApprovalOutputPayload,
): ToolApprovalOutputEnvelope {
  return {
    [TOOL_APPROVAL_OUTPUT_MARKER]: payload,
  };
}

export function extractToolApprovalOutput(value: unknown): ToolApprovalOutputPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const jsonWrappedValue = value as Record<string, unknown>;
  if (
    jsonWrappedValue.type === "json" &&
    "value" in jsonWrappedValue &&
    jsonWrappedValue.value !== value
  ) {
    return extractToolApprovalOutput(jsonWrappedValue.value);
  }

  const markerValue = (value as Record<string, unknown>)[TOOL_APPROVAL_OUTPUT_MARKER];
  if (!markerValue || typeof markerValue !== "object") {
    return null;
  }

  const payload = markerValue as Record<string, unknown>;
  const status = payload.status;
  const approvalId = payload.approvalId;
  const toolCallId = payload.toolCallId;
  const toolName = payload.toolName;

  if (
    (status !== "requested" && status !== "denied") ||
    typeof approvalId !== "string" ||
    approvalId.trim().length === 0 ||
    typeof toolCallId !== "string" ||
    toolCallId.trim().length === 0 ||
    typeof toolName !== "string" ||
    toolName.trim().length === 0
  ) {
    return null;
  }

  const inputValue = payload.input;
  const input =
    inputValue && typeof inputValue === "object" && !Array.isArray(inputValue)
      ? (inputValue as Record<string, unknown>)
      : undefined;

  const reason =
    typeof payload.reason === "string" && payload.reason.trim().length > 0
      ? payload.reason
      : undefined;

  return {
    status,
    approvalId,
    toolCallId,
    toolName,
    input,
    reason,
  };
}

export function createToolApprovalFingerprint(
  toolName: string,
  args: Record<string, unknown>,
): string {
  return `${toolName.trim().toLowerCase()}::${safeStringify(args)}`;
}
