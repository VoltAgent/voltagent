import type { ElicitRequest, ElicitResult } from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "@voltagent/internal";

/**
 * Handler function for processing user input requests from MCP servers.
 * Called when the server needs additional information during tool execution.
 */
export type UserInputHandler = (request: ElicitRequest["params"]) => Promise<ElicitResult>;

/**
 * Internal callback type for notifying MCPClient when handler changes.
 * @internal
 */
export type HandlerChangeCallback = (handler: UserInputHandler | undefined) => void;

/**
 * Bridge for handling user input requests from MCP servers.
 *
 * Provides a fluent API for registering handlers that process elicitation
 * requests during tool execution. Handlers can be set permanently, used
 * once, or removed dynamically at runtime.
 *
 * @example
 * ```typescript
 * // Set a permanent handler
 * mcpClient.elicitation.setHandler(async (request) => {
 *   const confirmed = await askUser(request.message);
 *   return {
 *     action: confirmed ? "accept" : "decline",
 *     content: confirmed ? { confirmed: true } : undefined,
 *   };
 * });
 *
 * // Set a one-time handler
 * mcpClient.elicitation.once(async (request) => {
 *   return { action: "accept", content: { approved: true } };
 * });
 *
 * // Remove the handler
 * mcpClient.elicitation.removeHandler();
 * ```
 */
export class UserInputBridge {
  private handler: UserInputHandler | undefined;
  private readonly logger: Logger;
  private readonly onHandlerChange: HandlerChangeCallback;

  /**
   * @internal
   */
  constructor(logger: Logger, onHandlerChange: HandlerChangeCallback) {
    this.logger = logger;
    this.onHandlerChange = onHandlerChange;
  }

  /**
   * Whether a handler is currently registered.
   */
  get hasHandler(): boolean {
    return this.handler !== undefined;
  }

  /**
   * Gets the current handler.
   *
   * @internal
   * @returns The current handler or undefined if none is set
   */
  getHandler(): UserInputHandler | undefined {
    return this.handler;
  }

  /**
   * Registers a handler for processing user input requests.
   *
   * The handler will be called each time the MCP server requests
   * additional information during tool execution.
   *
   * @param handler - Function to process user input requests
   * @returns This bridge instance for chaining
   *
   * @example
   * ```typescript
   * mcpClient.elicitation.setHandler(async (request) => {
   *   console.log("Server asks:", request.message);
   *   const userInput = await promptUser(request.requestedSchema);
   *   return { action: "accept", content: userInput };
   * });
   * ```
   */
  setHandler(handler: UserInputHandler): this {
    this.handler = handler;
    this.onHandlerChange(handler);
    this.logger.debug("User input handler registered");
    return this;
  }

  /**
   * Registers a one-time handler that automatically removes itself after use.
   *
   * Useful for handling a single expected user input request without
   * leaving a permanent handler in place.
   *
   * @param handler - Function to process the next user input request
   * @returns This bridge instance for chaining
   *
   * @example
   * ```typescript
   * // Handle only the next elicitation request
   * mcpClient.elicitation.once(async (request) => {
   *   return { action: "accept", content: { confirmed: true } };
   * });
   * ```
   */
  once(handler: UserInputHandler): this {
    const wrappedHandler: UserInputHandler = async (request) => {
      this.removeHandler();
      return handler(request);
    };

    this.handler = wrappedHandler;
    this.onHandlerChange(wrappedHandler);
    this.logger.debug("One-time user input handler registered");
    return this;
  }

  /**
   * Removes the current handler.
   *
   * After calling this, user input requests from the server will
   * be automatically cancelled until a new handler is set.
   *
   * @returns This bridge instance for chaining
   */
  removeHandler(): this {
    this.handler = undefined;
    this.onHandlerChange(undefined);
    this.logger.debug("User input handler removed");
    return this;
  }

  /**
   * Processes a user input request using the registered handler.
   *
   * @internal
   * @param request - The elicitation request from the server
   * @returns The user's response or a cancel action if no handler
   */
  async processRequest(request: ElicitRequest["params"]): Promise<ElicitResult> {
    if (!this.handler) {
      this.logger.warn("No user input handler registered, cancelling request");
      return { action: "cancel", content: undefined };
    }

    try {
      this.logger.debug("Processing user input request", {
        message: request.message,
      });

      const result = await this.handler(request);

      this.logger.debug("User input request processed", {
        action: result.action,
      });

      return result;
    } catch (error) {
      this.logger.error("Error processing user input request", { error });
      return { action: "cancel", content: undefined };
    }
  }
}
