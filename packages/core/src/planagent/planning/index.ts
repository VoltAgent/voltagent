import type { Span } from "@opentelemetry/api";
import { safeStringify } from "@voltagent/internal/utils";
import { z } from "zod";
import type { Agent } from "../../agent/agent";
import type { OperationContext } from "../../agent/types";
import { createTool } from "../../tool";
import { createToolkit } from "../../tool/toolkit";
import type { Toolkit } from "../../tool/toolkit";
import { randomUUID } from "../../utils/id";
import { PLAN_PROGRESS_CONTEXT_KEY } from "../context-keys";
import type { PlanAgentTodoItem, PlanAgentTodoStatus } from "../types";
import { ConversationTodoBackend, type TodoBackend, type TodoBackendFactory } from "./backend";

export const WRITE_TODOS_TOOL_NAME = "write_todos";
export const WRITE_TODOS_TOOL_DESCRIPTION =
  "Write or update the current todo list for the conversation";

const DEFAULT_PLANNING_PROMPT = [
  "Planning is required for any task that needs more than one action or any tool use.",
  "Before using any other tool or producing a long response, call write_todos with 4-8 concise steps.",
  "If the user explicitly asks for a plan, always call write_todos.",
  "Keep exactly one todo marked in_progress at a time and update the list after each step.",
  "Only mark todos done after completing the work; premature done updates are ignored.",
  "Revise the plan when new information changes the approach.",
  "If the task is truly single-step and needs no tools, you may skip planning.",
  "Examples that require planning: research, comparisons, multi-part asks, file operations.",
  "Examples that may skip planning: simple greetings, one-sentence definitions.",
  "Status values must be one of: pending, in_progress, done.",
].join("\n");

export type PlanningToolkitOptions = {
  backend?: TodoBackend | TodoBackendFactory;
  systemPrompt?: string | null;
};

const todoStatusSchema = z.enum(["pending", "in_progress", "done"]);

const todoItemSchema = z.object({
  id: z.string().optional(),
  content: z.string().min(1).describe("Short, actionable todo item"),
  status: todoStatusSchema.optional().default("pending"),
});

const writeTodosSchema = z.object({
  todos: z.array(todoItemSchema).describe("Full list of todos"),
});

function resolveBackend(
  backend: TodoBackend | TodoBackendFactory,
  agent: Agent,
  operationContext: OperationContext,
): TodoBackend {
  if (typeof backend === "function") {
    return backend({ agent, operationContext });
  }
  return backend;
}

function normalizeTodos(
  existing: PlanAgentTodoItem[],
  incoming: Array<{ id?: string; content: string; status?: PlanAgentTodoStatus }>,
): PlanAgentTodoItem[] {
  const now = new Date().toISOString();
  const existingById = new Map(existing.map((todo) => [todo.id, todo]));

  return incoming.map((todo) => {
    const id = todo.id || randomUUID();
    const previous = existingById.get(id);
    return {
      id,
      content: todo.content.trim(),
      status: todo.status ?? "pending",
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
  });
}

function enforceDoneTransitions(options: {
  existing: PlanAgentTodoItem[];
  incoming: PlanAgentTodoItem[];
  allowDoneTransitions: boolean;
}): { todos: PlanAgentTodoItem[]; blockedCount: number } {
  const { existing, incoming, allowDoneTransitions } = options;
  if (allowDoneTransitions || existing.length === 0) {
    return { todos: incoming, blockedCount: 0 };
  }

  const existingById = new Map(existing.map((todo) => [todo.id, todo]));
  let blockedCount = 0;

  const guarded = incoming.map((todo) => {
    if (todo.status !== "done") {
      return todo;
    }

    const previous = existingById.get(todo.id);
    if (previous?.status === "done") {
      return todo;
    }

    blockedCount += 1;
    return {
      ...todo,
      status: previous?.status ?? "pending",
    };
  });

  return { todos: guarded, blockedCount };
}

function buildTodoTraceSnapshot(todos: PlanAgentTodoItem[]) {
  const truncatedTodos = todos.slice(0, 20).map((todo) => ({
    id: todo.id,
    status: todo.status,
    content: todo.content.length > 200 ? `${todo.content.slice(0, 197)}...` : todo.content,
  }));

  return {
    todos: truncatedTodos,
    truncated: todos.length > truncatedTodos.length,
  };
}

export function createPlanningToolkit(agent: Agent, options: PlanningToolkitOptions = {}): Toolkit {
  const {
    backend = (context) => new ConversationTodoBackend(context.agent, context.operationContext),
  } = options;
  const systemPrompt =
    options.systemPrompt === undefined ? DEFAULT_PLANNING_PROMPT : options.systemPrompt;

  const tool = createTool({
    name: WRITE_TODOS_TOOL_NAME,
    description: WRITE_TODOS_TOOL_DESCRIPTION,
    parameters: writeTodosSchema,
    execute: async (args, executeOptions) => {
      const operationContext = executeOptions as OperationContext;
      const resolvedBackend = resolveBackend(backend, agent, operationContext);
      const existing = await resolvedBackend.listTodos();
      const normalized = normalizeTodos(existing, args.todos);
      const hadProgress = operationContext.systemContext.get(PLAN_PROGRESS_CONTEXT_KEY) === true;
      const { todos: guardedTodos, blockedCount } = enforceDoneTransitions({
        existing,
        incoming: normalized,
        allowDoneTransitions: hadProgress,
      });

      await resolvedBackend.setTodos(guardedTodos);
      operationContext.systemContext.set(PLAN_PROGRESS_CONTEXT_KEY, false);

      const toolSpan = operationContext.systemContext.get("parentToolSpan") as Span | undefined;
      if (toolSpan) {
        const pendingCount = guardedTodos.filter((todo) => todo.status === "pending").length;
        const inProgressCount = guardedTodos.filter((todo) => todo.status === "in_progress").length;
        const doneCount = guardedTodos.filter((todo) => todo.status === "done").length;
        const snapshot = buildTodoTraceSnapshot(guardedTodos);

        toolSpan.setAttribute("voltagent.label", "write_todos");
        toolSpan.setAttribute("planagent.todos.total", guardedTodos.length);
        toolSpan.setAttribute("planagent.todos.pending", pendingCount);
        toolSpan.setAttribute("planagent.todos.in_progress", inProgressCount);
        toolSpan.setAttribute("planagent.todos.done", doneCount);
        toolSpan.setAttribute("planagent.todos.truncated", snapshot.truncated);
        toolSpan.setAttribute("planagent.todos.blocked_done", blockedCount);
        toolSpan.setAttribute("planagent.todos", safeStringify(snapshot.todos));
      }

      return {
        todos: guardedTodos,
        note:
          blockedCount > 0
            ? "No progress since the last plan update; some todos were kept out of done."
            : undefined,
      };
    },
  });

  return createToolkit({
    name: "planagent_planning",
    description: "Planning tools for tracking todo lists",
    tools: [tool],
    instructions: systemPrompt || undefined,
    addInstructions: Boolean(systemPrompt),
  });
}

export type { PlanAgentTodoItem, PlanAgentTodoStatus };
export type { TodoBackend, TodoBackendFactory };
export { ConversationTodoBackend };
