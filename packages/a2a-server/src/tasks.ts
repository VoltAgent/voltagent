import { randomUUID } from "node:crypto";
import {
  type A2AMessage,
  type TaskArtifact,
  type TaskRecord,
  type TaskState,
  type TaskStatus,
  VoltA2AError,
} from "./types";

export function createTaskRecord(params: {
  message: A2AMessage;
  contextId?: string;
  metadata?: Record<string, unknown>;
}): TaskRecord {
  const id = params.message.taskId ?? randomUUID();
  const contextId = params.contextId ?? params.message.contextId ?? randomUUID();

  return {
    id,
    contextId,
    history: [params.message],
    status: {
      state: "submitted",
      timestamp: new Date().toISOString(),
      message: undefined,
    },
    metadata: params.metadata,
  };
}

export function appendMessage(task: TaskRecord, message: A2AMessage): TaskRecord {
  return {
    ...task,
    history: [...task.history, message],
  };
}

export function updateLastMessage(task: TaskRecord, message: A2AMessage): TaskRecord {
  if (task.history.length === 0) {
    return {
      ...task,
      history: [structuredClone(message)],
    };
  }

  const nextHistory = [...task.history];
  nextHistory[nextHistory.length - 1] = structuredClone(message);

  return {
    ...task,
    history: nextHistory,
  };
}

export function transitionStatus(
  task: TaskRecord,
  next: Omit<TaskStatus, "timestamp">,
): TaskRecord {
  return {
    ...task,
    status: {
      ...task.status,
      ...next,
      timestamp: new Date().toISOString(),
    },
  };
}

export function ensureCancelable(task: TaskRecord): void {
  const finalStates: TaskState[] = ["completed", "failed", "canceled"];
  if (finalStates.includes(task.status.state)) {
    throw VoltA2AError.taskNotCancelable(task.id);
  }
}

export function upsertArtifact(
  task: TaskRecord,
  artifact: TaskArtifact,
  options?: { append?: boolean },
): TaskRecord {
  const existing = task.artifacts ?? [];
  const index = existing.findIndex((entry) => entry.name === artifact.name);
  const nextArtifacts = [...existing];

  if (index === -1) {
    nextArtifacts.push(structuredClone(artifact));
  } else if (options?.append) {
    const current = structuredClone(nextArtifacts[index]);
    current.parts = [...current.parts, ...artifact.parts];
    current.metadata = { ...(current.metadata ?? {}), ...(artifact.metadata ?? {}) };
    if (artifact.description) {
      current.description = artifact.description;
    }
    nextArtifacts[index] = current;
  } else {
    nextArtifacts[index] = structuredClone(artifact);
  }

  return {
    ...task,
    artifacts: nextArtifacts,
  };
}
