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

  const normalized: Record<string, unknown> = {
    type: "text",
    text,
  };

  if ((part as any).providerMetadata) {
    normalized.providerMetadata = safeClone((part as any).providerMetadata);
  }

  if ((part as any).state) {
    normalized.state = (part as any).state;
  }

  return normalized as UIMessagePart<any, any>;
};

const sanitizeReasoningProviderMetadata = (
  providerMetadata: unknown,
): Record<string, unknown> | undefined => {
  if (!isObject(providerMetadata) || Array.isArray(providerMetadata)) {
    return undefined;
  }

  const cloned = safeClone(providerMetadata) as Record<string, unknown>;
  if (Object.keys(cloned).length === 0) {
    return undefined;
  }
  return cloned;
};

const extractReasoningIdFromMetadata = (metadata: Record<string, unknown>): string | undefined => {
  const visit = (value: unknown, hasReasoningContext: boolean): string | undefined => {
    if (Array.isArray(value)) {
      for (const element of value) {
        const found = visit(element, hasReasoningContext);
        if (found) return found;
      }
      return undefined;
    }

    if (!isObject(value)) {
      return undefined;
    }

    for (const [key, child] of Object.entries(value)) {
      const keyHasReasoningContext = hasReasoningContext || /reasoning/i.test(key);

      if (typeof child === "string") {
        const trimmed = child.trim();
        if (
          trimmed &&
          keyHasReasoningContext &&
          (/(^|_)id$/i.test(key) || /trace/i.test(key) || /id$/i.test(key))
        ) {
          return trimmed;
        }
      } else {
        const found = visit(child, keyHasReasoningContext);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  };

  return visit(metadata, false);
};

const normalizeReasoning = (part: TextLikePart) => {
  const text = typeof part.text === "string" ? part.text : "";
  const explicitReasoningId =
    typeof (part as any).reasoningId === "string" ? (part as any).reasoningId : "";

  const providerMetadata = sanitizeReasoningProviderMetadata((part as any).providerMetadata);
  const metadataReasoningId =
    providerMetadata && isObject(providerMetadata)
      ? extractReasoningIdFromMetadata(providerMetadata)
      : undefined;

  const reasoningId = explicitReasoningId || metadataReasoningId || "";

  if (!text.trim() && !reasoningId.trim()) {
    return null;
  }

  const normalized: Record<string, unknown> = {
    type: "reasoning",
    text,
  };

  if (reasoningId) {
    normalized.reasoningId = reasoningId;
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

const normalizeToolOutputPayload = (output: unknown): unknown => {
  if (Array.isArray(output)) {
    return output.map((item) => normalizeToolOutputPayload(item));
  }

  if (!isObject(output)) {
    return output;
  }

  const candidate = output as Record<string, unknown>;
  if ("value" in candidate) {
    const type = candidate.type;
    if (typeof type === "string" && type.toLowerCase().includes("json")) {
      return normalizeToolOutputPayload(candidate.value);
    }
  }

  return output;
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
  if (part.output !== undefined) {
    normalized.output = safeClone(normalizeToolOutputPayload(part.output));
  }
  if (part.providerExecuted !== undefined) normalized.providerExecuted = part.providerExecuted;
  if (part.isError !== undefined) normalized.isError = part.isError;
  if (part.errorText !== undefined) normalized.errorText = part.errorText;
  const callProviderMetadata = sanitizeReasoningProviderMetadata(
    (part as any).callProviderMetadata,
  );
  if (callProviderMetadata) {
    normalized.callProviderMetadata = callProviderMetadata;
  }
  const providerMetadata = sanitizeReasoningProviderMetadata((part as any).providerMetadata);
  if (providerMetadata) {
    normalized.providerMetadata = providerMetadata;
  }

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
  const withoutDanglingTools = removeProviderExecutedToolsWithoutReasoning(pruned);
  const normalizedParts = stripReasoningLinkedProviderMetadata(withoutDanglingTools);

  const effectiveParts = normalizedParts.filter((part) => {
    if (part.type === "text") {
      return typeof (part as any).text === "string" && (part as any).text.trim().length > 0;
    }
    if (part.type === "reasoning") {
      const text = typeof (part as any).text === "string" ? (part as any).text.trim() : "";
      const reasoningId =
        typeof (part as any).reasoningId === "string" ? (part as any).reasoningId.trim() : "";
      return text.length > 0 || reasoningId.length > 0;
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

const removeProviderExecutedToolsWithoutReasoning = (
  parts: UIMessagePart<any, any>[],
): UIMessagePart<any, any>[] => {
  const hasReasoning = parts.some((part) => part.type === "reasoning");
  if (hasReasoning) {
    return parts;
  }

  const hasProviderExecutedTool = parts.some(
    (part) =>
      typeof part.type === "string" &&
      part.type.startsWith("tool-") &&
      (part as any).providerExecuted === true,
  );

  if (!hasProviderExecutedTool) {
    return parts;
  }

  return parts.filter(
    (part) =>
      !(
        typeof part.type === "string" &&
        part.type.startsWith("tool-") &&
        (part as any).providerExecuted === true
      ),
  );
};

const stripReasoningLinkedProviderMetadata = (
  parts: UIMessagePart<any, any>[],
): UIMessagePart<any, any>[] => {
  const hasReasoning = parts.some((part) => part.type === "reasoning");
  if (hasReasoning) {
    return parts;
  }

  const stripMetadata = (metadata: unknown): Record<string, unknown> | undefined => {
    if (!isObject(metadata)) {
      return undefined;
    }
    const cloned = { ...(metadata as Record<string, unknown>) };
    const openaiMetadata = cloned.openai;
    if (
      !isObject(openaiMetadata) ||
      !(
        "itemId" in openaiMetadata ||
        "reasoning_trace_id" in openaiMetadata ||
        ("reasoning" in openaiMetadata &&
          isObject((openaiMetadata as Record<string, unknown>).reasoning))
      )
    ) {
      return metadata as Record<string, unknown>;
    }
    const { openai, ...cleanedMetadata } = cloned;
    return Object.keys(cleanedMetadata).length > 0 ? cleanedMetadata : undefined;
  };

  let mutated = false;
  const result = parts.map((part) => {
    let updated = false;
    const nextPart: Record<string, unknown> = { ...(part as any) };

    const applyStrip = (key: "providerMetadata" | "callProviderMetadata") => {
      const current = (part as any)[key];
      const cleaned = stripMetadata(current);
      if (cleaned === undefined && current === undefined) {
        return;
      }
      if (cleaned === current) {
        return;
      }
      if (!updated) {
        updated = true;
      }
      if (cleaned) {
        nextPart[key] = cleaned;
      } else {
        delete nextPart[key];
      }
    };

    applyStrip("providerMetadata");
    applyStrip("callProviderMetadata");

    if (!updated) {
      return part;
    }

    mutated = true;
    return nextPart as UIMessagePart<any, any>;
  });

  return mutated ? (result as UIMessagePart<any, any>[]) : parts;
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
