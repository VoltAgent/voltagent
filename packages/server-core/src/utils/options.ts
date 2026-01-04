import { Output } from "ai";
import { z } from "zod";
import { convertJsonSchemaToZod } from "zod-from-json-schema";
import { convertJsonSchemaToZod as convertJsonSchemaToZodV3 } from "zod-from-json-schema-v3";

/**
 * Process agent options from request body
 */
export interface ProcessedAgentOptions {
  conversationId?: string;
  userId?: string;
  context?: Map<string, any>;
  temperature?: number;
  maxOutputTokens?: number;
  maxSteps?: number;
  contextLimit?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
  stopSequences?: string[];
  maxRetries?: number;
  abortSignal?: AbortSignal;
  onFinish?: (result: unknown) => Promise<void>;
  output?: any;
  [key: string]: any;
}

/**
 * Process and normalize agent options from request body
 */
export function processAgentOptions(body: any, signal?: AbortSignal): ProcessedAgentOptions {
  // Now all options should be in body.options, no need to merge from root
  const options = body.options || {};

  const processedOptions: ProcessedAgentOptions = {
    ...options,
    ...(signal && { abortSignal: signal }),
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
