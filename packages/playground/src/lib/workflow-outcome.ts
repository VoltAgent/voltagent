import type { StreamEvent, WorkflowState } from "./api";

function errorMessage(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "message" in value && typeof value.message === "string")
    return value.message;
}

export function workflowOutcome(events: StreamEvent[], state?: WorkflowState) {
  const recent = [...events].reverse();
  const failure = recent.find((event) => event.type === "workflow-error" || event.type === "error");
  const terminal = recent.find((event) =>
    ["workflow-result", "workflow-complete", "resume", "replay"].includes(event.type),
  );
  return {
    error: errorMessage(failure?.error) ?? errorMessage(state?.metadata?.errorMessage),
    result:
      state?.status === "completed" && "output" in state
        ? state.output
        : terminal && "result" in terminal
          ? terminal.result
          : terminal?.output,
  };
}
