import {
  Agent,
  InMemoryStorageAdapter,
  Memory,
  createInputGuardrail,
  createInputMiddleware,
  createOutputGuardrail,
  createOutputMiddleware,
  createSubagent,
  createTool,
  tool,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import { createVoltAgentApp } from "@voltagent/server-hono";
import { Output } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

const usage = {
  inputTokens: {
    total: 12,
    noCache: 12,
    cacheRead: 0,
    cacheWrite: 0,
  },
  outputTokens: {
    total: 8,
    text: 8,
    reasoning: 0,
  },
};

const finishReason = (reason: "stop" | "tool-calls" = "stop") => ({
  unified: reason,
  raw: reason,
});

const textGenerate = (text: string) => ({
  finishReason: finishReason("stop"),
  usage,
  content: [{ type: "text" as const, text }],
  warnings: [],
});

const toolCallGenerate = (
  toolName: string,
  input: Record<string, unknown>,
  toolCallId = `${toolName}-call`,
) => ({
  finishReason: finishReason("tool-calls"),
  usage,
  content: [
    {
      type: "tool-call" as const,
      toolCallId,
      toolName,
      input: safeStringify(input),
    },
  ],
  warnings: [],
});

const multiToolCallGenerate = (
  calls: Array<{
    toolName: string;
    input: Record<string, unknown>;
    toolCallId: string;
  }>,
) => ({
  finishReason: finishReason("tool-calls"),
  usage,
  content: calls.map((call) => ({
    type: "tool-call" as const,
    toolCallId: call.toolCallId,
    toolName: call.toolName,
    input: safeStringify(call.input),
  })),
  warnings: [],
});

const textStream = (text: string) => ({
  stream: simulateReadableStream({
    chunks: [
      { type: "text-start" as const, id: "text-1" },
      { type: "text-delta" as const, id: "text-1", delta: text },
      { type: "text-end" as const, id: "text-1" },
      {
        type: "finish" as const,
        finishReason: finishReason("stop"),
        usage,
      },
    ],
  }),
});

const toolCallStream = (
  toolName: string,
  input: Record<string, unknown>,
  toolCallId = `${toolName}-call`,
) => ({
  stream: simulateReadableStream({
    chunks: [
      {
        type: "tool-call" as const,
        toolCallId,
        toolName,
        input: safeStringify(input),
      },
      {
        type: "finish" as const,
        finishReason: finishReason("tool-calls"),
        usage,
      },
    ],
  }),
});

const collectTextStream = async (stream: AsyncIterable<string>) => {
  let text = "";
  for await (const chunk of stream) {
    text += chunk;
  }
  return text;
};

const createModel = (
  doGenerate: ConstructorParameters<typeof MockLanguageModelV3>[0]["doGenerate"],
  doStream?: ConstructorParameters<typeof MockLanguageModelV3>[0]["doStream"],
) =>
  new MockLanguageModelV3({
    modelId: "mock-runtime-model",
    doGenerate,
    doStream,
  });

const createServerDeps = (agent: Agent, overrides: Record<string, unknown> = {}) =>
  ({
    agentRegistry: {
      getAgent: (id: string) => (id === agent.id ? agent : undefined),
      getAllAgents: () => [agent],
      getAgentCount: () => 1,
      removeAgent: () => false,
      registerAgent: () => undefined,
      getGlobalVoltOpsClient: () => undefined,
      getGlobalLogger: () => undefined,
    },
    workflowRegistry: {
      getAll: () => [],
      getWorkflow: () => undefined,
      getWorkflowsForApi: () => [],
      getWorkflowDetailForApi: () => undefined,
      getWorkflowCount: () => 0,
      getAllWorkflowIds: () => [],
      on: () => undefined,
      off: () => undefined,
    },
    triggerRegistry: { list: () => [] },
    ...overrides,
  }) as any;

describe("Agent runtime e2e", () => {
  it("runs generateText through an AI SDK native tool", async () => {
    const execute = vi.fn(async ({ city }: { city: string }) => ({ city, tempC: 18 }));
    const getWeather = tool({
      description: "Get current weather",
      inputSchema: z.object({
        city: z.string(),
      }),
      execute,
    });

    let generateCalls = 0;
    const model = createModel(async () => {
      generateCalls += 1;
      return generateCalls === 1
        ? toolCallGenerate("getWeather", { city: "Paris" })
        : textGenerate("Paris is 18C.");
    });

    const agent = new Agent({
      name: "NativeToolAgent",
      instructions: "Use tools when useful.",
      model,
      tools: {
        getWeather,
      },
    });

    const result = await agent.generateText("What is the weather in Paris?");

    expect(result.text).toBe("Paris is 18C.");
    expect(execute).toHaveBeenCalledWith(
      { city: "Paris" },
      expect.objectContaining({
        toolCallId: "getWeather-call",
      }),
    );
  });

  it("streams through a tool call and final text", async () => {
    const execute = vi.fn(async ({ city }: { city: string }) => ({ city, tempC: 12 }));
    const getWeather = tool({
      description: "Get current weather",
      inputSchema: z.object({
        city: z.string(),
      }),
      execute,
    });

    let streamCalls = 0;
    const model = createModel(textGenerate("unused"), async () => {
      streamCalls += 1;
      return streamCalls === 1
        ? toolCallStream("getWeather", { city: "Berlin" })
        : textStream("Berlin is 12C.");
    });

    const agent = new Agent({
      name: "StreamingToolAgent",
      instructions: "Use tools and answer briefly.",
      model,
      tools: {
        getWeather,
      },
    });

    const result = await agent.streamText("What is the weather in Berlin?");

    await expect(result.text).resolves.toBe("Berlin is 12C.");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      { city: "Berlin" },
      expect.objectContaining({
        toolCallId: "getWeather-call",
      }),
    );
  });

  it("combines createTool tools with runtime AI SDK tools", async () => {
    const multiplyExecute = vi.fn(async ({ a, b }: { a: number; b: number }) => ({
      product: a * b,
    }));
    const lookupExecute = vi.fn(async ({ key }: { key: string }) => ({ key, value: "meaning" }));

    const multiply = createTool({
      name: "multiply",
      description: "Multiply two numbers",
      parameters: z.object({
        a: z.number(),
        b: z.number(),
      }),
      execute: multiplyExecute,
    });
    const lookup = tool({
      description: "Lookup a value",
      inputSchema: z.object({
        key: z.string(),
      }),
      execute: lookupExecute,
    });

    let generateCalls = 0;
    const model = createModel(async () => {
      generateCalls += 1;
      return generateCalls === 1
        ? multiToolCallGenerate([
            {
              toolName: "multiply",
              toolCallId: "multiply-call",
              input: { a: 6, b: 7 },
            },
            {
              toolName: "lookup",
              toolCallId: "lookup-call",
              input: { key: "answer" },
            },
          ])
        : textGenerate("Mixed tools completed.");
    });

    const agent = new Agent({
      name: "MixedToolAgent",
      instructions: "Use all relevant tools.",
      model,
      tools: [multiply],
    });

    const result = await agent.generateText("Use both tools.", {
      tools: {
        lookup,
      },
    });
    const multiplyOptions = multiplyExecute.mock.calls[0]?.[1] as
      | { toolContext?: { callId?: string } }
      | undefined;

    expect(result.text).toBe("Mixed tools completed.");
    expect(multiplyExecute).toHaveBeenCalledTimes(1);
    expect(multiplyExecute.mock.calls[0]?.[0]).toEqual({ a: 6, b: 7 });
    expect(multiplyOptions?.toolContext?.callId).toBe("multiply-call");
    expect(lookupExecute).toHaveBeenCalledWith(
      { key: "answer" },
      expect.objectContaining({
        toolCallId: "lookup-call",
      }),
    );
  });

  it("applies toolApproval before executing tools", async () => {
    const refundExecute = vi.fn(async ({ orderId }: { orderId: string; reason: string }) => ({
      refunded: true,
      orderId,
    }));
    const refundCustomer = createTool({
      name: "refundCustomer",
      description: "Refund a customer order",
      parameters: z.object({
        orderId: z.string(),
        reason: z.string(),
      }),
      execute: refundExecute,
    });

    let generateCalls = 0;
    const model = createModel(async () => {
      generateCalls += 1;
      return generateCalls === 1
        ? toolCallGenerate("refundCustomer", {
            orderId: "order-123",
            reason: "duplicate charge",
          })
        : textGenerate("Refund completed.");
    });
    const approve = vi.fn(async () => "approved" as const);

    const agent = new Agent({
      name: "ApprovalAgent",
      instructions: "Ask for approval before sensitive tools.",
      model,
      tools: [refundCustomer],
    });

    const result = await agent.generateText("Refund the customer.", {
      toolApproval: approve,
    });

    expect(result.text).toBe("Refund completed.");
    expect(approve).toHaveBeenCalledWith(
      expect.objectContaining({
        toolCall: expect.objectContaining({
          toolCallId: "refundCustomer-call",
          toolName: "refundCustomer",
          input: {
            orderId: "order-123",
            reason: "duplicate charge",
          },
        }),
      }),
    );
    expect(refundExecute).toHaveBeenCalledTimes(1);
  });

  it("returns a tool approval error result without executing denied tools", async () => {
    const execute = vi.fn(async () => ({ deleted: true }));
    const deleteAccount = createTool({
      name: "deleteAccount",
      description: "Delete a customer account",
      parameters: z.object({
        accountId: z.string(),
      }),
      execute,
    });

    let generateCalls = 0;
    const model = createModel(async () => {
      generateCalls += 1;
      return generateCalls === 1
        ? toolCallGenerate("deleteAccount", { accountId: "acct-123" })
        : textGenerate("Deletion was not performed.");
    });
    const agent = new Agent({
      name: "ApprovalDeniedAgent",
      instructions: "Never execute denied tools.",
      model,
      tools: [deleteAccount],
    });

    const result = await agent.generateText("Delete this account.", {
      toolApproval: {
        deleteAccount: "user-approval",
      },
    });

    expect(result.text).toBe("");
    expect(generateCalls).toBe(1);
    expect(execute).not.toHaveBeenCalled();
    expect(result.toolCalls[0]?.toolName).toBe("deleteAccount");
    expect(result.toolResults).toHaveLength(0);
  });

  it("parses structured output with Output.object", async () => {
    const schema = z.object({
      answer: z.string(),
      count: z.number(),
    });
    const model = createModel(textGenerate(safeStringify({ answer: "ok", count: 2 })));
    const agent = new Agent({
      name: "StructuredAgent",
      instructions: "Return structured data.",
      model,
    });

    const result = await agent.generateText("Return a structured answer.", {
      output: Output.object({ schema }),
    });

    expect(result.output).toEqual({
      answer: "ok",
      count: 2,
    });
  });

  it("runs middleware before guardrails on input and output", async () => {
    const inputMiddleware = createInputMiddleware({
      name: "append-input-marker",
      handler: ({ input }) => (typeof input === "string" ? `${input} middleware-ok` : input),
    });
    const inputGuardrail = createInputGuardrail({
      name: "assert-input-marker",
      handler: vi.fn(async ({ inputText }) => {
        expect(inputText).toContain("middleware-ok");
        return { pass: true };
      }),
    });
    const outputMiddleware = createOutputMiddleware<string>({
      name: "replace-output-token",
      handler: ({ output }) => output.replace("secret", "token"),
    });
    const outputGuardrail = createOutputGuardrail<string>({
      name: "redact-output-token",
      handler: vi.fn(async ({ outputText }) => ({
        pass: true,
        action: "modify",
        modifiedOutput: outputText?.replace("token", "redacted"),
      })),
    });

    const model = createModel(textGenerate("base secret"));
    const agent = new Agent({
      name: "MiddlewareGuardrailAgent",
      instructions: "Return a guarded answer.",
      model,
      inputMiddlewares: [inputMiddleware],
      inputGuardrails: [inputGuardrail],
      outputMiddlewares: [outputMiddleware],
      outputGuardrails: [outputGuardrail],
    });

    const result = await agent.generateText("hello");

    expect(result.text).toBe("base redacted");
    expect(inputGuardrail.handler).toHaveBeenCalledTimes(1);
    expect(outputGuardrail.handler).toHaveBeenCalledTimes(1);
  });

  it("blocks input and output through guardrails", async () => {
    const inputBlocker = createInputGuardrail({
      name: "input-blocker",
      handler: vi.fn(async () => ({
        pass: false,
        action: "block",
        message: "Input blocked by e2e policy.",
      })),
    });
    const inputBlockedAgent = new Agent({
      name: "InputBlockedAgent",
      instructions: "Should not call model.",
      model: createModel(textGenerate("unreachable")),
      inputGuardrails: [inputBlocker],
    });

    await expect(inputBlockedAgent.generateText("blocked input")).rejects.toMatchObject({
      message: "Input blocked by e2e policy.",
      code: "GUARDRAIL_INPUT_BLOCKED",
    });
    expect(inputBlocker.handler).toHaveBeenCalledTimes(1);
    expect(inputBlockedAgent.model.doGenerateCalls).toHaveLength(0);

    const outputBlocker = createOutputGuardrail<string>({
      name: "output-blocker",
      handler: vi.fn(async () => ({
        pass: false,
        action: "block",
        message: "Output blocked by e2e policy.",
      })),
    });
    const outputBlockedAgent = new Agent({
      name: "OutputBlockedAgent",
      instructions: "Return guarded output.",
      model: createModel(textGenerate("unsafe output")),
      outputGuardrails: [outputBlocker],
    });

    await expect(outputBlockedAgent.generateText("hello")).rejects.toMatchObject({
      message: "Output blocked by e2e policy.",
      code: "GUARDRAIL_OUTPUT_BLOCKED",
    });
    expect(outputBlocker.handler).toHaveBeenCalledTimes(1);
  });

  it("replaces a blocked stream with the input guardrail message", async () => {
    const inputGuardrail = createInputGuardrail({
      name: "stream-input-blocker",
      execution: "parallel",
      handler: vi.fn(async () => ({
        pass: false,
        action: "block",
        message: "Stream input blocked.",
      })),
    });
    const agent = new Agent({
      name: "StreamBlockedAgent",
      instructions: "Stream response.",
      model: createModel(textGenerate("unused"), textStream("unsafe stream output")),
      inputGuardrails: [inputGuardrail],
    });

    const result = await agent.streamText("blocked stream input");

    await expect(result.text).resolves.toBe("Stream input blocked.");
    await expect(collectTextStream(result.textStream)).resolves.toBe("Stream input blocked.");
  });

  it("delegates work to a subagent through delegate_task", async () => {
    const childAgent = new Agent({
      name: "Research Agent",
      instructions: "Research the delegated task.",
      model: createModel(textGenerate("Child answer.")),
    });

    let supervisorCalls = 0;
    const supervisorModel = createModel(async () => {
      supervisorCalls += 1;
      return supervisorCalls === 1
        ? toolCallGenerate("delegate_task", {
            task: "Research VoltAgent",
            targetAgents: ["Research Agent"],
            context: { topic: "voltagent" },
          })
        : textGenerate("Supervisor used Child answer.");
    });
    const supervisorAgent = new Agent({
      name: "SupervisorAgent",
      instructions: "Delegate research when useful.",
      model: supervisorModel,
      subAgents: [
        createSubagent({
          agent: childAgent,
          method: "generateText",
        }),
      ],
    });

    const result = await supervisorAgent.generateText("Please research VoltAgent.");

    expect(result.text).toBe("Supervisor used Child answer.");
    expect(childAgent.model.doGenerateCalls).toHaveLength(1);
  });

  it("delegates streaming work to a subagent through delegate_task", async () => {
    const childModel = createModel(textGenerate("unused"), textStream("Child streamed answer."));
    const childAgent = new Agent({
      name: "Streaming Research Agent",
      instructions: "Stream delegated answers.",
      model: childModel,
    });

    let supervisorCalls = 0;
    const supervisorModel = createModel(async () => {
      supervisorCalls += 1;
      return supervisorCalls === 1
        ? toolCallGenerate("delegate_task", {
            task: "Stream research",
            targetAgents: ["Streaming Research Agent"],
            context: { topic: "streaming" },
          })
        : textGenerate("Supervisor used streamed child answer.");
    });
    const supervisorAgent = new Agent({
      name: "StreamingSupervisorAgent",
      instructions: "Delegate streaming research when useful.",
      model: supervisorModel,
      subAgents: [
        createSubagent({
          agent: childAgent,
          method: "streamText",
        }),
      ],
    });

    const result = await supervisorAgent.generateText("Please stream delegated research.");

    expect(result.text).toBe("Supervisor used streamed child answer.");
    expect(childModel.doStreamCalls).toHaveLength(1);
    expect(result.toolResults[0]?.output).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          agentName: "Streaming Research Agent",
          response: "Child streamed answer.",
        }),
      ]),
    );
  });

  it("falls back to the next model and reports the fallback hook", async () => {
    const primaryModel = createModel(async () => {
      throw new Error("Primary model failed.");
    });
    const fallbackModel = createModel(textGenerate("Fallback model response."));
    const onFallback = vi.fn();
    const agent = new Agent({
      name: "FallbackAgent",
      instructions: "Use fallback when needed.",
      model: [
        { model: primaryModel, maxRetries: 0 },
        { model: fallbackModel, maxRetries: 0 },
      ],
      hooks: {
        onFallback,
      },
    });

    const result = await agent.generateText("Use a fallback.");

    expect(result.text).toBe("Fallback model response.");
    expect(primaryModel.doGenerateCalls).toHaveLength(1);
    expect(fallbackModel.doGenerateCalls).toHaveLength(1);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it("runs agent and VoltAgent metadata hooks for AI SDK tools", async () => {
    const toolMetadataStart = vi.fn();
    const toolMetadataEnd = vi.fn();
    const agentToolStart = vi.fn();
    const agentToolEnd = vi.fn();
    const execute = vi.fn(async ({ city }: { city: string }) => ({ city, tempC: 22 }));
    const getWeather = tool({
      description: "Get current weather",
      inputSchema: z.object({
        city: z.string(),
      }),
      execute,
      voltagent: {
        hooks: {
          onStart: toolMetadataStart,
          onEnd: toolMetadataEnd,
        },
      },
    });

    let generateCalls = 0;
    const model = createModel(async () => {
      generateCalls += 1;
      return generateCalls === 1
        ? toolCallGenerate("getWeather", { city: "Rome" })
        : textGenerate("Rome is 22C.");
    });
    const agent = new Agent({
      name: "AiSdkToolHooksAgent",
      instructions: "Use tools.",
      model,
      tools: {
        getWeather,
      },
      hooks: {
        onToolStart: agentToolStart,
        onToolEnd: agentToolEnd,
      },
    });

    const result = await agent.generateText("Weather in Rome?");

    expect(result.text).toBe("Rome is 22C.");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(toolMetadataStart).toHaveBeenCalledTimes(1);
    expect(toolMetadataEnd).toHaveBeenCalledTimes(1);
    expect(agentToolStart).toHaveBeenCalledTimes(1);
    expect(agentToolEnd).toHaveBeenCalledTimes(1);
  });

  it("serves generateText and streamText through server-hono routes", async () => {
    const model = createModel(textGenerate("HTTP text response."), textStream("HTTP stream."));
    const agent = new Agent({
      id: "http-agent",
      name: "HttpAgent",
      instructions: "Answer HTTP requests.",
      model,
    });
    const { app } = await createVoltAgentApp(createServerDeps(agent), {});

    const textResponse = await app.request("/agents/http-agent/text", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: safeStringify({
        input: "hello",
      }),
    });
    const textJson = await textResponse.json();

    expect(textResponse.status).toBe(200);
    expect(textJson).toMatchObject({
      success: true,
      data: {
        text: "HTTP text response.",
      },
    });

    const streamResponse = await app.request("/agents/http-agent/stream", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: safeStringify({
        input: "stream hello",
      }),
    });
    const streamBody = await streamResponse.text();

    expect(streamResponse.status).toBe(200);
    expect(streamResponse.headers.get("content-type")).toContain("text/event-stream");
    expect(streamBody).toContain("HTTP stream.");
  });

  it("normalizes server voltagent options and structured output", async () => {
    let startContext:
      | {
          userId?: string;
          conversationId?: string;
          context: Map<string | symbol, unknown>;
        }
      | undefined;
    const model = createModel(textGenerate(safeStringify({ answer: "server-ok", count: 3 })));
    const agent = new Agent({
      id: "server-options-agent",
      name: "ServerOptionsAgent",
      instructions: "Return structured data.",
      model,
      hooks: {
        onStart: ({ context }) => {
          startContext = context;
        },
      },
    });
    const { app } = await createVoltAgentApp(createServerDeps(agent), {});

    const response = await app.request("/agents/server-options-agent/text", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-e2e-request": "server-options",
      },
      body: safeStringify({
        input: "return structured data",
        options: {
          userId: "legacy-user",
          conversationId: "legacy-conversation",
          voltagent: {
            userId: "server-user",
            conversationId: "server-conversation",
            context: {
              requestId: "server-request",
            },
          },
          output: {
            type: "object",
            schema: {
              type: "object",
              properties: {
                answer: { type: "string" },
                count: { type: "number" },
              },
              required: ["answer", "count"],
              additionalProperties: false,
            },
          },
        },
      }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      data: {
        output: {
          answer: "server-ok",
          count: 3,
        },
      },
    });
    expect(startContext?.userId).toBe("server-user");
    expect(startContext?.conversationId).toBe("server-conversation");
    expect(startContext?.context.get("requestId")).toBe("server-request");
  });

  it("serves streamed tool calls through server-hono stream route", async () => {
    const execute = vi.fn(async ({ city }: { city: string }) => ({ city, tempC: 19 }));
    const getWeather = tool({
      description: "Get current weather",
      inputSchema: z.object({
        city: z.string(),
      }),
      execute,
    });

    let streamCalls = 0;
    const model = createModel(textGenerate("unused"), async () => {
      streamCalls += 1;
      return streamCalls === 1
        ? toolCallStream("getWeather", { city: "Madrid" })
        : textStream("Madrid is 19C.");
    });
    const agent = new Agent({
      id: "server-stream-tool-agent",
      name: "ServerStreamToolAgent",
      instructions: "Use tools in streams.",
      model,
      tools: {
        getWeather,
      },
    });
    const { app } = await createVoltAgentApp(createServerDeps(agent), {});

    const response = await app.request("/agents/server-stream-tool-agent/stream", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: safeStringify({
        input: "stream weather in Madrid",
      }),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(body).toContain("getWeather");
    expect(body).toContain("Madrid is 19C.");
  });

  it("updates working memory through generated tool calls", async () => {
    const memory = new Memory({
      storage: new InMemoryStorageAdapter(),
      workingMemory: {
        enabled: true,
      },
    });
    let generateCalls = 0;
    const model = createModel(async () => {
      generateCalls += 1;
      return generateCalls === 1
        ? toolCallGenerate("update_working_memory", {
            content: "Preferred language: Turkish",
            mode: "replace",
          })
        : textGenerate("Remembered.");
    });
    const agent = new Agent({
      name: "WorkingMemoryAgent",
      instructions: "Remember useful user preferences.",
      model,
      memory,
    });
    await memory.createConversation({
      id: "wm-conversation",
      userId: "wm-user",
      resourceId: agent.id,
      title: "Working Memory E2E",
      metadata: {},
    });

    const result = await agent.generateText("Remember that I prefer Turkish.", {
      userId: "wm-user",
      conversationId: "wm-conversation",
    });
    const workingMemory = await memory.getWorkingMemory({
      userId: "wm-user",
      conversationId: "wm-conversation",
    });

    expect(result.text).toBe("Remembered.");
    expect(workingMemory).toBe("Preferred language: Turkish");
  });

  it("routes hidden tools through searchTools and callTool", async () => {
    const hiddenExecute = vi.fn(async ({ query }: { query: string }) => ({
      answer: `found:${query}`,
    }));
    const hiddenLookup = createTool({
      name: "hiddenLookup",
      description: "Find hidden documentation",
      tags: ["docs"],
      parameters: z.object({
        query: z.string(),
      }),
      execute: hiddenExecute,
    });

    let generateCalls = 0;
    const model = createModel(async () => {
      generateCalls += 1;
      if (generateCalls === 1) {
        return toolCallGenerate("searchTools", { query: "hidden documentation", topK: 1 });
      }
      if (generateCalls === 2) {
        return toolCallGenerate("callTool", {
          name: "hiddenLookup",
          args: { query: "docs" },
        });
      }
      return textGenerate("Routed result ready.");
    });
    const agent = new Agent({
      name: "ToolRoutingAgent",
      instructions: "Use routed tools.",
      model,
      tools: [hiddenLookup],
      toolRouting: {
        topK: 1,
      },
    });

    const result = await agent.generateText("Find hidden docs.");
    const hiddenOptions = hiddenExecute.mock.calls[0]?.[1] as
      | { toolContext?: { callId?: string } }
      | undefined;

    expect(result.text).toBe("Routed result ready.");
    expect(hiddenExecute).toHaveBeenCalledTimes(1);
    expect(hiddenExecute.mock.calls[0]?.[0]).toEqual({ query: "docs" });
    expect(hiddenOptions?.toolContext?.callId).toEqual(expect.any(String));
  });

  it("applies toolApproval to tool routing pool calls", async () => {
    const execute = vi.fn(async ({ query }: { query: string }) => ({ answer: query }));
    const hiddenLookup = createTool({
      name: "approvalHiddenLookup",
      description: "Find hidden data after approval",
      parameters: z.object({
        query: z.string(),
      }),
      execute,
    });

    let generateCalls = 0;
    const model = createModel(async () => {
      generateCalls += 1;
      if (generateCalls === 1) {
        return toolCallGenerate("searchTools", { query: "hidden approval lookup", topK: 1 });
      }
      if (generateCalls === 2) {
        return toolCallGenerate("callTool", {
          name: "approvalHiddenLookup",
          args: { query: "secret" },
        });
      }
      return textGenerate("Hidden tool was not executed.");
    });
    const agent = new Agent({
      name: "ToolRoutingApprovalAgent",
      instructions: "Use routed tools with approval.",
      model,
      tools: [hiddenLookup],
      toolRouting: {
        topK: 1,
      },
    });

    const result = await agent.generateText("Find hidden approved data.", {
      toolApproval: {
        approvalHiddenLookup: "user-approval",
      },
    });

    expect(result.text).toBe("Hidden tool was not executed.");
    expect(execute).not.toHaveBeenCalled();
    expect(result.toolResults[1]?.toolName).toBe("callTool");
    expect(result.toolResults[1]?.output).toMatchObject({
      error: true,
      code: "TOOL_APPROVAL_REQUIRED",
      name: "approvalHiddenLookup",
    });
  });
});
