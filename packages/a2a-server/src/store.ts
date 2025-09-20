import { randomUUID } from "node:crypto";
import type { TaskRecord, TaskStore } from "./types";

export class InMemoryTaskStore implements TaskStore {
  private readonly tasks = new Map<string, TaskRecord>();
  readonly activeCancellations = new Set<string>();

  async load(params: { agentId: string; taskId: string }): Promise<TaskRecord | null> {
    const key = this.makeKey(params.agentId, params.taskId);
    const record = this.tasks.get(key);
    return record ? structuredClone(record) : null;
  }

  async save(params: { agentId: string; data: TaskRecord }): Promise<void> {
    const taskId = params.data.id ?? randomUUID();
    const key = this.makeKey(params.agentId, taskId);
    this.tasks.set(key, structuredClone({ ...params.data, id: taskId }));
  }

  private makeKey(agentId: string, taskId: string): string {
    return `${agentId}::${taskId}`;
  }
}

export type MutableTaskStore = InMemoryTaskStore;
