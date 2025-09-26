import type { UIMessage, UIMessagePart } from "ai";

const WORKING_MEMORY_TOOL_NAMES = new Set([
  "update_working_memory",
  "get_working_memory",
  "clear_working_memory",
]);

type ToolLikePart = UIMessagePart<any, any> & {
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  providerExecuted?: boolean;
  isError?: boolean;
  errorText?: string;
};

type TextLikePart = UIMessagePart<any, any> & {
  text?: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const safeClone = <T>(value: T): T => {
  if (!isObject(value) && !Array.isArray(value)) {
    return value;
  }

  const structuredCloneImpl = (globalThis as any).structuredClone as
    | (<TValue>(input: TValue) => TValue)
    | undefined;

  if (typeof structuredCloneImpl === "function") {
    return structuredCloneImpl(value);
  }

  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (_error) {
    if (Array.isArray(value)) {
      return value.slice() as T;
    }
    return { ...(value as Record<string, unknown>) } as T;
  }
};

const normalizeText = (part: TextLikePart) => {
  const text = typeof part.text === "string" ? part.text : "";
  if (!text.trim()) {
    return null;
  }

  return {
    type: "text",
    text,
  } as UIMessagePart<any, any>;
};

const normalizeReasoning = (part: TextLikePart) => {
  const text = typeof part.text === "string" ? part.text : "";
  if (!text.trim()) {
    return null;
  }

  const normalized: Record<string, unknown> = {
    type: "reasoning",
    text,
  };

  if ((part as any).reasoningId) {
    normalized.reasoningId = (part as any).reasoningId;
  }
  if ((part as any).reasoningConfidence !== undefined) {
    normalized.reasoningConfidence = (part as any).reasoningConfidence;
  }

  return normalized as UIMessagePart<any, any>;
};

const toolNameFromType = (type: unknown): string | undefined => {
  if (typeof type !== "string") return undefined;
  if (!type.startsWith("tool-")) return undefined;
  return type.slice("tool-".length);
};

const isWorkingMemoryTool = (part: ToolLikePart): boolean => {
  const toolName = toolNameFromType((part as any).type);
  if (!toolName) return false;
  return WORKING_MEMORY_TOOL_NAMES.has(toolName);
};

const normalizeToolPart = (part: ToolLikePart): UIMessagePart<any, any> | null => {
  if (isWorkingMemoryTool(part)) {
    return null;
  }

  const toolName = toolNameFromType((part as any).type);
  if (!toolName) {
    return safeClone(part) as UIMessagePart<any, any>;
  }

  const normalized: Record<string, unknown> = {
    type: `tool-${toolName}`,
  };

  if (part.toolCallId) normalized.toolCallId = part.toolCallId;
  if (part.state) normalized.state = part.state;
  if (part.input !== undefined) normalized.input = safeClone(part.input);
  if (part.output !== undefined) normalized.output = safeClone(part.output);
  if (part.providerExecuted !== undefined) normalized.providerExecuted = part.providerExecuted;
  if (part.isError !== undefined) normalized.isError = part.isError;
  if (part.errorText !== undefined) normalized.errorText = part.errorText;

  return normalized as UIMessagePart<any, any>;
};

export const sanitizeMessagesForModel = (messages: UIMessage[]): UIMessage[] =>
  messages
    .map((message) => sanitizeMessageForModel(message))
    .filter((message): message is UIMessage => Boolean(message));

export const sanitizeMessageForModel = (message: UIMessage): UIMessage | null => {
  const sanitizedParts: UIMessagePart<any, any>[] = [];

  for (const part of message.parts) {
    const normalized = normalizeGenericPart(part);
    if (!normalized) {
      continue;
    }
    sanitizedParts.push(normalized);
  }

  const pruned = collapseRedundantStepStarts(pruneEmptyToolRuns(sanitizedParts));

  const effectiveParts = pruned.filter((part) => {
    if (part.type === "text") {
      return typeof (part as any).text === "string" && (part as any).text.trim().length > 0;
    }
    if (part.type === "reasoning") {
      return typeof (part as any).text === "string" && (part as any).text.trim().length > 0;
    }
    if (typeof part.type === "string" && part.type.startsWith("tool-")) {
      return Boolean((part as any).toolCallId);
    }
    if (part.type === "file") {
      return Boolean((part as any).url);
    }
    return true;
  });

  if (!effectiveParts.length) {
    return null;
  }

  return {
    ...message,
    parts: effectiveParts,
    ...(message.metadata ? { metadata: safeClone(message.metadata) } : {}),
  };
};

const normalizeGenericPart = (part: UIMessagePart<any, any>): UIMessagePart<any, any> | null => {
  switch (part.type) {
    case "text":
      return normalizeText(part);
    case "reasoning":
      return normalizeReasoning(part);
    case "step-start":
      return { type: "step-start" } as UIMessagePart<any, any>;
    case "file": {
      if (!isObject(part as any) || !(part as any).url) {
        return null;
      }
      const cloned = safeClone(part as any);
      return cloned as UIMessagePart<any, any>;
    }
    default:
      if (typeof part.type === "string" && part.type.startsWith("tool-")) {
        return normalizeToolPart(part);
      }

      return safeClone(part);
  }
};

const pruneEmptyToolRuns = (parts: UIMessagePart<any, any>[]): UIMessagePart<any, any>[] => {
  const cleaned: UIMessagePart<any, any>[] = [];
  for (const part of parts) {
    if (typeof part.type === "string" && part.type.startsWith("tool-")) {
      const hasPendingState = (part as any).state === "input-available";
      const hasResult =
        (part as any).state === "output-available" || (part as any).output !== undefined;
      if (!hasPendingState && !hasResult && (part as any).input == null) {
        continue;
      }
    }

    cleaned.push(part);
  }
  return cleaned;
};

const collapseRedundantStepStarts = (
  parts: UIMessagePart<any, any>[],
): UIMessagePart<any, any>[] => {
  const result: UIMessagePart<any, any>[] = [];
  for (const part of parts) {
    if (part.type === "step-start") {
      const prev = result.at(-1);
      if (!prev || prev.type === "step-start") {
        continue;
      }
    }

    result.push(part);
  }
  return result;
};
