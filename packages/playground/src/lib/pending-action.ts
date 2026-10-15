import { type UIMessage, getToolName, isToolUIPart } from "ai";
import type { RunTarget, Trace } from "./api";
import { traceTarget } from "./run-context";
import { traceRoot } from "./trace-presentation";

export interface PendingAction {
  approval: string[];
  client: string[];
}
export interface ConversationAction extends RunTarget {
  agentId: string;
  pending?: PendingAction;
}

export function pendingAction(messages: UIMessage[]): PendingAction | undefined {
  const last = messages.at(-1);
  if (last?.role !== "assistant") return;
  const tools = last.parts.filter(isToolUIPart);
  const approval = tools.filter((part) => part.state === "approval-requested").map(getToolName);
  const client = tools.filter((part) => part.state === "input-available").map(getToolName);
  return approval.length || client.length ? { approval, client } : undefined;
}

export function conversationKey(action: ConversationAction): string {
  return [action.agentId, action.userId ?? "", action.conversationId ?? ""]
    .map(encodeURIComponent)
    .join("/");
}

/** Browser conversation state supplements telemetry; only its latest request can be waiting. */
export function withPendingActions(
  traces: Trace[],
  actions: Record<string, PendingAction>,
): Trace[] {
  const latest = new Map<string, Trace>();
  const keyFor = (trace: Trace) => {
    const root = traceRoot(trace);
    const target = traceTarget(trace);
    if (!target.conversationId || target.executionId || !root) return;
    return conversationKey({ ...target, agentId: String(root.attributes["entity.id"] ?? "") });
  };
  for (const trace of traces) {
    const key = keyFor(trace);
    if (!key) continue;
    const previous = latest.get(key);
    if (!previous || (traceRoot(trace)?.startTime ?? "") > (traceRoot(previous)?.startTime ?? ""))
      latest.set(key, trace);
  }
  return traces.map((trace) => {
    const key = keyFor(trace);
    const action = key && actions[key];
    const root = traceRoot(trace);
    if (!key || !action || latest.get(key) !== trace || !root?.endTime || root.status.code === 2)
      return trace;
    return {
      ...trace,
      spans: trace.spans.map((span) =>
        span === root
          ? {
              ...span,
              attributes: { ...span.attributes, "playground.pending_action": action },
            }
          : span,
      ),
    };
  });
}

export function actionText(action: PendingAction): string {
  return [
    action.approval.length ? `Approve or deny: ${action.approval.join(", ")}` : "",
    action.client.length ? `Provide a result or decline: ${action.client.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(". ");
}
