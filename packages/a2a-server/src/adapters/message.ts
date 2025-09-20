import { randomUUID } from "node:crypto";
import type { A2AMessage } from "../types";

export interface VoltAgentMessage {
  role: "user" | "assistant";
  content: string;
}

export function toVoltAgentMessage(input: A2AMessage): VoltAgentMessage {
  const firstText = input.parts.find((part) => part.kind === "text");
  return {
    role: input.role === "agent" ? "assistant" : "user",
    content: firstText?.text ?? "",
  };
}

export function fromVoltAgentMessage(message: VoltAgentMessage): A2AMessage {
  return {
    kind: "message",
    role: message.role === "assistant" ? "agent" : "user",
    messageId: randomUUID(),
    parts: [{ kind: "text", text: message.content }],
  };
}
