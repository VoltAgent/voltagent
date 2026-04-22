import { Output } from "ai";
import { z } from "zod";
import { convertJsonSchemaToZod } from "zod-from-json-schema";
import { convertJsonSchemaToZod as convertJsonSchemaToZodV3 } from "zod-from-json-schema-v3";

type RequestHeadersInput = Headers | Record<string, string | string[] | undefined>;

function normalizeRequestHeaders(
  headers?: RequestHeadersInput,
): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }

  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    const entries = Array.from(headers.entries()).map(
      ([key, value]) => [key.toLowerCase(), value] as const,
    );
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      normalized[key.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      normalized[key.toLowerCase()] = value.join(", ");
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Process agent options from request body
 */
export interface ProcessedAgentOptions {
  memory?: {
    conversationId?: string;
    userId?: string;
    options?: {
      contextLimit?: number;
      readOnly?: boolean;
      semanticMemory?: {
        enabled?: boolean;
        semanticLimit?: number;
        semanticThreshold?: number;
        mergeStrategy?: "prepend" | "append" | "interleave";
      };
      conversationPersistence?: {
        mode?: "step" | "finish";
        debounceMs?: number;
        flushOnToolResult?: boolean;
      };
    };
  };
  conversationId?: string;
  userId?: string;
  context?: Map<string, any>;
  temperature?: number;
  maxOutputTokens?: number;
  maxSteps?: number;
  contextLimit?: number;
  semanticMemory?: {
    enabled?: boolean;
    semanticLimit?: number;
    semanticThreshold?: number;
    mergeStrategy?: "prepend" | "append" | "interleave";
  };
  conversationPersistence?: {
    mode?: "step" | "finish";
    debounceMs?: number;
    flushOnToolResult?: boolean;
  };
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
  stopSequences?: string[];
  maxRetries?: number;
  abortSignal?: AbortSignal;
  requestHeaders?: Record<string, string>;
  onFinish?: (result: unknown) => Promise<void>;
  output?: any;
  resumableStream?: boolean;
  [key: string]: any;
}

/**
 * Process and normalize agent options from request body
 */
export function processAgentOptions(
  body: any,
  signal?: AbortSignal,
  requestHeaders?: RequestHeadersInput,
): ProcessedAgentOptions {
  // Now all options should be in body.options, no need to merge from root
  const options = body.options || {};
  const normalizedRequestHeaders = normalizeRequestHeaders(requestHeaders);

  const processedOptions: ProcessedAgentOptions = {
    ...options,
    ...(signal && { abortSignal: signal }),
    ...(normalizedRequestHeaders && { requestHeaders: normalizedRequestHeaders }),
  };

  // Convert context to Map for internal use
  if (options.context && typeof options.context === "object" && !(options.context instanceof Map)) {
    processedOptions.context = new Map(Object.entries(options.context));
  }

  // Process output if provided
  // The client sends: { type: "object"|"text", schema?: {...}, maxLength?: number, description?: string }
  // We need to convert it to AI SDK's Output.object() or Output.text() format
  if (options.output) {
    const { type, schema: jsonSchema } = options.output;

    if (type === "object" && jsonSchema) {
      // Convert JSON schema to Zod schema (supports zod v3 and v4)
      const zodSchema = ("toJSONSchema" in z ? convertJsonSchemaToZod : convertJsonSchemaToZodV3)(
        jsonSchema,
      ) as any;

      processedOptions.output = Output.object({ schema: zodSchema });
    } else if (type === "text") {
      // Output.text() takes no parameters - it's for constrained text generation
      processedOptions.output = Output.text();
    }
  }

  return processedOptions;
}

/**
 * Process workflow options from request body
 */
export function processWorkflowOptions(options?: any, suspendController?: any): any {
  if (!options) {
    return suspendController ? { suspendController } : {};
  }

  const processedOptions = {
    ...options,
    ...(options.context &&
      typeof options.context === "object" &&
      !(options.context instanceof Map) && {
        context: new Map(Object.entries(options.context)),
      }),
    ...(suspendController && { suspendController }),
  };

  // Context is already handled above, no need to delete

  return processedOptions;
}
