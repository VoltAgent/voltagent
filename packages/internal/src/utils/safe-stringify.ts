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
  const stack: DangerouslyAllowAny[] = [];
  return function safeStringifyCircularReplacer(
    this: DangerouslyAllowAny,
    _key: string,
    value: DangerouslyAllowAny,
  ) {
    if (stack.length === 0) {
      stack.push(this);
    } else {
      const thisIndex = stack.indexOf(this);
      if (thisIndex === -1) {
        stack.push(this);
      } else {
        stack.splice(thisIndex + 1);
      }
    }

    if (value && typeof value === "object") {
      if (typeof value.toJSON === "function") {
        // biome-ignore lint/style/noParameterAssign: needed to handle circular references
        value = value.toJSON();
      }

      if (value && typeof value === "object") {
        if (stack.includes(value)) {
          return "[Circular]";
        }

        if (!seen.has(value)) {
          seen.add(value);
        }
      } else {
        return value;
      }
    }

    return value;
  };
}
