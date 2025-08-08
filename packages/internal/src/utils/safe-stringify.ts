import type { DangerouslyAllowAny } from "../types";

export type SafeStringifyOptions = {
  /**
   * The indentation to use for the output.
   */
  indentation?: string | number;
};

/**
 * Stringifies an object, handling circular references and ensuring the output is safe to use in a JSON string.
 * @param input - The object to stringify.
 * @param options.indentation - The indentation to use for the output.
 * @returns The stringified object.
 */
export function safeStringify(
  input: DangerouslyAllowAny,
  { indentation }: SafeStringifyOptions = {},
) {
  try {
    const seen = new WeakSet();
    return JSON.stringify(input, safeStringifyReplacer(seen), indentation);
  } catch (error) {
    return `SAFE_STRINGIFY_ERROR: Error stringifying object: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

function safeStringifyReplacer(seen: WeakSet<DangerouslyAllowAny>) {
  const replacer = (_key: string, value: DangerouslyAllowAny) => {
    // Handle objects with a custom `.toJSON()` method.
    if (typeof value?.toJSON === "function") {
      // biome-ignore lint/style/noParameterAssign: needed to handle circular references
      value = value.toJSON();
    }

    if (!(value !== null && typeof value === "object")) {
      return value;
    }

    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);

    const newValue = Array.isArray(value) ? [] : {};

    for (const [key2, value2] of Object.entries(value)) {
      // @ts-expect-error - ignore as this is needed to handle circular references
      newValue[key2] = replacer(key2, value2);
    }

    seen.delete(value);

    return newValue;
  };

  return replacer;
}
