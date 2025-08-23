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
  signal?: AbortSignal;
  onFinish?: (result: unknown) => Promise<void>;
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
    ...(signal && { signal }),
  };

  // Convert context to Map for internal use
  if (options.context && typeof options.context === "object" && !(options.context instanceof Map)) {
    processedOptions.context = new Map(Object.entries(options.context));
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
