import { Agent, Memory, createTool } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { type LanguageModel, type ModelMessage, type UIMessage, convertToModelMessages } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { z } from "zod";

const userId = "issue-1336-user";
const conversationId = "issue-1336-conversation";
const toolCallId = "toolu_issue_1336";
const toolName = "createImageFromText";

const malformedToolInput =
  '{"prompts":["Full body portrait of a 5\'7" woman"],"imageSize":"1024x1536"}';

const storage = new LibSQLMemoryAdapter({
  url: ":memory:",
});

const memory = new Memory({
  storage,
});

type ReplayedToolCall = {
  type: "tool-call";
  input?: unknown;
};

function describeInputType(input: unknown) {
  return Array.isArray(input) ? "array" : typeof input;
}

function findReplayedToolCall(modelMessages: ModelMessage[]) {
  return modelMessages
    .flatMap((message) => {
      const content = (message as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .find(
      (part): part is ReplayedToolCall =>
        typeof part === "object" &&
        part !== null &&
        (part as { type?: unknown }).type === "tool-call",
    );
}

function createImageFromTextTool() {
  return createTool({
    name: toolName,
    description: "Create images from text prompts.",
    parameters: z.object({
      prompts: z.array(z.string()),
      imageSize: z.string(),
    }),
    execute: async ({ prompts, imageSize }) => ({ prompts, imageSize }),
  });
}

function createMockModel(): LanguageModel {
  return new MockLanguageModelV3({
    modelId: "issue-1336-mock-model",
    doGenerate: {
      content: [{ type: "text", text: "Mock response" }],
      finishReason: "stop" as const,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        inputTokenDetails: {
          noCacheTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        },
        outputTokenDetails: {
          textTokens: 0,
          reasoningTokens: 0,
        },
      },
      warnings: [],
    } as any,
  }) as unknown as LanguageModel;
}

const messages: UIMessage[] = [
  {
    id: "issue-1336-user-message",
    role: "user",
    parts: [{ type: "text", text: "Create the image." }],
  },
  {
    id: "issue-1336-assistant-message",
    role: "assistant",
    parts: [
      {
        type: `tool-${toolName}`,
        toolCallId,
        state: "output-available",
        input: malformedToolInput,
        output: {
          type: "error-text",
          value:
            "Invalid input for tool createImageFromText: JSON parsing failed: Expected ',' or ']' after array element",
        },
        providerExecuted: false,
      } as UIMessage["parts"][number],
    ],
  },
];

function findToolPart(uiMessages: UIMessage[]) {
  return uiMessages
    .flatMap((message) => message.parts)
    .find((part) => part.type === `tool-${toolName}`) as
    | (UIMessage["parts"][number] & { input?: unknown })
    | undefined;
}

async function seedMemory() {
  await memory.createConversation({
    id: conversationId,
    resourceId: "issue-1336-repro",
    userId,
    title: "Issue 1336 repro",
    metadata: { issue: 1336 },
  });

  await memory.addMessages(messages, userId, conversationId);
}

async function inspectReplay() {
  const storedMessages = await memory.getMessages(userId, conversationId);
  const storedToolPart = findToolPart(storedMessages);

  console.log("Stored UI tool input type:", describeInputType(storedToolPart?.input));
  console.dir(storedToolPart, { depth: null });

  const modelMessages = await convertToModelMessages(storedMessages);
  const replayedToolCall = findReplayedToolCall(modelMessages);

  console.log(
    "Direct AI SDK replayed model tool input type:",
    describeInputType(replayedToolCall?.input),
  );
  console.dir(replayedToolCall, { depth: null });
}

async function inspectVoltAgentReplay() {
  let preparedModelMessages: ModelMessage[] = [];
  const agent = new Agent({
    name: "Issue 1336 Mock Replay Agent",
    instructions: "Continue the conversation briefly.",
    model: createMockModel(),
    tools: [createImageFromTextTool()],
    memory,
    hooks: {
      onPrepareModelMessages: async ({ modelMessages }) => {
        preparedModelMessages = modelMessages;
        return {};
      },
    },
  });

  await agent.generateText("continue", {
    memory: {
      userId,
      conversationId,
      options: {
        readOnly: true,
      },
    },
  });

  const replayedToolCall = findReplayedToolCall(preparedModelMessages);
  console.log(
    "VoltAgent sanitized model tool input type:",
    describeInputType(replayedToolCall?.input),
  );
  console.dir(replayedToolCall, { depth: null });
}

async function replayAgainstAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("Set ANTHROPIC_API_KEY to replay this seeded history against Anthropic.");
    return;
  }

  const agent = new Agent({
    name: "Issue 1336 Repro Agent",
    instructions: "Continue the conversation briefly.",
    model: process.env.REPRO_1336_MODEL ?? "anthropic/claude-opus-4-1",
    tools: [createImageFromTextTool()],
    memory,
  });

  try {
    await agent.generateText("continue", {
      memory: {
        userId,
        conversationId,
        options: {
          readOnly: true,
        },
      },
    });
    console.log(
      "Provider accepted the replayed history; the bug may be fixed or model behavior changed.",
    );
  } catch (error) {
    console.error("Provider replay failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

try {
  await seedMemory();
  await inspectReplay();
  await inspectVoltAgentReplay();
  await replayAgainstAnthropic();
} finally {
  await storage.close();
}

process.exit(process.exitCode ?? 0);
