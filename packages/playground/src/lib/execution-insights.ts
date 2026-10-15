import type { Span, Trace } from "./api";
import { type PendingAction, actionText } from "./pending-action";
import { spanValue } from "./span-details";
import { spanLabel, spanStatus, statusLabels, traceRoot } from "./trace-presentation";

export interface Recovery {
  failed: Span[];
  succeeded: Span;
  kind: "Retry" | "Fallback";
}

/** Match attempts within the same invocation, never unrelated agents or later tool calls. */
export function recoveries(trace: Trace): Recovery[] {
  const result: Recovery[] = [];
  const groups = new Map<string, Span[]>();
  for (const span of trace.spans) {
    const provider = span.attributes["llm.provider_attempt"] === true;
    const retryStep = span.attributes["workflow.step.retry.count"] !== undefined;
    if ((!provider && !retryStep) || !span.parentSpanId) continue;
    const key = `${span.traceId}/${span.parentSpanId}/${provider ? "model" : span.attributes["workflow.step.id"]}`;
    groups.set(key, [...(groups.get(key) ?? []), span]);
  }
  for (const spans of groups.values()) {
    let failed: Span[] = [];
    for (const span of spans.sort((a, b) => a.startTime.localeCompare(b.startTime))) {
      if (spanStatus(span) === "error") failed.push(span);
      else if (spanStatus(span) === "success") {
        if (failed.length) {
          const fallback = failed.some(
            (item) => item.attributes["llm.model_index"] !== span.attributes["llm.model_index"],
          );
          const retried =
            Number(span.attributes["llm.attempt"] ?? span.attributes["workflow.step.retry.count"]) >
            Number(
              failed[0].attributes["llm.attempt"] ??
                failed[0].attributes["workflow.step.retry.count"],
            );
          if (fallback || retried)
            result.push({ failed, succeeded: span, kind: fallback ? "Fallback" : "Retry" });
        }
        failed = [];
      } else failed = [];
    }
  }
  return result;
}

export function recoveryText(recovery: Recovery): string {
  const model = recovery.succeeded.attributes["llm.model"];
  return `${recovery.kind} succeeded${model ? ` with ${model}` : ""} after ${recovery.failed.length} failed ${recovery.failed.length === 1 ? "attempt" : "attempts"}`;
}

/** A persisted paused step is evidence of the checkpoint, not an active resume action. */
export function isCancelledCheckpoint(span: Span, trace?: Trace): boolean {
  const root = trace && traceRoot(trace);
  return Boolean(
    root &&
      span.traceId === root.traceId &&
      span.spanId !== root.spanId &&
      spanStatus(root) === "cancelled" &&
      spanStatus(span) === "suspended",
  );
}

export function displaySpanStatus(span: Span, trace?: Trace): string {
  return isCancelledCheckpoint(span, trace) ? "Paused checkpoint" : statusLabels[spanStatus(span)];
}

export function spanExplanations(span: Span, trace?: Trace): string[] {
  const a = span.attributes;
  const notes: string[] = [];
  const cancelledCheckpoint = isCancelledCheckpoint(span, trace);
  if (cancelledCheckpoint)
    notes.push("Saved checkpoint; this workflow was cancelled and is no longer waiting to resume.");
  if (a["tool.input.rejected"] === true)
    notes.push("Input validation failed before execution. The tool did not run.");
  if (a["playground.execution_status"] === "cancelled")
    notes.push("Cancelled after suspension. Earlier step statuses describe the saved checkpoint.");
  if (typeof a["workflow.step.loop_iteration"] === "number")
    notes.push(`Loop iteration ${a["workflow.step.loop_iteration"] + 1}`);
  if (a["workflow.step.foreach"] === true && typeof a["workflow.step.parallel_index"] === "number")
    notes.push(`Item ${a["workflow.step.parallel_index"] + 1}`);
  const pending = a["playground.pending_action"] as PendingAction | undefined;
  if (pending) notes.push(actionText(pending));
  const skipped = spanValue(span, "workflow.step.skipped_reason");
  if (skipped !== undefined) notes.push(`Skipped: ${skipped}`);
  const suspended = spanValue(span, "workflow.suspension.reason", "workflow.suspend.reason");
  if (suspended !== undefined)
    notes.push(`${cancelledCheckpoint ? "Checkpoint reason" : "Waiting to resume"}: ${suspended}`);
  if (a["workflow.bailed"] === true || a["workflow.step.bailed"] === true || a.bailed === true)
    notes.push(
      `Ended early (bail)${a["workflow.bailed.step.name"] ? ` at ${a["workflow.bailed.step.name"]}` : ""}. Subsequent steps did not run.`,
    );
  if (a["guardrail.action"] !== undefined)
    notes.push(
      `Guardrail: ${a["guardrail.action"]}${a["guardrail.reason"] || a["guardrail.message"] ? ` · ${a["guardrail.reason"] ?? a["guardrail.message"]}` : ""}`,
    );
  if (a["agent.summary.updated"] === true)
    notes.push("Conversation summary updated. Inspect Summary text and retained messages.");
  if (a["memory.message_count"] !== undefined)
    notes.push(
      `${a["memory.message_count"]} memory messages · ${a["memory.operation"] ?? "recorded"}`,
    );
  if (a["retriever.results.count"] !== undefined)
    notes.push(
      `${a["retriever.results.count"]} retrieval results. Inspect Output for the returned context.`,
    );
  if (a["workspace.fs.path"] !== undefined)
    notes.push(`${a["workspace.operation"] ?? "Workspace operation"}: ${a["workspace.fs.path"]}`);
  const before = spanValue(span, "agent.workingMemory.content", "memory.working.previous_content");
  const after = spanValue(span, "agent.workingMemory.finalContent", "memory.working.content");
  if (before !== undefined && after !== undefined && before !== after)
    notes.push("Working memory changed. Inspect the before / after comparison.");
  if (trace) {
    for (const recovery of recoveries(trace)) {
      if (recovery.succeeded.spanId === span.spanId) notes.push(recoveryText(recovery));
      else if (recovery.failed.some((item) => item.spanId === span.spanId))
        notes.push(
          `Recovered by ${spanLabel(recovery.succeeded, trace.spans)} (${recovery.kind.toLowerCase()}). This attempt failed; the later attempt succeeded.`,
        );
    }
    if (isRaceWinner(span, trace))
      notes.push("Won the race. The workflow continued with this result.");
  }
  return notes;
}

export function descendantIds(spans: Span[], parentId: string): Set<string> {
  const ids = new Set<string>();
  const children = new Map<string, string[]>();
  for (const span of spans)
    if (span.parentSpanId)
      children.set(span.parentSpanId, [...(children.get(span.parentSpanId) ?? []), span.spanId]);
  const queue = [...(children.get(parentId) ?? [])];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (id === parentId || ids.has(id)) continue;
    ids.add(id);
    queue.push(...(children.get(id) ?? []));
  }
  return ids;
}

/** Only identify a winner when the recorded race siblings disambiguate it. */
export function isRaceWinner(span: Span, trace: Trace): boolean {
  const parent = trace.spans.find((item) => item.spanId === span.parentSpanId);
  return Boolean(
    parent?.attributes["workflow.step.type"] === "parallel-race" &&
      span.endTime &&
      spanStatus(span) === "success" &&
      parent.endTime &&
      Date.parse(span.endTime) <= Date.parse(parent.endTime) &&
      !trace.spans.some(
        (item) =>
          item.spanId !== span.spanId &&
          item.parentSpanId === parent.spanId &&
          item.endTime &&
          ["success", "error"].includes(spanStatus(item)) &&
          Date.parse(item.endTime) <= Date.parse(span.endTime as string),
      ) &&
      trace.spans.some(
        (item) =>
          item.parentSpanId === parent.spanId &&
          item.attributes["workflow.step.skipped_reason"] === "Another step settled the race",
      ),
  );
}
