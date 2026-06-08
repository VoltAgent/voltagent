export const isPlainToolInput = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const parseStringifiedToolInput = (value: string): Record<string, unknown> | undefined => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    return isPlainToolInput(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const normalizeToolInputForModel = (value: unknown): Record<string, unknown> => {
  if (isPlainToolInput(value)) {
    return value;
  }

  if (typeof value === "string") {
    return parseStringifiedToolInput(value) ?? {};
  }

  return {};
};
