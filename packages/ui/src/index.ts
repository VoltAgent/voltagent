import { appendResponseMessages } from "ai";
import type * as VercelAIv5 from "ai-v5";
import { P, match } from "ts-pattern";
import type { BaseMessage, StepWithContent } from "../../core/src/agent/providers";
import { generateMessageId } from "../../core/src/utils/internal/identifiers";
import { hasKey, isDate, isString } from "../../core/src/utils/internal/utils";
import type { UIMessage, VercelVersion } from "./types";

export interface ConvertToUIMessagesOptions<TVersion extends VercelVersion = VercelVersion> {
  version: TVersion;
}

/**
 * Convert a list of messages to a list of UIMessages.
 * @param messages - The input message(s) to convert.
 * @param steps - The steps to convert from the agent/provider.
 * @param options - The options for the conversion.
 * @returns The converted messages.
 */
export function convertToUIMessages(
  messages: BaseMessage[],
  steps: StepWithContent[],
  options?: ConvertToUIMessagesOptions<"v4">,
): Array<UIMessage<"v4">>;
export function convertToUIMessages<
  TMetadata = unknown,
  TDataParts extends VercelAIv5.UIDataTypes = VercelAIv5.UIDataTypes,
>(
  messages: BaseMessage[],
  steps: StepWithContent[],
  options?: ConvertToUIMessagesOptions<"v5">,
): Array<UIMessage<"v5", TMetadata, TDataParts>>;
export function convertToUIMessages<
  TMetadata = unknown,
  TDataParts extends VercelAIv5.UIDataTypes = VercelAIv5.UIDataTypes,
>(
  messages: BaseMessage[],
  steps: StepWithContent[],
  options?: ConvertToUIMessagesOptions,
): Array<UIMessage<"v4">> | Array<UIMessage<"v5", TMetadata, TDataParts>> {
  if (options?.version === "v5") {
    throw new Error("V5 is not supported yet");
  }

  return convertToV4UIMessages(messages, steps);
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
        ({ createdAt }) => (isDate(createdAt) ? createdAt : new Date()),
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
            toolName: step.name!,
            args: step.arguments,
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
            toolName: step.name!,
            result: step.result,
          },
        ],
      }))
      .with({ type: "text" }, (step) => ({
        id: step.id,
        role: "assistant",
        content: [{ type: "text", text: step.content }],
      }))
      .exhaustive();
  }) satisfies VercelResponseMessage[];

  // @ts-expect-error - TODO: fix this
  return appendResponseMessages({
    messages: inputMessages,
    responseMessages,
  }).map((message) => ({
    ...message,
  }));
}

type VercelResponseMessage = Parameters<
  typeof appendResponseMessages
>[0]["responseMessages"][number];

function getId(message: unknown): string {
  if (hasKey(message, "id") && isString(message.id)) {
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
