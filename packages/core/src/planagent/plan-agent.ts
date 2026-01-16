import type { Span } from "@opentelemetry/api";
import type { Logger } from "@voltagent/internal";
import { safeStringify } from "@voltagent/internal/utils";
import type { StepResult, ToolSet, UIMessage } from "ai";
import { z } from "zod";
import { Agent } from "../agent/agent";
import { FORCED_TOOL_CHOICE_CONTEXT_KEY } from "../agent/context-keys";
import type { AgentHooks } from "../agent/hooks";
import { SubAgentManager } from "../agent/subagent";
import type { SubAgentConfig } from "../agent/subagent/types";
import type { AgentOptions, InstructionsDynamicValue, OperationContext } from "../agent/types";
import type { Tool, VercelTool } from "../tool";
import { createTool } from "../tool";
import type { Toolkit } from "../tool/toolkit";
import { createToolkit } from "../tool/toolkit";
import { randomUUID } from "../utils/id";
import type { PromptContent } from "../voltops/types";
import { PLAN_PROGRESS_CONTEXT_KEY, PLAN_WRITTEN_CONTEXT_KEY } from "./context-keys";
import {
  FILESYSTEM_SYSTEM_PROMPT,
  InMemoryFilesystemBackend,
  createFilesystemToolkit,
  createToolResultEvictor,
} from "./filesystem";
import type { FilesystemBackendContext, FilesystemToolkitOptions } from "./filesystem";
import { WRITE_TODOS_TOOL_NAME, createPlanningToolkit } from "./planning";
import type { PlanningToolkitOptions } from "./planning";
import { loadPlanAgentState } from "./state";
import type { PlanAgentState, PlanAgentTodoItem } from "./types";

const BASE_PROMPT =
  "In order to complete the objective that the user asks of you, you have access to a number of standard tools.";

const DEFAULT_SUBAGENT_PROMPT = BASE_PROMPT;

const DEFAULT_GENERAL_PURPOSE_DESCRIPTION =
  "General-purpose agent for researching complex questions, searching for files and content, and executing multi-step tasks. When you are searching for a keyword or file and are not confident that you will find the right match in the first few tries use this agent to perform the search for you. This agent has access to all tools as the main agent.";

const PLANNING_SYSTEM_MESSAGE = [
  "<planagent_planning>",
  "Use write_todos to plan any multi-step task or any tool usage.",
  "If the user asks for a plan, you must call write_todos.",
  "Before using any tool other than write_todos, call write_todos with a short plan.",
  "Keep exactly one todo in_progress at a time and update the list as you go.",
  "Only mark todos done after completing the work.",
  "</planagent_planning>",
].join("\n");

const TASK_SYSTEM_PROMPT = [
  "## `task` (subagent spawner)",
  "",
  "You have access to a `task` tool to launch short-lived subagents that handle isolated tasks. These agents are ephemeral - they live only for the duration of the task and return a single result.",
  "",
  "When to use the task tool:",
  "- When a task is complex and multi-step, and can be fully delegated in isolation",
  "- When a task is independent of other tasks and can run in parallel",
  "- When a task requires focused reasoning or heavy token/context usage that would bloat the orchestrator thread",
  "- When sandboxing improves reliability (e.g. code execution, structured searches, data formatting)",
  "- When you only care about the output of the subagent, and not the intermediate steps (ex. performing a lot of research and then returned a synthesized report, performing a series of computations or lookups to achieve a concise, relevant answer.)",
  "",
  "Subagent lifecycle:",
  "1. Spawn -> Provide clear role, instructions, and expected output",
  "2. Run -> The subagent completes the task autonomously",
  "3. Return -> The subagent provides a single structured result",
  "4. Reconcile -> Incorporate or synthesize the result into the main thread",
  "",
  "When NOT to use the task tool:",
  "- If you need to see the intermediate reasoning or steps after the subagent has completed (the task tool hides them)",
  "- If the task is trivial (a few tool calls or simple lookup)",
  "- If delegating does not reduce token usage, complexity, or context switching",
  "- If splitting would add latency without benefit",
  "",
  "## Important Task Tool Usage Notes to Remember",
  "- Whenever possible, parallelize the work that you do. This is true for both tool_calls, and for tasks. Whenever you have independent steps to complete - make tool_calls, or kick off tasks (subagents) in parallel to accomplish them faster. This saves time for the user, which is incredibly important.",
  "- Remember to use the `task` tool to silo independent tasks within a multi-part objective.",
  "- You should use the `task` tool whenever you have a complex task that will take multiple steps, and is independent from other tasks that the agent needs to complete. These agents are highly competent and efficient.",
].join("\n");

export type PlanAgentSubagentDefinition =
  | Agent
  | SubAgentConfig
  | (Omit<
      AgentOptions,
      "instructions" | "tools" | "toolkits" | "subAgents" | "supervisorConfig"
    > & {
      name: string;
      description?: string;
      systemPrompt: string;
      model?: AgentOptions["model"];
      tools?: (Tool<any, any> | Toolkit | VercelTool)[];
      toolkits?: Toolkit[];
    });

export type TaskToolOptions = {
  systemPrompt?: string | null;
  taskDescription?: string | null;
  maxSteps?: number;
};

export type PlanAgentOptions = Omit<
  AgentOptions,
  "instructions" | "tools" | "toolkits" | "subAgents" | "supervisorConfig"
> & {
  systemPrompt?: InstructionsDynamicValue;
  tools?: (Tool<any, any> | Toolkit | VercelTool)[];
  toolkits?: Toolkit[];
  subagents?: PlanAgentSubagentDefinition[];
  generalPurposeAgent?: boolean;
  planning?: PlanningToolkitOptions | false;
  summarization?: AgentOptions["summarization"];
  filesystem?: FilesystemToolkitOptions | false;
  task?: TaskToolOptions | false;
  extensions?: PlanAgentExtension[];
  toolResultEviction?: {
    enabled?: boolean;
    tokenLimit?: number;
  };
};

export type PlanAgentExtensionContext = {
  agentRef: () => Agent | undefined;
  options: PlanAgentOptions;
  planningEnabled: boolean;
};

export type PlanAgentExtensionResult = {
  systemPrompt?: string | null;
  hooks?: AgentHooks;
  tools?: (Tool<any, any> | Toolkit | VercelTool)[];
  toolkits?: Toolkit[] | ((agent: Agent) => Toolkit[]);
  subagents?: PlanAgentSubagentDefinition[];
  afterSubagents?: (options: {
    agent: Agent;
    subagents: Array<{ name: string; description: string; config: SubAgentConfig }>;
  }) => Toolkit | Toolkit[] | null;
};

export type PlanAgentExtension = {
  name: string;
  apply: (context: PlanAgentExtensionContext) => PlanAgentExtensionResult | null | undefined;
};

function buildBaseSystemPrompt(systemPrompt?: string | null): string {
  return systemPrompt ? `${systemPrompt}\n\n${BASE_PROMPT}` : BASE_PROMPT;
}

function appendExtensionPrompts(basePrompt: string, extensionPrompts: string[]): string {
  return extensionPrompts.length > 0 ? [basePrompt, ...extensionPrompts].join("\n\n") : basePrompt;
}

function isPromptContent(value: unknown): value is PromptContent {
  if (!value || typeof value !== "object") {
    return false;
  }
  const { type } = value as { type?: string };
  return type === "text" || type === "chat";
}

function mergeSystemPromptWithExtensions(
  resolved: string | PromptContent | null | undefined,
  extensionPrompts: string[],
): string | PromptContent {
  if (isPromptContent(resolved)) {
    if (resolved.type === "text") {
      const basePrompt = buildBaseSystemPrompt(resolved.text ?? "");
      const mergedPrompt = appendExtensionPrompts(basePrompt, extensionPrompts);
      return { ...resolved, text: mergedPrompt };
    }

    const messages = Array.isArray(resolved.messages) ? [...resolved.messages] : [];
    const extraSystemContent = appendExtensionPrompts(BASE_PROMPT, extensionPrompts);

    if (messages.length === 0) {
      messages.push({ role: "system", content: extraSystemContent });
      return { ...resolved, messages };
    }

    let lastSystemIndex = -1;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "system") {
        lastSystemIndex = i;
        break;
      }
    }

    if (lastSystemIndex >= 0) {
      const target = messages[lastSystemIndex];
      if (
        target?.role === "system" &&
        typeof target.content === "string" &&
        target.content.trim().length > 0
      ) {
        messages[lastSystemIndex] = {
          ...target,
          content: `${target.content}\n\n${extraSystemContent}`,
        };
      } else {
        messages.push({ role: "system", content: extraSystemContent });
      }
    } else {
      messages.push({ role: "system", content: extraSystemContent });
    }

    return { ...resolved, messages };
  }

  const basePrompt = buildBaseSystemPrompt(typeof resolved === "string" ? resolved : "");
  return appendExtensionPrompts(basePrompt, extensionPrompts);
}

function buildTaskToolDescription(subagentDescriptions: string[]): string {
  const availableAgents =
    subagentDescriptions.length > 0
      ? subagentDescriptions.map((desc) => `- ${desc}`).join("\n")
      : "- (none)";

  return [
    "Launch an ephemeral subagent to handle complex, multi-step independent tasks with isolated context windows.",
    "",
    "Available agent types and the tools they have access to:",
    availableAgents,
    "",
    "When using the Task tool, you must specify a subagent_type parameter to select which agent type to use.",
    "",
    "## Usage notes:",
    "1. Launch multiple agents concurrently whenever possible, to maximize performance; to do that, use a single message with multiple tool uses",
    "2. When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result.",
    "3. Each agent invocation is stateless. You will not be able to send additional messages to the agent, nor will the agent be able to communicate with you outside of its final report. Therefore, your prompt should contain a highly detailed task description for the agent to perform autonomously and you should specify exactly what information the agent should return back to you in its final and only message to you.",
    "4. The agent's outputs should generally be trusted",
    "5. Clearly tell the agent whether you expect it to create content, perform analysis, or just do research (search, file reads, web fetches, etc.), since it is not aware of the user's intent",
    "6. If the agent description mentions that it should be used proactively, then you should try your best to use it without the user having to ask for it first. Use your judgement.",
    "7. When only the general-purpose agent is provided, you should use it for all tasks. It is great for isolating context and token usage, and completing specific, complex tasks, as it has all the same capabilities as the main agent.",
    "",
    "### Example usage of the general-purpose agent:",
    "",
    "<example_agent_descriptions>",
    '"general-purpose": use this agent for general purpose tasks, it has access to all tools as the main agent.',
    "</example_agent_descriptions>",
    "",
    "<example>",
    'User: "I want to conduct research on the accomplishments of Lebron James, Michael Jordan, and Kobe Bryant, and then compare them."',
    "Assistant: *Uses the task tool in parallel to conduct isolated research on each of the three players*",
    "Assistant: *Synthesizes the results of the three isolated research tasks and responds to the User*",
    "<commentary>",
    "Research is a complex, multi-step task in it of itself.",
    "The research of each individual player is not dependent on the research of the other players.",
    "The assistant uses the task tool to break down the complex objective into three isolated tasks.",
    "Each research task only needs to worry about context and tokens about one player, then returns synthesized information about each player as the Tool Result.",
    "This means each research task can dive deep and spend tokens and context deeply researching each player, but the final result is synthesized information, and saves us tokens in the long run when comparing the players to each other.",
    "</commentary>",
    "</example>",
    "",
    "<example>",
    'User: "Analyze a single large code repository for security vulnerabilities and generate a report."',
    "Assistant: *Launches a single `task` subagent for the repository analysis*",
    "Assistant: *Receives report and integrates results into final summary*",
    "<commentary>",
    "Subagent is used to isolate a large, context-heavy task, even though there is only one. This prevents the main thread from being overloaded with details.",
    "If the user then asks followup questions, we have a concise report to reference instead of the entire history of analysis and tool calls, which is good and saves us time and money.",
    "</commentary>",
    "</example>",
    "",
    "<example>",
    'User: "Schedule two meetings for me and prepare agendas for each."',
    "Assistant: *Calls the task tool in parallel to launch two `task` subagents (one per meeting) to prepare agendas*",
    "Assistant: *Returns final schedules and agendas*",
    "<commentary>",
    "Tasks are simple individually, but subagents help silo agenda preparation.",
    "Each subagent only needs to worry about the agenda for one meeting.",
    "</commentary>",
    "</example>",
    "",
    "<example>",
    'User: "I want to order a pizza from Dominos, order a burger from McDonald\'s, and order a salad from Subway."',
    "Assistant: *Calls tools directly in parallel to order a pizza from Dominos, a burger from McDonald's, and a salad from Subway*",
    "<commentary>",
    "The assistant did not use the task tool because the objective is super simple and clear and only requires a few trivial tool calls.",
    "It is better to just complete the task directly and NOT use the `task` tool.",
    "</commentary>",
    "</example>",
    "",
    "### Example usage with custom agents:",
    "",
    "<example_agent_descriptions>",
    '"content-reviewer": use this agent after you are done creating significant content or documents',
    '"greeting-responder": use this agent when to respond to user greetings with a friendly joke',
    '"research-analyst": use this agent to conduct thorough research on complex topics',
    "</example_agent_description>",
    "",
    "<example>",
    'user: "Please write a function that checks if a number is prime"',
    "assistant: Sure let me write a function that checks if a number is prime",
    "assistant: First let me use the Write tool to write a function that checks if a number is prime",
    "assistant: I'm going to use the Write tool to write the following code:",
    "<code>",
    "function isPrime(n) {",
    "  if (n <= 1) return false",
    "  for (let i = 2; i * i <= n; i++) {",
    "    if (n % i === 0) return false",
    "  }",
    "  return true",
    "}",
    "</code>",
    "<commentary>",
    "Since significant content was created and the task was completed, now use the content-reviewer agent to review the work",
    "</commentary>",
    "assistant: Now let me use the content-reviewer agent to review the code",
    "assistant: Uses the Task tool to launch with the content-reviewer agent",
    "</example>",
    "",
    "<example>",
    'user: "Can you help me research the environmental impact of different renewable energy sources and create a comprehensive report?"',
    "<commentary>",
    "This is a complex research task that would benefit from using the research-analyst agent to conduct thorough analysis",
    "</commentary>",
    "assistant: I'll help you research the environmental impact of renewable energy sources. Let me use the research-analyst agent to conduct comprehensive research on this topic.",
    "assistant: Uses the Task tool to launch with the research-analyst agent, providing detailed instructions about what research to conduct and what format the report should take",
    "</example>",
    "",
    "<example>",
    'user: "Hello"',
    "<commentary>",
    "Since the user is greeting, use the greeting-responder agent to respond with a friendly joke",
    "</commentary>",
    'assistant: "I\'m going to use the Task tool to launch with the greeting-responder agent"',
    "</example>",
  ].join("\n");
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function formatTodos(todos: PlanAgentTodoItem[]): string {
  if (todos.length === 0) {
    return "No todos.";
  }

  const lines = todos.map((todo) => `- [${todo.status}] ${todo.content} (id: ${todo.id})`);
  return lines.join("\n");
}

function formatFiles(state: PlanAgentState): string {
  const files = state.files ? Object.keys(state.files).sort() : [];
  if (files.length === 0) {
    return "No files.";
  }
  return files.map((filePath) => `- ${filePath}`).join("\n");
}

function insertStateMessage(messages: UIMessage[], content: string) {
  if (!content.trim()) {
    return messages;
  }

  const stateMessage: UIMessage = {
    id: randomUUID(),
    role: "system",
    parts: [{ type: "text", text: content }],
  };

  const index = messages.findIndex((message) => message.role !== "system");
  const insertionIndex = index === -1 ? messages.length : index;
  const next = [...messages];
  next.splice(insertionIndex, 0, stateMessage);
  return next;
}

function extractMessageText(message: UIMessage): string {
  if ("content" in message && typeof message.content === "string") {
    return message.content;
  }

  if ("parts" in message && Array.isArray(message.parts)) {
    return message.parts.map((part) => (part.type === "text" ? (part.text ?? "") : "")).join("");
  }

  return "";
}

function markPlanProgress(context: OperationContext) {
  context.systemContext.set(PLAN_PROGRESS_CONTEXT_KEY, true);
}

function collectStepToolNames(step: StepResult<ToolSet>): string[] {
  const toolNames = new Set<string>();
  for (const call of step.toolCalls ?? []) {
    if (call?.toolName) {
      toolNames.add(call.toolName);
    }
  }
  for (const result of step.toolResults ?? []) {
    if (result?.toolName) {
      toolNames.add(result.toolName);
    }
  }
  return Array.from(toolNames);
}

function stepHasTextOutput(step: StepResult<ToolSet>): boolean {
  if (typeof step.text === "string" && step.text.trim()) {
    return true;
  }
  return (
    step.content?.some((part) => part.type === "text" && part.text?.trim().length > 0) ?? false
  );
}

function hasSystemMarker(messages: UIMessage[], marker: string): boolean {
  return messages.some((message) => {
    if (message.role !== "system") return false;
    return extractMessageText(message).includes(marker);
  });
}

function createStateInjectionHook(options: {
  agentRef: () => Agent | undefined;
  planningEnabled: boolean;
}) {
  const { agentRef, planningEnabled } = options;
  return async (args: Parameters<NonNullable<AgentHooks["onPrepareMessages"]>>[0]) => {
    const agent = agentRef();
    if (!agent) {
      return { messages: args.messages };
    }

    let messages = args.messages;

    if (planningEnabled && !hasSystemMarker(messages, "<planagent_planning>")) {
      messages = insertStateMessage(messages, PLANNING_SYSTEM_MESSAGE);
    }

    const state = await loadPlanAgentState(agent, args.context);
    const hasTodos = !!state.todos && state.todos.length > 0;
    const hasFiles = !!state.files && Object.keys(state.files).length > 0;
    const hasActiveTodos = (state.todos || []).some((todo) => todo.status !== "done");
    const planWritten = args.context.systemContext.get(PLAN_WRITTEN_CONTEXT_KEY) === true;
    const needsPlan = planningEnabled && !planWritten && !hasActiveTodos;

    if (needsPlan && !args.context.systemContext.has(FORCED_TOOL_CHOICE_CONTEXT_KEY)) {
      args.context.systemContext.set(FORCED_TOOL_CHOICE_CONTEXT_KEY, {
        type: "tool",
        toolName: WRITE_TODOS_TOOL_NAME,
      });
    } else if (!needsPlan && args.context.systemContext.has(FORCED_TOOL_CHOICE_CONTEXT_KEY)) {
      args.context.systemContext.delete(FORCED_TOOL_CHOICE_CONTEXT_KEY);
    }

    if (!hasTodos && !hasFiles) {
      return { messages };
    }

    const todos = state.todos || [];
    const stateMessage = [
      "<planagent_state>",
      "<todo_list>",
      hasTodos ? formatTodos(todos) : "No todos.",
      "</todo_list>",
      "<files>",
      hasFiles ? formatFiles(state) : "No files.",
      "</files>",
      "</planagent_state>",
    ].join("\n");

    const messagesWithState = insertStateMessage(messages, stateMessage);

    return { messages: messagesWithState };
  };
}

function compactHooks<T>(hooks: Array<T | null | undefined>): T[] {
  return hooks.filter((hook): hook is T => Boolean(hook));
}

function chainVoidHooks<T>(
  hooks: Array<((args: T) => Promise<void> | void) | null | undefined>,
): ((args: T) => Promise<void>) | undefined {
  const sequence = compactHooks(hooks);
  if (sequence.length === 0) {
    return undefined;
  }
  return async (args) => {
    for (const hook of sequence) {
      await hook(args);
    }
  };
}

function chainPrepareMessagesHooks(
  hooks: Array<AgentHooks["onPrepareMessages"] | null | undefined>,
): AgentHooks["onPrepareMessages"] | undefined {
  const sequence = compactHooks(hooks);
  if (sequence.length === 0) {
    return undefined;
  }
  return async (args) => {
    let currentArgs = args;
    for (const hook of sequence) {
      const result = await hook(currentArgs);
      if (result?.messages) {
        currentArgs = { ...currentArgs, messages: result.messages };
      }
    }
    return { messages: currentArgs.messages };
  };
}

function chainPrepareModelMessagesHooks(
  hooks: Array<AgentHooks["onPrepareModelMessages"] | null | undefined>,
): AgentHooks["onPrepareModelMessages"] | undefined {
  const sequence = compactHooks(hooks);
  if (sequence.length === 0) {
    return undefined;
  }
  return async (args) => {
    let currentArgs = args;
    for (const hook of sequence) {
      const result = await hook(currentArgs);
      if (result?.modelMessages) {
        currentArgs = { ...currentArgs, modelMessages: result.modelMessages };
      }
    }
    return { modelMessages: currentArgs.modelMessages };
  };
}

function composeAgentHooks(sequences: {
  onStart?: AgentHooks["onStart"][];
  onEnd?: AgentHooks["onEnd"][];
  onHandoff?: AgentHooks["onHandoff"][];
  onHandoffComplete?: AgentHooks["onHandoffComplete"][];
  onToolStart?: AgentHooks["onToolStart"][];
  onToolEnd?: AgentHooks["onToolEnd"][];
  onPrepareMessages?: AgentHooks["onPrepareMessages"][];
  onPrepareModelMessages?: AgentHooks["onPrepareModelMessages"][];
  onError?: AgentHooks["onError"][];
  onStepFinish?: AgentHooks["onStepFinish"][];
}): AgentHooks {
  return {
    onStart: chainVoidHooks(sequences.onStart ?? []),
    onEnd: chainVoidHooks(sequences.onEnd ?? []),
    onHandoff: chainVoidHooks(sequences.onHandoff ?? []),
    onHandoffComplete: chainVoidHooks(sequences.onHandoffComplete ?? []),
    onToolStart: chainVoidHooks(sequences.onToolStart ?? []),
    onToolEnd: chainVoidHooks(sequences.onToolEnd ?? []),
    onPrepareMessages: chainPrepareMessagesHooks(sequences.onPrepareMessages ?? []),
    onPrepareModelMessages: chainPrepareModelMessagesHooks(sequences.onPrepareModelMessages ?? []),
    onError: chainVoidHooks(sequences.onError ?? []),
    onStepFinish: chainVoidHooks(sequences.onStepFinish ?? []),
  };
}

function isUserDefinedTool(tool: unknown): tool is Tool<any, any> {
  return (
    typeof tool === "object" &&
    tool !== null &&
    "type" in tool &&
    (tool as Tool<any, any>).type === "user-defined"
  );
}

function wrapToolkitTools(
  toolkit: Toolkit,
  wrapTool: (tool: Tool<any, any>) => Tool<any, any>,
): Toolkit {
  const wrappedTools = toolkit.tools.map((tool) =>
    isUserDefinedTool(tool) ? wrapTool(tool) : tool,
  );
  return {
    ...toolkit,
    tools: wrappedTools,
  };
}

function getAgentDescription(agent: Agent): string {
  if (agent.purpose) return agent.purpose;
  if (typeof agent.instructions === "string") return agent.instructions;
  return "Dynamic instructions";
}

function normalizeSubagentDefinitions(options: {
  definitions: PlanAgentSubagentDefinition[];
  defaultModel: AgentOptions["model"];
  defaultTools: (Tool<any, any> | Toolkit | VercelTool)[];
  defaultToolkits: Toolkit[];
  defaultMemory: AgentOptions["memory"];
  defaultLogger?: Logger;
}): Array<{ name: string; description: string; config: SubAgentConfig }> {
  const { definitions, defaultModel, defaultTools, defaultToolkits, defaultMemory, defaultLogger } =
    options;

  const normalized: Array<{ name: string; description: string; config: SubAgentConfig }> = [];

  for (const definition of definitions) {
    if (definition instanceof Agent) {
      normalized.push({
        name: definition.name,
        description: getAgentDescription(definition),
        config: definition,
      });
      continue;
    }

    if (definition && typeof definition === "object" && "method" in definition) {
      const config = definition as SubAgentConfig;
      const agent = "agent" in config ? config.agent : (config as Agent);
      normalized.push({
        name: agent.name,
        description: getAgentDescription(agent),
        config,
      });
      continue;
    }

    const custom = definition as Exclude<PlanAgentSubagentDefinition, Agent | SubAgentConfig>;
    const tools = custom.tools ?? defaultTools;
    const toolkits = custom.toolkits ?? defaultToolkits;

    const agent = new Agent({
      ...custom,
      name: custom.name,
      model: custom.model ?? defaultModel,
      instructions: custom.systemPrompt,
      tools,
      toolkits,
      memory: custom.memory ?? defaultMemory,
      logger: custom.logger ?? defaultLogger,
    });

    normalized.push({
      name: agent.name,
      description: custom.description || getAgentDescription(agent),
      config: agent,
    });
  }

  return normalized;
}

function createTaskToolkit(options: {
  sourceAgent: Agent;
  subagents: Array<{ name: string; description: string; config: SubAgentConfig }>;
  taskOptions?: TaskToolOptions | false;
  systemPrompt: string;
}): Toolkit | null {
  const { sourceAgent, subagents, taskOptions, systemPrompt } = options;
  if (taskOptions === false || subagents.length === 0) {
    return null;
  }

  const subAgentManager = new SubAgentManager(
    sourceAgent.name,
    subagents.map((s) => s.config),
  );
  const subagentDescriptions = subagents.map(
    (subagent) => `${subagent.name}: ${subagent.description}`,
  );

  const description =
    taskOptions?.taskDescription || buildTaskToolDescription(subagentDescriptions);

  const tool = createTool({
    name: "task",
    description,
    parameters: z.object({
      description: z.string().describe("The task to execute with the selected agent"),
      subagent_type: z
        .string()
        .describe(
          `Name of the agent to use. Available: ${subagents.map((s) => s.name).join(", ")}`,
        ),
    }),
    execute: async (input, executeOptions) => {
      const operationContext = executeOptions as OperationContext;
      const toolSpan = operationContext.systemContext.get("parentToolSpan") as Span | undefined;
      if (toolSpan) {
        toolSpan.setAttribute("voltagent.label", `task:${input.subagent_type}`);
        toolSpan.setAttribute("planagent.task.subagent_type", input.subagent_type);
        toolSpan.setAttribute("planagent.task.description", truncateText(input.description, 500));
      }
      const target = subagents.find((subagent) => subagent.name === input.subagent_type);
      if (!target) {
        return {
          error: `Unknown subagent type '${input.subagent_type}'. Available: ${subagents
            .map((s) => s.name)
            .join(", ")}`,
        };
      }

      const result = await subAgentManager.handoffTask({
        task: input.description,
        targetAgent: target.config,
        sourceAgent,
        userId: operationContext.userId,
        conversationId: operationContext.conversationId,
        parentOperationContext: operationContext,
        maxSteps: taskOptions?.maxSteps,
        parentSpan: operationContext.systemContext.get("parentToolSpan") as Span | undefined,
      });

      if (toolSpan) {
        const responsePreview =
          typeof result.result === "string"
            ? truncateText(result.result, 500)
            : truncateText(safeStringify(result.result), 500);
        toolSpan.setAttribute("planagent.task.status", result.bailed ? "bailed" : "completed");
        toolSpan.setAttribute("planagent.task.response_preview", responsePreview);
      }

      return {
        agent: target.name,
        response: result.result,
        usage: result.usage,
        bailed: result.bailed,
      };
    },
  });

  return createToolkit({
    name: "planagent_task",
    description: "Task delegation tools for subagents",
    tools: [tool],
    instructions: systemPrompt || undefined,
    addInstructions: Boolean(systemPrompt),
  });
}

function createStateExtension(): PlanAgentExtension {
  return {
    name: "state",
    apply: ({ agentRef, planningEnabled }) => ({
      hooks: {
        onPrepareMessages: createStateInjectionHook({ agentRef, planningEnabled }),
      },
    }),
  };
}

function createPlanningExtension(options: {
  planning: PlanningToolkitOptions | false;
}): PlanAgentExtension {
  return {
    name: "planning",
    apply: ({ planningEnabled }) => {
      if (!planningEnabled) {
        return null;
      }

      return {
        hooks: {
          onToolStart: async (args) => {
            if (args.tool.name === WRITE_TODOS_TOOL_NAME) {
              return;
            }

            const state = await loadPlanAgentState(args.agent, args.context);
            const hasActiveTodos = (state.todos || []).some((todo) => todo.status !== "done");
            const planWritten = args.context.systemContext.get(PLAN_WRITTEN_CONTEXT_KEY) === true;
            const needsPlan = !planWritten && !hasActiveTodos;
            if (needsPlan) {
              throw new Error("Planning required: call write_todos before using other tools.");
            }
          },
          onToolEnd: async (args) => {
            if (args.error) {
              return;
            }

            if (args.tool.name === WRITE_TODOS_TOOL_NAME) {
              args.context.systemContext.set(PLAN_WRITTEN_CONTEXT_KEY, true);
              args.context.systemContext.delete(FORCED_TOOL_CHOICE_CONTEXT_KEY);
              return;
            }

            markPlanProgress(args.context);
          },
          onStepFinish: async (args) => {
            const step = args.step as StepResult<ToolSet> | undefined;
            if (!step) {
              return;
            }

            const toolNames = collectStepToolNames(step);
            const hasNonPlanningTool = toolNames.some((name) => name !== WRITE_TODOS_TOOL_NAME);
            const isPlanningOnlyStep =
              toolNames.length > 0 && toolNames.every((name) => name === WRITE_TODOS_TOOL_NAME);

            if (hasNonPlanningTool || (stepHasTextOutput(step) && !isPlanningOnlyStep)) {
              markPlanProgress(args.context);
            }
          },
        },
        toolkits: (agent) => [createPlanningToolkit(agent, options.planning || {})],
      };
    },
  };
}

function createFilesystemExtension(options: {
  filesystem: FilesystemToolkitOptions | false;
  backend: FilesystemToolkitOptions["backend"] | null;
}): PlanAgentExtension {
  return {
    name: "filesystem",
    apply: () => {
      if (options.filesystem === false) {
        return null;
      }

      const filesystemOptions = options.filesystem || {};

      return {
        toolkits: (agent) => [
          createFilesystemToolkit(agent, {
            ...filesystemOptions,
            backend: options.backend || undefined,
            systemPrompt:
              filesystemOptions.systemPrompt === undefined
                ? FILESYSTEM_SYSTEM_PROMPT
                : filesystemOptions.systemPrompt,
          }),
        ],
      };
    },
  };
}

function createTaskExtension(options: {
  task: TaskToolOptions | false | undefined;
  systemPrompt: string;
}): PlanAgentExtension {
  return {
    name: "task",
    apply: () => {
      if (options.task === false) {
        return null;
      }

      return {
        afterSubagents: ({ agent, subagents }) =>
          createTaskToolkit({
            sourceAgent: agent,
            subagents,
            taskOptions: options.task,
            systemPrompt: options.systemPrompt,
          }),
      };
    },
  };
}

export class PlanAgent extends Agent {
  constructor(options: PlanAgentOptions) {
    if (!options.model) {
      throw new Error("PlanAgent requires a model to be provided");
    }

    const {
      systemPrompt,
      tools = [],
      toolkits = [],
      subagents = [],
      generalPurposeAgent = true,
      planning = {},
      summarization = {},
      filesystem = {},
      task,
      extensions = [],
      toolResultEviction,
      hooks,
      name,
      ...agentOptions
    } = options;

    const planningEnabled = planning !== false;
    const filesystemBackend =
      filesystem === false
        ? null
        : filesystem.backend ||
          ((context: FilesystemBackendContext) =>
            new InMemoryFilesystemBackend(context.state.files || {}));

    const baseSystemPrompt = buildBaseSystemPrompt(
      typeof systemPrompt === "string" ? systemPrompt : undefined,
    );
    const taskOptions = task === false ? undefined : task;
    const taskSystemPrompt =
      taskOptions?.systemPrompt === undefined
        ? TASK_SYSTEM_PROMPT
        : taskOptions?.systemPrompt || "";

    const builtinExtensions: PlanAgentExtension[] = [
      createStateExtension(),
      createPlanningExtension({ planning }),
      createFilesystemExtension({ filesystem, backend: filesystemBackend }),
      createTaskExtension({ task, systemPrompt: taskSystemPrompt }),
    ];

    const allExtensions = [...builtinExtensions, ...extensions];
    const extensionContext: PlanAgentExtensionContext = {
      agentRef: () => this,
      options,
      planningEnabled,
    };
    const extensionResults = allExtensions
      .map((extension) => extension.apply(extensionContext))
      .filter((result): result is PlanAgentExtensionResult => Boolean(result));

    const extensionPrompts = extensionResults
      .map((result) => result.systemPrompt)
      .filter((prompt): prompt is string => Boolean(prompt && prompt.trim().length > 0));

    const finalSystemPrompt = appendExtensionPrompts(baseSystemPrompt, extensionPrompts);
    const instructions: InstructionsDynamicValue =
      typeof systemPrompt === "function"
        ? async (dynamicOptions) =>
            mergeSystemPromptWithExtensions(await systemPrompt(dynamicOptions), extensionPrompts)
        : finalSystemPrompt;

    const extensionHooks = extensionResults.flatMap((result) =>
      result.hooks ? [result.hooks] : [],
    );
    const composedHooks = composeAgentHooks({
      onStart: [...extensionHooks.map((hook) => hook.onStart), hooks?.onStart],
      onEnd: [...extensionHooks.map((hook) => hook.onEnd), hooks?.onEnd],
      onHandoff: [...extensionHooks.map((hook) => hook.onHandoff), hooks?.onHandoff],
      onHandoffComplete: [
        ...extensionHooks.map((hook) => hook.onHandoffComplete),
        hooks?.onHandoffComplete,
      ],
      onPrepareMessages: [
        ...extensionHooks.map((hook) => hook.onPrepareMessages),
        hooks?.onPrepareMessages,
      ],
      onPrepareModelMessages: [
        ...extensionHooks.map((hook) => hook.onPrepareModelMessages),
        hooks?.onPrepareModelMessages,
      ],
      onToolStart: [hooks?.onToolStart, ...extensionHooks.map((hook) => hook.onToolStart)],
      onToolEnd: [hooks?.onToolEnd, ...extensionHooks.map((hook) => hook.onToolEnd)],
      onStepFinish: [hooks?.onStepFinish, ...extensionHooks.map((hook) => hook.onStepFinish)],
      onError: [...extensionHooks.map((hook) => hook.onError), hooks?.onError],
    });

    super({
      ...agentOptions,
      name: name || "plan-agent",
      instructions,
      summarization,
      tools: [],
      toolkits: [],
      hooks: composedHooks,
    });

    const extensionTools = extensionResults.flatMap((result) => result.tools ?? []);
    const extensionSubagents = extensionResults.flatMap((result) => result.subagents ?? []);
    const extensionToolkits: Toolkit[] = [];
    const extensionToolkitFactories: Array<(agent: Agent) => Toolkit[]> = [];

    for (const result of extensionResults) {
      const toolkitsForExtension = result.toolkits;
      if (!toolkitsForExtension) {
        continue;
      }

      if (typeof toolkitsForExtension === "function") {
        extensionToolkitFactories.push(toolkitsForExtension);
      } else {
        extensionToolkits.push(...toolkitsForExtension);
      }
    }

    const resolvedExtensionToolkits = [
      ...extensionToolkits,
      ...extensionToolkitFactories.flatMap((factory) => factory(this)),
    ];

    const combinedToolkits = [...resolvedExtensionToolkits, ...toolkits].filter(Boolean);
    const combinedTools = [...extensionTools, ...tools];

    const configuredEvictionLimit =
      toolResultEviction?.tokenLimit ?? (filesystem ? filesystem.toolTokenLimitBeforeEvict : null);
    const evictionEnabled =
      toolResultEviction?.enabled ??
      (filesystem !== false && configuredEvictionLimit !== null && configuredEvictionLimit !== 0);
    const evictionTokenLimit = configuredEvictionLimit ?? 20000;

    const excludeToolNames = [
      WRITE_TODOS_TOOL_NAME,
      "ls",
      "read_file",
      "write_file",
      "edit_file",
      "glob",
      "grep",
      "task",
    ];

    const wrapTool =
      evictionEnabled && filesystemBackend
        ? createToolResultEvictor({
            agent: this,
            backend: filesystemBackend,
            tokenLimit: evictionTokenLimit,
            excludeToolNames,
          })
        : (tool: Tool<any, any>) => tool;

    const wrappedToolkits = combinedToolkits.map((toolkit) => wrapToolkitTools(toolkit, wrapTool));

    const wrappedTools = combinedTools.map((tool) =>
      isUserDefinedTool(tool) ? wrapTool(tool) : tool,
    );

    const subagentToolkits: Toolkit[] = combinedToolkits.map((toolkit) =>
      wrapToolkitTools(toolkit, wrapTool),
    );

    const normalizedSubagents = normalizeSubagentDefinitions({
      definitions: [...subagents, ...extensionSubagents],
      defaultModel: options.model,
      defaultTools: wrappedTools,
      defaultToolkits: subagentToolkits,
      defaultMemory: options.memory,
      defaultLogger: options.logger,
    });

    if (generalPurposeAgent) {
      const alreadyExists = normalizedSubagents.some(
        (subagent) => subagent.name === "general-purpose",
      );
      if (!alreadyExists) {
        const generalPurposeSubagent = new Agent({
          name: "general-purpose",
          purpose: DEFAULT_GENERAL_PURPOSE_DESCRIPTION,
          model: options.model,
          instructions: DEFAULT_SUBAGENT_PROMPT,
          tools: wrappedTools,
          toolkits: subagentToolkits,
          memory: options.memory,
          logger: options.logger,
        });

        normalizedSubagents.unshift({
          name: generalPurposeSubagent.name,
          description: DEFAULT_GENERAL_PURPOSE_DESCRIPTION,
          config: generalPurposeSubagent,
        });
      }
    }

    const postSubagentToolkits = extensionResults.flatMap((result) => {
      if (!result.afterSubagents) {
        return [];
      }

      const built = result.afterSubagents({
        agent: this,
        subagents: normalizedSubagents,
      });

      if (!built) {
        return [];
      }

      return Array.isArray(built) ? built : [built];
    });

    const wrappedPostSubagentToolkits = postSubagentToolkits.map((toolkit) =>
      wrapToolkitTools(toolkit, wrapTool),
    );

    const finalToolkits =
      wrappedPostSubagentToolkits.length > 0
        ? [...wrappedToolkits, ...wrappedPostSubagentToolkits]
        : wrappedToolkits;

    if (finalToolkits.length > 0) {
      this.addTools(finalToolkits);
    }

    if (wrappedTools.length > 0) {
      this.addTools(wrappedTools);
    }
  }
}
