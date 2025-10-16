import {
  type AsyncIterableStream,
  type InferUIMessageChunk,
  type TextStreamPart,
  type ToolSet,
  type UIMessage,
  type UIMessageStreamOptions,
  createUIMessageStream,
} from "ai";
import type { Agent } from "../agent";
import type { NormalizedOutputGuardrail, OutputGuardrailMetadata } from "../guardrail";
import type { VoltAgentTextStreamPart } from "../subagent/types";
import type { AgentEvalOperationType, OperationContext } from "../types";
import { OutputGuardrailStreamRunner } from "./output-guardrail-stream-runner";

export function createAsyncIterableReadable<T>(
  start: (controller: ReadableStreamDefaultController<T>) => void | Promise<void>,
): AsyncIterableStream<T> {
  const stream = new ReadableStream<T>({ start });
  return withAsyncIterator(stream);
}

export interface GuardrailStreamingContext {
  guardrails: NormalizedOutputGuardrail[];
  agent: Agent;
  operationContext: OperationContext;
  operation: AgentEvalOperationType;
}

export function sanitizeFinishStreamPart(
  finishPart: VoltAgentTextStreamPart | undefined,
  sanitizedText?: string,
): VoltAgentTextStreamPart | undefined {
  if (!finishPart || !sanitizedText || sanitizedText.length === 0) {
    return finishPart;
  }

  const cloned: Record<string, unknown> = { ...finishPart };

  if (typeof cloned.text === "string") {
    cloned.text = sanitizedText;
  }

  if (cloned.data && typeof cloned.data === "object") {
    cloned.data = { ...(cloned.data as Record<string, unknown>) };
    const dataRecord = cloned.data as Record<string, unknown>;
    if (typeof dataRecord.text === "string") {
      dataRecord.text = sanitizedText;
    }
  }

  if (cloned.response && typeof cloned.response === "object") {
    const response = { ...(cloned.response as Record<string, unknown>) };
    if (typeof response.output_text === "string") {
      response.output_text = sanitizedText;
    }
    if (Array.isArray(response.messages)) {
      response.messages = response.messages.map((message) => {
        if (!message || typeof message !== "object") {
          return message;
        }
        const typedMessage = { ...(message as Record<string, unknown>) };
        if (typedMessage.role === "assistant") {
          if (typeof typedMessage.content === "string") {
            typedMessage.content = sanitizedText;
          } else if (Array.isArray(typedMessage.content)) {
            typedMessage.content = [{ type: "text", text: sanitizedText }];
          } else {
            typedMessage.content = sanitizedText;
          }
        }
        return typedMessage;
      });
    }
    cloned.response = response;
  }

  return cloned as VoltAgentTextStreamPart;
}

type GuardrailPipelineUIFactory = <UI_MESSAGE extends UIMessage>(
  options?: UIMessageStreamOptions<UI_MESSAGE>,
) => AsyncIterableStream<InferUIMessageChunk<UI_MESSAGE>>;

export interface GuardrailPipeline {
  runner: OutputGuardrailStreamRunner | null;
  fullStream: AsyncIterableStream<VoltAgentTextStreamPart>;
  textStream: AsyncIterableStream<string>;
  createUIStream: GuardrailPipelineUIFactory;
  finalizePromise: Promise<void>;
}

export function createGuardrailPipeline(
  baseFullStream: AsyncIterable<VoltAgentTextStreamPart>,
  _baseTextStream: AsyncIterableStream<string>,
  context: GuardrailStreamingContext | null,
  _fallbackTextId = "guardrailed-output",
): GuardrailPipeline {
  if (!context || context.guardrails.length === 0) {
    return {
      runner: null,
      fullStream: iterableToStream(baseFullStream),
      textStream: _baseTextStream,
      createUIStream: <UI_MESSAGE extends UIMessage>(
        _options?: UIMessageStreamOptions<UI_MESSAGE>,
      ) => {
        throw new Error("Guardrail UI stream requested without active guardrails.");
      },
      finalizePromise: Promise.resolve(),
    };
  }

  const runner = new OutputGuardrailStreamRunner({
    guardrails: context.guardrails,
    agent: context.agent,
    operationContext: context.operationContext,
    operation: context.operation,
  });

  let finalizeResolve!: () => void;
  let finalizeReject!: (reason?: unknown) => void;
  const finalizePromise = new Promise<void>((resolve, reject) => {
    finalizeResolve = resolve;
    finalizeReject = reject;
  });

  const sanitizedReadable = createAsyncIterableReadable<VoltAgentTextStreamPart>(
    async (controller) => {
      let finishPart: VoltAgentTextStreamPart | undefined;

      try {
        for await (const part of baseFullStream) {
          const processedPart = await runner.processPart(part);

          if ((part as VoltAgentTextStreamPart).type === "finish") {
            finishPart = (processedPart ?? part) as VoltAgentTextStreamPart;
            break;
          }

          if (!processedPart) {
            continue;
          }

          controller.enqueue(processedPart);
        }

        const finalizeMetadata: OutputGuardrailMetadata = finishPart
          ? extractMetadataFromFinishPart(finishPart)
          : {};

        await runner.finalize(finalizeMetadata);

        if (finishPart) {
          const sanitizedFinish =
            sanitizeFinishStreamPart(finishPart, runner.getSanitizedText()) ?? finishPart;
          controller.enqueue(stripTextField(sanitizedFinish));
        }

        controller.close();
        finalizeResolve();
      } catch (error) {
        finalizeReject(error);
        controller.error(error);
      }
    },
  ) as ReadableStream<VoltAgentTextStreamPart>;

  const [fullReadable, branchReadable] = sanitizedReadable.tee();
  const [textReadable, uiReadableInitial] = branchReadable.tee();

  const fullStream = withAsyncIterator(fullReadable);

  const textStream = withAsyncIterator(
    new ReadableStream<string>({
      async start(controller) {
        const reader = textReadable.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            if (value?.type === "text-delta") {
              const chunk = getPartText(value);
              if (chunk) {
                controller.enqueue(chunk);
              }
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    }),
  );

  let uiReadable: ReadableStream<VoltAgentTextStreamPart> = uiReadableInitial;

  const createUIStream: GuardrailPipelineUIFactory = <UI_MESSAGE extends UIMessage>(
    options?: UIMessageStreamOptions<UI_MESSAGE>,
  ): AsyncIterableStream<InferUIMessageChunk<UI_MESSAGE>> => {
    const streamOptions = options ?? {};
    const onError = streamOptions.onError ?? defaultUIStreamError;

    const [currentReadable, nextReadable] = uiReadable.tee();
    uiReadable = nextReadable;

    const uiStream = createUIMessageStream<UI_MESSAGE>({
      originalMessages: streamOptions.originalMessages,
      onError,
      onFinish: streamOptions.onFinish,
      generateId: streamOptions.generateMessageId,
      execute: async ({ writer }) => {
        const reader = currentReadable.getReader();
        const responseMessageId =
          streamOptions.generateMessageId != null
            ? getResponseUIMessageId({
                originalMessages: streamOptions.originalMessages,
                responseMessageId: streamOptions.generateMessageId,
              })
            : undefined;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            if (!value) {
              continue;
            }

            const messageMetadataValue = streamOptions.messageMetadata?.({
              part: value as TextStreamPart<ToolSet>,
            });

            const chunk = convertFullStreamChunkToUIMessageStream<UI_MESSAGE>({
              part: value,
              messageMetadataValue,
              sendReasoning: streamOptions.sendReasoning ?? true,
              sendSources: streamOptions.sendSources ?? false,
              sendFinish: streamOptions.sendFinish ?? true,
              sendStart: streamOptions.sendStart ?? true,
              onError,
              responseMessageId,
            });

            if (chunk) {
              writer.write(chunk);
            }

            if (messageMetadataValue != null && value.type !== "start" && value.type !== "finish") {
              writer.write({
                type: "message-metadata",
                messageMetadata: messageMetadataValue,
              } as InferUIMessageChunk<UI_MESSAGE>);
            }
          }
        } catch (error) {
          writer.write({
            type: "error",
            errorText: onError(error),
          } as InferUIMessageChunk<UI_MESSAGE>);
        } finally {
          reader.releaseLock();
        }
      },
    });

    return withAsyncIterator(uiStream as ReadableStream<InferUIMessageChunk<UI_MESSAGE>>);
  };

  return {
    runner,
    fullStream,
    textStream,
    createUIStream,
    finalizePromise,
  };
}

function iterableToStream<T>(iterable: AsyncIterable<T>): AsyncIterableStream<T> {
  return createAsyncIterableReadable<T>(async (controller) => {
    try {
      for await (const item of iterable) {
        controller.enqueue(item);
      }
      controller.close();
    } catch (error) {
      controller.error(error);
    }
  });
}

function withAsyncIterator<T>(stream: ReadableStream<T>): AsyncIterableStream<T> {
  const asyncStream = stream as AsyncIterableStream<T>;
  if (!asyncStream[Symbol.asyncIterator]) {
    asyncStream[Symbol.asyncIterator] = async function* () {
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          if (value !== undefined) {
            yield value;
          }
        }
      } finally {
        reader.releaseLock();
      }
    };
  }
  return asyncStream;
}

function extractMetadataFromFinishPart(
  finishPart: VoltAgentTextStreamPart,
): OutputGuardrailMetadata {
  const metadata: OutputGuardrailMetadata = {};
  if ("totalUsage" in finishPart && finishPart.totalUsage !== undefined) {
    metadata.usage = finishPart.totalUsage;
  }
  if ("finishReason" in finishPart) {
    metadata.finishReason = finishPart.finishReason ?? null;
  }
  if ("warnings" in finishPart && finishPart.warnings !== undefined) {
    metadata.warnings = finishPart.warnings as unknown[];
  }
  return metadata;
}

function stripTextField(part: VoltAgentTextStreamPart): VoltAgentTextStreamPart {
  if (part.type !== "text-delta") {
    return part;
  }
  if ("text" in part) {
    const clone = { ...part } as VoltAgentTextStreamPart;
    (clone as { text?: unknown }).text = undefined;
    return clone;
  }
  return part;
}

function getPartText(part: VoltAgentTextStreamPart): string {
  if (part.type !== "text-delta") {
    return "";
  }
  const delta = (part as { delta?: string }).delta;
  if (typeof delta === "string") {
    return delta;
  }
  if (typeof part.text === "string") {
    return part.text;
  }
  return "";
}

function defaultUIStreamError(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An error occurred.";
}

function getResponseUIMessageId({
  originalMessages,
  responseMessageId,
}: {
  originalMessages: UIMessage[] | undefined;
  responseMessageId: UIMessageStreamOptions<UIMessage>["generateMessageId"];
}): string | undefined {
  if (!originalMessages || originalMessages.length === 0) {
    return typeof responseMessageId === "function" ? responseMessageId() : responseMessageId;
  }

  const lastMessage = originalMessages[originalMessages.length - 1];
  if (lastMessage?.role === "assistant") {
    return typeof lastMessage.id === "string" ? lastMessage.id : undefined;
  }

  return typeof responseMessageId === "function" ? responseMessageId() : responseMessageId;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: mirrors AI SDK chunk-to-UI mapping to preserve behaviour
function convertFullStreamChunkToUIMessageStream<UI_MESSAGE extends UIMessage>({
  part,
  messageMetadataValue,
  sendReasoning,
  sendSources,
  sendStart,
  sendFinish,
  onError,
  responseMessageId,
}: {
  part: VoltAgentTextStreamPart | { type: "tool-output"; toolCallId: string; output: any };
  messageMetadataValue?: unknown;
  sendReasoning: boolean;
  sendSources: boolean;
  sendStart: boolean;
  sendFinish: boolean;
  onError: (error: unknown) => string;
  responseMessageId?: string;
}): InferUIMessageChunk<UI_MESSAGE> | undefined {
  if (!sendReasoning && part.type === "reasoning-delta") {
    return;
  }

  if (!sendSources && part.type === "source") {
    return;
  }

  if (!sendStart && part.type === "start") {
    return;
  }

  if (!sendFinish && part.type === "finish") {
    return;
  }

  switch (part.type) {
    case "text-start": {
      return {
        type: "text-start",
        id: (part as { id?: string }).id,
        ...(part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}),
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "text-delta": {
      return {
        type: "text-delta",
        id: (part as { id?: string }).id,
        delta: getPartText(part as VoltAgentTextStreamPart),
        ...(part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}),
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "text-end": {
      return {
        type: "text-end",
        id: (part as { id?: string }).id,
        ...(part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}),
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "reasoning-start": {
      return {
        type: "reasoning-start",
        id: (part as { id?: string }).id,
        ...(part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}),
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "reasoning-delta": {
      return {
        type: "reasoning-delta",
        id: (part as { id?: string }).id,
        delta: getPartText(part as VoltAgentTextStreamPart),
        ...(part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}),
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "reasoning-end": {
      return {
        type: "reasoning-end",
        id: (part as { id?: string }).id,
        ...(part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}),
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "file": {
      return {
        type: "file",
        mediaType: (part as { file: { mediaType: string } }).file.mediaType,
        url: `data:${(part as { file: { mediaType: string } }).file.mediaType};base64,${
          (part as { file: { base64: string } }).file.base64
        }`,
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "source": {
      if ((part as { sourceType?: string }).sourceType === "url") {
        const typed = part as {
          id?: string;
          url?: string;
          title?: string;
          providerMetadata?: unknown;
        };
        return {
          type: "source-url",
          sourceId: typed.id,
          url: typed.url,
          title: typed.title,
          ...(typed.providerMetadata != null ? { providerMetadata: typed.providerMetadata } : {}),
        } as InferUIMessageChunk<UI_MESSAGE>;
      }

      if ((part as { sourceType?: string }).sourceType === "document") {
        const typed = part as {
          id?: string;
          mediaType?: string;
          title?: string;
          filename?: string;
          providerMetadata?: unknown;
        };
        return {
          type: "source-document",
          sourceId: typed.id,
          mediaType: typed.mediaType,
          title: typed.title,
          filename: typed.filename,
          ...(typed.providerMetadata != null ? { providerMetadata: typed.providerMetadata } : {}),
        } as InferUIMessageChunk<UI_MESSAGE>;
      }
      return;
    }

    case "tool-input-start": {
      const typed = part as {
        id?: string;
        toolName?: string;
        providerExecuted?: boolean;
        dynamic?: unknown;
      };
      return {
        type: "tool-input-start",
        toolCallId: typed.id,
        toolName: typed.toolName,
        ...(typed.providerExecuted != null ? { providerExecuted: typed.providerExecuted } : {}),
        ...(typed.dynamic != null ? { dynamic: typed.dynamic } : {}),
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "tool-input-delta": {
      const typed = part as { id?: string; delta?: string };
      return {
        type: "tool-input-delta",
        toolCallId: typed.id,
        inputTextDelta: typed.delta,
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "tool-call": {
      const typed = part as {
        toolCallId?: string;
        toolName?: string;
        input?: unknown;
        providerExecuted?: boolean;
        providerMetadata?: unknown;
        dynamic?: unknown;
      };
      return {
        type: "tool-input-available",
        toolCallId: typed.toolCallId,
        toolName: typed.toolName,
        input: typed.input,
        ...(typed.providerExecuted != null ? { providerExecuted: typed.providerExecuted } : {}),
        ...(typed.providerMetadata != null ? { providerMetadata: typed.providerMetadata } : {}),
        ...(typed.dynamic != null ? { dynamic: typed.dynamic } : {}),
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "tool-result": {
      const typed = part as {
        toolCallId?: string;
        output?: unknown;
        providerExecuted?: boolean;
        dynamic?: unknown;
      };
      return {
        type: "tool-output-available",
        toolCallId: typed.toolCallId,
        output: typed.output,
        ...(typed.providerExecuted != null ? { providerExecuted: typed.providerExecuted } : {}),
        ...(typed.dynamic != null ? { dynamic: typed.dynamic } : {}),
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "tool-error": {
      const typed = part as {
        toolCallId?: string;
        error?: unknown;
        providerExecuted?: boolean;
        dynamic?: unknown;
      };
      return {
        type: "tool-output-error",
        toolCallId: typed.toolCallId,
        errorText: onError(typed.error),
        ...(typed.providerExecuted != null ? { providerExecuted: typed.providerExecuted } : {}),
        ...(typed.dynamic != null ? { dynamic: typed.dynamic } : {}),
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "tool-output": {
      const typed = part as { toolCallId?: string; output: unknown };
      return {
        type: "tool-output-available",
        toolCallId: typed.toolCallId,
        output: typed.output,
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "error": {
      const typed = part as { error: unknown };
      return {
        type: "error",
        errorText: onError(typed.error),
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "start-step": {
      return { type: "start-step" } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "finish-step": {
      return { type: "finish-step" } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "start": {
      return {
        type: "start",
        ...(messageMetadataValue != null ? { messageMetadata: messageMetadataValue } : {}),
        ...(responseMessageId != null ? { messageId: responseMessageId } : {}),
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "finish": {
      return {
        type: "finish",
        ...(messageMetadataValue != null ? { messageMetadata: messageMetadataValue } : {}),
      } as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "abort": {
      return part as InferUIMessageChunk<UI_MESSAGE>;
    }

    case "tool-input-end":
    case "raw": {
      return;
    }

    default: {
      const exhaustiveCheck = part as never;
      const typeLabel =
        exhaustiveCheck && typeof exhaustiveCheck === "object" && "type" in exhaustiveCheck
          ? (exhaustiveCheck as Record<string, unknown>).type
          : "unknown";
      throw new Error(`Unknown stream chunk type: ${String(typeLabel)}`);
    }
  }
}
