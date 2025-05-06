/**
 * Ollama provider options
 */
export interface OllamaProviderOptions {
  /**
   * The base URL of the Ollama API
   * Default: http://localhost:11434
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds
   * Default: 60000 (60 seconds)
   */
  timeout?: number;
}

/**
 * Ollama generate request options
 */
export interface OllamaGenerateRequest {
  /**
   * The model name
   */
  model: string;

  /**
   * The prompt to generate text from
   */
  prompt: string;

  /**
   * Represents randomness in responses
   * Default: 0.8
   */
  temperature?: number;

  /**
   * Maximum number of tokens to generate
   */
  max_tokens?: number;

  /**
   * Controls diversity via nucleus sampling
   * Default: 0.9
   */
  top_p?: number;

  /**
   * Penalty for repeated tokens
   */
  frequency_penalty?: number;

  /**
   * Penalty for tokens based on presence in input
   */
  presence_penalty?: number;

  /**
   * Random seed for deterministic responses
   */
  seed?: number;

  /**
   * Sequences that trigger stopping the generation
   */
  stop?: string[];

  /**
   * If true, the response will be streamed
   */
  stream?: boolean;
}

/**
 * Ollama chat request options
 */
export interface OllamaChatRequest {
  /**
   * The model name
   */
  model: string;

  /**
   * Array of messages in the conversation
   */
  messages: OllamaMessage[];

  /**
   * Represents randomness in responses
   * Default: 0.8
   */
  temperature?: number;

  /**
   * Maximum number of tokens to generate
   */
  max_tokens?: number;

  /**
   * Controls diversity via nucleus sampling
   * Default: 0.9
   */
  top_p?: number;

  /**
   * Penalty for repeated tokens
   */
  frequency_penalty?: number;

  /**
   * Penalty for tokens based on presence in input
   */
  presence_penalty?: number;

  /**
   * Random seed for deterministic responses
   */
  seed?: number;

  /**
   * Sequences that trigger stopping the generation
   */
  stop?: string[];

  /**
   * If true, the response will be streamed
   */
  stream?: boolean;
}

/**
 * Ollama message format
 */
export interface OllamaMessage {
  /**
   * The role of the message author
   */
  role: "user" | "assistant" | "system";

  /**
   * The content of the message
   */
  content: string;
}

/**
 * Ollama generate response
 */
export interface OllamaGenerateResponse {
  /**
   * The generated text
   */
  response: string;

  /**
   * Token usage information
   */
  eval_count?: number;
  prompt_eval_count?: number;
  eval_duration?: number;

  /**
   * Whether the response is done
   */
  done: boolean;
}

/**
 * Ollama chat response
 */
export interface OllamaChatResponse {
  /**
   * The model name
   */
  model: string;

  /**
   * Created timestamp
   */
  created_at: string;

  /**
   * The generated message
   */
  message: {
    role: "assistant";
    content: string;
  };

  /**
   * Token usage information
   */
  eval_count?: number;
  prompt_eval_count?: number;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;

  /**
   * Whether the response is done
   */
  done: boolean;
}
