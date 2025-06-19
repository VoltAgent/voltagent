import type { LanguageModelV1FinishReason, LanguageModelV1Source } from "@ai-sdk/provider";
import type { DataStreamPart, JSONValue, ToolCall, ToolResult } from "ai";

export type DataStreamPartType = DataStreamPartDefinition["type"];

export type DataStreamPartValueType = {
  [P in DataStreamParts as P["name"]]: ReturnType<P["parse"]>["value"];
};

export type DataStreamPartDefinition = ReturnType<DataStreamParts["parse"]>;

// Copied from `@ai-sdk/ui-utils`
// TODO: Remove once https://github.com/vercel/ai/pull/6792 is merged
export type DataStreamParts =
  | DataStreamPart<"0", "text", string>
  | DataStreamPart<"2", "data", JSONValue[]>
  | DataStreamPart<"3", "error", string>
  | DataStreamPart<"8", "message_annotations", JSONValue[]>
  | DataStreamPart<"9", "tool_call", ToolCall<string, any>>
  | DataStreamPart<"a", "tool_result", Omit<ToolResult<string, any, any>, "args" | "toolName">>
  | DataStreamPart<
      "b",
      "tool_call_streaming_start",
      {
        toolCallId: string;
        toolName: string;
      }
    >
  | DataStreamPart<
      "c",
      "tool_call_delta",
      {
        toolCallId: string;
        argsTextDelta: string;
      }
    >
  | DataStreamPart<
      "d",
      "finish_message",
      {
        finishReason: LanguageModelV1FinishReason;
        usage?: {
          promptTokens: number;
          completionTokens: number;
        };
      }
    >
  | DataStreamPart<
      "e",
      "finish_step",
      {
        isContinued: boolean;
        finishReason: LanguageModelV1FinishReason;
        usage?: {
          promptTokens: number;
          completionTokens: number;
        };
      }
    >
  | DataStreamPart<
      "f",
      "start_step",
      {
        messageId: string;
      }
    >
  | DataStreamPart<"g", "reasoning", string>
  | DataStreamPart<"h", "source", LanguageModelV1Source>
  | DataStreamPart<
      "i",
      "redacted_reasoning",
      {
        data: string;
      }
    >
  | DataStreamPart<
      "j",
      "reasoning_signature",
      {
        signature: string;
      }
    >
  | DataStreamPart<
      "k",
      "file",
      {
        data: string;
        mimeType: string;
      }
    >;
