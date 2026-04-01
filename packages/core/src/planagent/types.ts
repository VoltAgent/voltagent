import type { FileData } from "../workspace/filesystem";

export type PlanAgentTodoStatus = "pending" | "in_progress" | "done";

export type PlanAgentTodoItem = {
  id: string;
  content: string;
  status: PlanAgentTodoStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type PlanAgentFileData = FileData;

export type PlanAgentState = {
  todos?: PlanAgentTodoItem[];
  files?: Record<string, PlanAgentFileData>;
};
