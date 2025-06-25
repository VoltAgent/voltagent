import type { Simplify } from "type-fest";
import type {
  ErrorStreamPart,
  FinishStreamPart,
  ReasoningStreamPart,
  SourceStreamPart,
  StreamPart,
  TextDeltaStreamPart,
  ToolCallStreamPart,
  ToolResultStreamPart,
} from "../../agent/providers";

export type StreamEventType = StreamEvent["type"];

export type StreamEvent =
  | StreamEventTextDelta
  | StreamEventReasoning
  | StreamEventSource
  | StreamEventToolCall
  | StreamEventToolResult
  | StreamEventFinish
  | StreamEventError;

export type StreamEventTextDelta = InferStreamEventBase<TextDeltaStreamPart>;

export type StreamEventReasoning = InferStreamEventBase<ReasoningStreamPart>;

export type StreamEventSource = InferStreamEventBase<SourceStreamPart>;

export type StreamEventToolCall = InferStreamEventBase<ToolCallStreamPart>;

export type StreamEventToolResult = InferStreamEventBase<ToolResultStreamPart>;

export type StreamEventFinish = InferStreamEventBase<FinishStreamPart>;

export type StreamEventError = InferStreamEventBase<ErrorStreamPart>;

type InferStreamEventBase<TStreamPart extends StreamPart> = {
  type: TStreamPart["type"];
  data: InferStreamEventData<TStreamPart> | null;
  timestamp: string;
  subAgentId: string;
  subAgentName: string;
};

type InferStreamEventData<TStreamPart extends StreamPart> = Simplify<
  Omit<TStreamPart, "type" | "subAgentId" | "subAgentName">
>;
