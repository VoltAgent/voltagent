import type { Agent } from "../../agent/agent";
import type { OperationContext } from "../../agent/types";
import { loadPlanAgentState, updatePlanAgentState } from "../state";
import type { PlanAgentTodoItem } from "../types";

export type TodoBackend = {
  listTodos(): Promise<PlanAgentTodoItem[]>;
  setTodos(todos: PlanAgentTodoItem[]): Promise<void>;
};

export type TodoBackendFactory = (context: {
  agent: Agent;
  operationContext: OperationContext;
}) => TodoBackend;

export class ConversationTodoBackend implements TodoBackend {
  private agent: Agent;
  private operationContext: OperationContext;

  constructor(agent: Agent, operationContext: OperationContext) {
    this.agent = agent;
    this.operationContext = operationContext;
  }

  async listTodos(): Promise<PlanAgentTodoItem[]> {
    const state = await loadPlanAgentState(this.agent, this.operationContext);
    return state.todos || [];
  }

  async setTodos(todos: PlanAgentTodoItem[]): Promise<void> {
    await updatePlanAgentState(this.agent, this.operationContext, (state) => ({
      ...state,
      todos: todos,
    }));
  }
}
