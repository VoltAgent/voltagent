/**
 * Type definitions for API routes
 */

export interface ChatRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    id?: string;
  }>;
  conversationId?: string;
  userId?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface APIError {
  error: string;
  message?: string;
  code?: string;
}
