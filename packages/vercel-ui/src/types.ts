import type * as VercelAI from "ai";
import type * as VercelAIv5 from "ai-v5";

/**
 * A VoltAgent UIMessage for integrating with the Vercel AI SDK v4 and v5. Currently ONLY v4 is supported.
 */
export type UIMessage<
  TVersion extends VercelVersion = "v4",
  // ONLY used for V5
  TMetadata = unknown,
  // ONLY used for V5
  TDataParts extends VercelAIv5.UIDataTypes = VercelAIv5.UIDataTypes,
> = TVersion extends "v4" ? VercelV4UIMessage : VercelV5UIMessage<TMetadata, TDataParts>;

/**
 * Modified Vercel AI SDK V4 UIMessage type for VoltAgent. Certain deprecated fields are removed by default (i.e. `data` and `toolInvocations`) and this more closely matches the Vercel AI SDK V5 UIMessage type.
 */
export type VercelV4UIMessage = Omit<VercelAI.UIMessage, "id" | "data" | "toolInvocations"> & {
  id: string;
};

/**
 * Modified Vercel AI SDK V5 UIMessage type for VoltAgent.
 */
export type VercelV5UIMessage<
  TMetadata = unknown,
  TDataParts extends VercelAIv5.UIDataTypes = VercelAIv5.UIDataTypes,
> = VercelAIv5.UIMessage<TMetadata, TDataParts>;

/**
 * The supported versions of the Vercel AI SDK. Currently, only V4 is supported, but the
 * v5 types are provided for future compatibility.
 */
export type VercelVersion = "v4" | "v5";
