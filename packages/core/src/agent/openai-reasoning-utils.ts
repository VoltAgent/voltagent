export const OPENAI_REASONING_ID_PREFIX = "rs_";

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isOpenAIReasoningId = (value: string): boolean =>
  value.trim().startsWith(OPENAI_REASONING_ID_PREFIX);

export const hasOpenAIItemId = (metadata: unknown): boolean => {
  if (!isObject(metadata)) {
    return false;
  }
  const openai = (metadata as { openai?: unknown }).openai;
  if (!isObject(openai)) {
    return false;
  }
  const itemId = typeof openai.itemId === "string" ? openai.itemId.trim() : "";
  return Boolean(itemId);
};

type OpenAIItemIdAccessors<TPart> = {
  getProviderMetadata: (part: TPart) => unknown;
  isToolPart?: (part: TPart) => boolean;
  getCallProviderMetadata?: (part: TPart) => unknown;
};

export const hasOpenAIItemIdForPart = <TPart>(
  part: TPart,
  accessors: OpenAIItemIdAccessors<TPart>,
): boolean => {
  if (accessors.isToolPart?.(part)) {
    const callProviderMetadata = accessors.getCallProviderMetadata?.(part);
    if (callProviderMetadata !== undefined && hasOpenAIItemId(callProviderMetadata)) {
      return true;
    }
  }
  return hasOpenAIItemId(accessors.getProviderMetadata(part));
};

type StripDanglingOpenAIReasoningOptions<TPart> = {
  isReasoningPart: (part: TPart) => boolean;
  hasOpenAIItemIdForPart: (part: TPart) => boolean;
  getNextPart: (parts: TPart[], index: number) => TPart | undefined;
};

export const stripDanglingOpenAIReasoningFromParts = <TPart>(
  parts: TPart[],
  options: StripDanglingOpenAIReasoningOptions<TPart>,
): { parts: TPart[]; changed: boolean } => {
  const sanitized: TPart[] = [];
  let changed = false;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!options.isReasoningPart(part)) {
      sanitized.push(part);
      continue;
    }

    const next = options.getNextPart(parts, index);
    if (!next) {
      changed = true;
      continue;
    }
    if (options.isReasoningPart(next)) {
      changed = true;
      continue;
    }
    if (!options.hasOpenAIItemIdForPart(next)) {
      changed = true;
      continue;
    }

    sanitized.push(part);
  }

  return { parts: sanitized, changed };
};
