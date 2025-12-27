import { deepClone, safeStringify } from "@voltagent/internal/utils";
import type { Agent } from "../agent/agent";
import type { OperationContext } from "../agent/types";
import type { PlanAgentState } from "./types";

const PLANAGENT_METADATA_KEY = "planagent";
const STATE_CACHE_KEY = Symbol("planagentState");

const fallbackState = new Map<string, PlanAgentState>();

function getConversationKey(context: OperationContext): string {
  return context.conversationId || context.operationId;
}

function readStateFromMetadata(
  metadata: Record<string, unknown> | undefined,
): PlanAgentState | null {
  if (!metadata) return null;
  const entry = metadata[PLANAGENT_METADATA_KEY];
  if (!entry || typeof entry !== "object") return null;
  return deepClone(entry as PlanAgentState);
}

export async function loadPlanAgentState(
  agent: Agent,
  context: OperationContext,
): Promise<PlanAgentState> {
  const cached = context.systemContext.get(STATE_CACHE_KEY) as PlanAgentState | undefined;
  if (cached) {
    return deepClone(cached);
  }

  let state: PlanAgentState | null = null;
  const memory = agent.getMemory();

  if (memory && context.conversationId) {
    try {
      const conversation = await memory.getConversation(context.conversationId);
      state = readStateFromMetadata(conversation?.metadata);
    } catch (error) {
      context.logger.debug("[PlanAgent] Failed to load state from memory", {
        error: safeStringify(error),
      });
    }
  }

  if (!state) {
    state = deepClone(fallbackState.get(getConversationKey(context)) || {});
  }

  context.systemContext.set(STATE_CACHE_KEY, state);
  return deepClone(state);
}

export async function updatePlanAgentState(
  agent: Agent,
  context: OperationContext,
  updater: (state: PlanAgentState) => PlanAgentState,
): Promise<PlanAgentState> {
  const current = await loadPlanAgentState(agent, context);
  const nextState = updater(deepClone(current));
  const normalized = nextState || {};

  context.systemContext.set(STATE_CACHE_KEY, normalized);
  fallbackState.set(getConversationKey(context), deepClone(normalized));

  const memory = agent.getMemory();
  if (memory && context.conversationId) {
    try {
      const conversation = await memory.getConversation(context.conversationId);
      if (conversation) {
        const metadata = {
          ...conversation.metadata,
          [PLANAGENT_METADATA_KEY]: deepClone(normalized),
        };
        await memory.updateConversation(context.conversationId, { metadata });
      }
    } catch (error) {
      context.logger.debug("[PlanAgent] Failed to persist state", {
        error: safeStringify(error),
      });
    }
  }

  return deepClone(normalized);
}
