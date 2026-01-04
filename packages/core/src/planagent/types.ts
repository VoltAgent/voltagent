export type PlanAgentTodoStatus = "pending" | "in_progress" | "done";

export type PlanAgentTodoItem = {
  id: string;
  content: string;
  status: PlanAgentTodoStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type PlanAgentFileData = {
  content: string[];
  created_at: string;
  modified_at: string;
};

export type PlanAgentState = {
  todos?: PlanAgentTodoItem[];
  files?: Record<string, PlanAgentFileData>;
};
