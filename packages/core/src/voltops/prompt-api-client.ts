/**
 * API client for prompt operations
 */

import type {
  PromptReference,
  PromptApiClient,
  VoltOpsClientOptions,
  PromptApiResponse,
} from "./types";
import { getGlobalLogger, type Logger } from "../logger";
import { LogEvents } from "../logger/events";
import {
  buildVoltOpsLogMessage,
  buildLogContext,
  ResourceType,
  ActionType,
} from "../logger/message-builder";

/**
 * Implementation of PromptApiClient for VoltOps API communication
 */
export class VoltOpsPromptApiClient implements PromptApiClient {
  private readonly baseUrl: string;
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly fetchFn: typeof fetch;
  private readonly logger: Logger;

  constructor(options: VoltOpsClientOptions) {
    this.baseUrl = (options.baseUrl || "https://api.voltagent.dev").replace(/\/$/, ""); // Remove trailing slash
    this.publicKey = options.publicKey || "";
    this.secretKey = options.secretKey || "";
    this.fetchFn = options.fetch || fetch;
    this.logger = getGlobalLogger().child({ component: "voltops-api-client" });
  }

  /**
   * Fetch prompt content from VoltOps API
   */
  async fetchPrompt(reference: PromptReference): Promise<PromptApiResponse> {
    const url = this.buildPromptUrl(reference);
    const headers = this.buildHeaders();

    this.logger.debug(
      buildVoltOpsLogMessage("api-client", ActionType.START, "sending API request"),
      buildLogContext(ResourceType.VOLTOPS, "api-client", ActionType.START, {
        event: LogEvents.VOLTOPS_PROMPT_FETCH_STARTED,
        url,
        promptName: reference.promptName,
        version: reference.version,
        label: reference.label,
        hasPublicKey: !!this.publicKey,
        hasSecretKey: !!this.secretKey,
      }),
    );

    const startTime = Date.now();

    try {
      const response = await this.fetchFn(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        this.logger.debug(
          buildVoltOpsLogMessage("api-client", ActionType.ERROR, "API request failed"),
          buildLogContext(ResourceType.VOLTOPS, "api-client", ActionType.ERROR, {
            event: LogEvents.VOLTOPS_PROMPT_FETCH_FAILED,
            promptName: reference.promptName,
            status: response.status,
            statusText: response.statusText,
            duration: Date.now() - startTime,
          }),
        );
        throw error;
      }

      const data = await response.json();

      this.logger.debug(
        buildVoltOpsLogMessage("api-client", ActionType.COMPLETE, "API request successful"),
        buildLogContext(ResourceType.VOLTOPS, "api-client", ActionType.COMPLETE, {
          event: LogEvents.VOLTOPS_PROMPT_FETCH_COMPLETED,
          promptName: reference.promptName,
          status: response.status,
          duration: Date.now() - startTime,
          promptType: data.type,
          promptId: data.prompt_id,
          promptVersionId: data.prompt_version_id,
        }),
      );

      // Return the full response as it matches PromptApiResponse format
      return data as PromptApiResponse;
    } catch (error) {
      if (!(error instanceof Error && error.message.startsWith("HTTP"))) {
        this.logger.debug(
          buildVoltOpsLogMessage("api-client", ActionType.ERROR, "API request error"),
          buildLogContext(ResourceType.VOLTOPS, "api-client", ActionType.ERROR, {
            event: LogEvents.VOLTOPS_PROMPT_FETCH_FAILED,
            promptName: reference.promptName,
            error: error instanceof Error ? error.message : "Unknown error",
            duration: Date.now() - startTime,
          }),
        );
      }
      throw new Error(
        `Failed to fetch prompt: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Build URL for prompt API endpoint
   */
  private buildPromptUrl = (reference: PromptReference): string => {
    const { promptName, version, label } = reference;
    const params = new URLSearchParams();

    // Add version parameter if specified
    if (version !== undefined) {
      params.append("version", version.toString());
    }

    // Add label parameter if specified (backend will default to 'latest' if neither version nor label)
    if (label) {
      params.append("label", label);
    }

    const queryString = params.toString();
    return `${this.baseUrl}/prompts/public/${encodeURIComponent(promptName)}${queryString ? `?${queryString}` : ""}`;
  };

  /**
   * Build authentication headers
   */
  private buildHeaders = (): Record<string, string> => ({
    "Content-Type": "application/json",
    "X-Public-Key": this.publicKey,
    "X-Secret-Key": this.secretKey,
  });
}
