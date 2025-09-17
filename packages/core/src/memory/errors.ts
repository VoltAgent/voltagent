/**
 * Custom error classes for Memory V2
 */

/**
 * Base error class for Memory V2
 */
export class MemoryV2Error extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "MemoryV2Error";
    Object.setPrototypeOf(this, MemoryV2Error.prototype);
  }
}

/**
 * Error thrown when a storage operation fails
 */
export class StorageError extends MemoryV2Error {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "STORAGE_ERROR", details);
    this.name = "StorageError";
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

/**
 * Error thrown when an embedding operation fails
 */
export class EmbeddingError extends MemoryV2Error {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "EMBEDDING_ERROR", details);
    this.name = "EmbeddingError";
    Object.setPrototypeOf(this, EmbeddingError.prototype);
  }
}

/**
 * Error thrown when a vector operation fails
 */
export class VectorError extends MemoryV2Error {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VECTOR_ERROR", details);
    this.name = "VectorError";
    Object.setPrototypeOf(this, VectorError.prototype);
  }
}

/**
 * Error thrown when a conversation is not found
 */
export class ConversationNotFoundError extends MemoryV2Error {
  constructor(conversationId: string) {
    super(`Conversation not found: ${conversationId}`, "CONVERSATION_NOT_FOUND", {
      conversationId,
    });
    this.name = "ConversationNotFoundError";
    Object.setPrototypeOf(this, ConversationNotFoundError.prototype);
  }
}

/**
 * Error thrown when trying to create a conversation that already exists
 */
export class ConversationAlreadyExistsError extends MemoryV2Error {
  constructor(conversationId: string) {
    super(`Conversation already exists: ${conversationId}`, "CONVERSATION_ALREADY_EXISTS", {
      conversationId,
    });
    this.name = "ConversationAlreadyExistsError";
    Object.setPrototypeOf(this, ConversationAlreadyExistsError.prototype);
  }
}

/**
 * Error thrown when vector adapter is required but not configured
 */
export class VectorAdapterNotConfiguredError extends MemoryV2Error {
  constructor(operation: string) {
    super(
      `Vector adapter is required for ${operation} but not configured`,
      "VECTOR_ADAPTER_NOT_CONFIGURED",
      { operation },
    );
    this.name = "VectorAdapterNotConfiguredError";
    Object.setPrototypeOf(this, VectorAdapterNotConfiguredError.prototype);
  }
}

/**
 * Error thrown when embedding adapter is required but not configured
 */
export class EmbeddingAdapterNotConfiguredError extends MemoryV2Error {
  constructor(operation: string) {
    super(
      `Embedding adapter is required for ${operation} but not configured`,
      "EMBEDDING_ADAPTER_NOT_CONFIGURED",
      { operation },
    );
    this.name = "EmbeddingAdapterNotConfiguredError";
    Object.setPrototypeOf(this, EmbeddingAdapterNotConfiguredError.prototype);
  }
}
