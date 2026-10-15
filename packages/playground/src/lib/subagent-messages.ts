import { record } from "./span-insights";

export interface SubagentOutput {
  id: string;
  name: string;
  text: string;
  reasoning: string;
  status: "streaming" | "completed" | "error" | "stopped";
  error?: string;
}

/** Agent ID disambiguates different agents with the same display name. */
export function subagentOutputs(parts: readonly unknown[], streaming: boolean): SubagentOutput[] {
  const groups = new Map<string, SubagentOutput>();
  const current = new Map<string, string>();
  const ended = new Set<string>();
  const attempts = new Map<string, number>();
  for (const value of parts) {
    const part = record(value);
    if (part?.type !== "data-subagent-stream") continue;
    const data = record(part.data);
    if (!data) continue;
    const name = String(data.subAgentName ?? "Subagent");
    const agentId = String(data.subAgentId ?? name);
    let id = current.get(agentId) ?? agentId;
    if (
      ended.has(id) &&
      ["start", "text-delta", "reasoning-delta"].includes(String(data.originalType))
    ) {
      const attempt = (attempts.get(agentId) ?? 1) + 1;
      attempts.set(agentId, attempt);
      id = `${agentId}/${attempt}`;
    }
    current.set(agentId, id);
    const group = groups.get(id) ?? {
      id,
      name,
      text: "",
      reasoning: "",
      status: streaming ? "streaming" : "stopped",
    };
    if (data.originalType === "text-delta")
      group.text += String(data.delta ?? data.textDelta ?? "");
    if (data.originalType === "reasoning-delta")
      group.reasoning += String(data.delta ?? data.textDelta ?? "");
    if (data.originalType === "finish") group.status = "completed";
    if (data.originalType === "error") {
      group.status = "error";
      group.error = String(data.errorText ?? data.error ?? "Subagent failed");
    }
    if (data.originalType === "abort") group.status = "stopped";
    if (["finish", "error", "abort"].includes(String(data.originalType))) ended.add(id);
    groups.set(id, group);
  }
  return [...groups.values()];
}
