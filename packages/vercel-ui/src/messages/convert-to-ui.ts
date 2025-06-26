import type { BaseMessage, OperationContext, StepWithContent } from "@voltagent/core";
import type * as VercelAIv5 from "ai-v5";
import { P, match } from "ts-pattern";
import {
  type VercelResponseMessage,
  appendResponseMessages,
} from "../internal/append-response-messages";
import { buildSubAgentData } from "../internal/utils";
import type { UIMessage, UIMessagePart, VercelVersion } from "../types";
import { rejectStepsWithContent, rejectUIMessageParts } from "../utils/filters";
import { isSubAgent } from "../utils/guards";
import { generateMessageId, hasKey } from "../utils/identifiers";
import schemas from "../utils/patterns";
import { removeAgentPrefix } from "../utils/tools";

export interface ConvertToUIMessagesOptions<TVersion extends VercelVersion = VercelVersion> {
  /**
   * The parts to exclude from the UIMessages.
   *
   * By default all messages are included.
   */
  excludeMessageParts?: (part: UIMessagePart) => boolean;
  /**
   * The steps to exclude from the UIMessages.
   *
   * By default the non-tool related steps for sub-agents is excluded while all other steps are included.
   */
  excludeSteps?: (step: StepWithContent) => boolean;
  /**
   * Only v4 is supported currently, v5 is not implemented yet.
   *
   * @default "v4"
   */
  version?: TVersion;
}

/**
 * Convert a list of messages to a list of UIMessages.
 *
 * @example
 * ```typescript
 * new Agent({
 *   ...
 *   hooks: {
 *     onFinish: async (result) => {
 *       await chatStore.save({
 *         conversationId: result.conversationId,
 *         messages: convertToUIMessages(result.operationContext),
 *       })
 *     }
 *   }
 *   ...
 * })
 * ```
 *
 * @param operationContext - The operation context to convert.
 * @param options - The options for the conversion.
 * @returns The converted messages.
 */
export function convertToUIMessages(
  operationContext: OperationContext,
  options?: ConvertToUIMessagesOptions<"v4">,
): Array<UIMessage<"v4">>;
export function convertToUIMessages<
  TMetadata = unknown,
  TDataParts extends VercelAIv5.UIDataTypes = VercelAIv5.UIDataTypes,
>(
  operationContext: OperationContext,
  options?: ConvertToUIMessagesOptions<"v5">,
): Array<UIMessage<"v5", TMetadata, TDataParts>>;
export function convertToUIMessages<
  TMetadata = unknown,
  TDataParts extends VercelAIv5.UIDataTypes = VercelAIv5.UIDataTypes,
>(
  operationContext: OperationContext,
  options?: ConvertToUIMessagesOptions,
): Array<UIMessage<"v4">> | Array<UIMessage<"v5", TMetadata, TDataParts>> {
  const messages = match(operationContext.historyEntry.input)
    .returnType<BaseMessage[]>()
    .with(P.string, (input) => {
      return [{ role: "user", content: input }];
    })
    .with(P.array(schemas.message), (input) => {
      return input;
    })
    .with(schemas.message, (input) => {
      return [input as BaseMessage];
    })
    .otherwise(() => {
      return [];
    });

  // the default exclude is to remove the non-tool related parts for sub-agents while keeping all other parts
  const excludeMessageParts = match(options?.excludeMessageParts)
    .returnType<(part: UIMessagePart) => boolean>()
    .with(P.not(P.nullish), (predicate) => predicate)
    .otherwise(() => (_part) => false);

  const excludeSteps = match(options?.excludeSteps)
    .returnType<(step: StepWithContent) => boolean>()
    .with(P.not(P.nullish), (predicate) => predicate)
    .otherwise(() => (step) => {
      if (isSubAgent(step)) {
        return step.type !== "tool_call" && step.type !== "tool_result";
      }
      return false;
    });

  const steps = match(operationContext.conversationSteps)
    .returnType<StepWithContent[]>()
    .with(P.nullish, () => {
      return [];
    })
    .otherwise((steps) => {
      return steps;
    });

  if (options?.version === "v5") {
    throw new Error("V5 is not supported yet");
  }

  return convertToV4UIMessages(messages, rejectStepsWithContent(steps, excludeSteps)).map(
    (message) => ({
      ...message,
      parts: rejectUIMessageParts(message, excludeMessageParts),
    }),
  );
}

/**
 * Convert a list of messages to a list of V4 UIMessages.
 * @param messages - The input message(s) to convert.
 * @param steps - The steps to convert from the agent/provider.
 * @returns The converted messages.
 */
function convertToV4UIMessages(
  messages: BaseMessage[],
  steps: StepWithContent[],
): Array<UIMessage<"v4">> {
  // Tools SHOULD NEVER be included as an input message
  const inputMessages = rejectToolMessages(messages).map((message) => ({
    id: getId(message),
    role: message.role,
    content: match(message.content)
      .with(P.string, (content) => content)
      .otherwise((content) => {
        return content
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("");
      }),
    createdAt: match(message)
      .when(
        (m) => hasKey(m, "createdAt"),
        /* c8 ignore next 1 */
        ({ createdAt }) => (createdAt instanceof Date ? createdAt : new Date()),
      )
      .otherwise(() => new Date()),
    parts: match(message.content)
      .returnType<UIMessage<"v4">["parts"]>()
      .with(P.string, (content) => {
        return [{ type: "text", text: content }];
      })
      .otherwise((content) => {
        return content.map((part) => {
          return match(part)
            .returnType<UIMessage<"v4">["parts"][number]>()
            .with({ type: "text" }, (p) => ({ type: "text", text: p.text }))
            .with({ type: "image" }, (p) => ({
              type: "file",
              data: p.image.toString(),
              /* c8 ignore next 1 */
              mimeType: p.mimeType ?? "image/png",
            }))
            .with({ type: "file" }, (p) => ({
              type: "file",
              data: p.data.toString(),
              mimeType: p.mimeType,
            }))
            .exhaustive();
        });
      }),
  })) satisfies UIMessage<"v4">[];

  const responseMessages = steps.map((step) => {
    return match(step)
      .returnType<VercelResponseMessage>()
      .with({ type: "tool_call" }, (step) => ({
        id: generateMessageId(),
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: step.id,
            // biome-ignore lint/style/noNonNullAssertion: this SHOULD always be defined
            toolName: removeAgentPrefix(step.name!),
            args: step.arguments,
            ...buildSubAgentData(step),
          },
        ],
      }))
      .with({ type: "tool_result" }, (step) => ({
        id: generateMessageId(),
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: step.id,
            // biome-ignore lint/style/noNonNullAssertion: this SHOULD always be defined
            toolName: removeAgentPrefix(step.name!),
            result: step.result,
            ...buildSubAgentData(step),
          },
        ],
      }))
      .with({ type: "text" }, (step) => ({
        id: step.id,
        role: "assistant",
        content: [{ type: "text", text: step.content }],
        ...buildSubAgentData(step),
      }))
      .exhaustive();
  }) satisfies VercelResponseMessage[];

  // We do this to build the final message with all the parts
  // combined using the vercel/ai appendResponseMessages function with some
  // additional parts & logic added
  const finalMessages = appendResponseMessages({
    messages: inputMessages,
    responseMessages,
  }).map((message) => ({
    ...message,
  }));

  return finalMessages;
}

function getId(message: unknown): string {
  if (hasKey(message, "id") && typeof message.id === "string") {
    return message.id;
  }
  return generateMessageId();
}

type InputMessage = BaseMessage & {
  role: Exclude<BaseMessage["role"], "tool">;
};

/**
 * Reject tool messages from the input messages.
 * @param messages - The input messages.
 * @returns The input messages without tool messages.
 */
function rejectToolMessages(messages: BaseMessage[]): Array<InputMessage> {
  return messages.filter((message) => message.role !== "tool") as Array<InputMessage>;
}
