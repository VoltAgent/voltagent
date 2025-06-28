/**
 * API client for prompt operations
 */

import type {
  PromptReference,
  PromptApiClient,
  VoltOpsClientOptions,
  PromptApiResponse,
} from "./types";

/**
 * Implementation of PromptApiClient for VoltOps API communication
 */
export class VoltOpsPromptApiClient implements PromptApiClient {
  private readonly baseUrl: string;
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: VoltOpsClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.publicKey = options.publicKey;
    this.secretKey = options.secretKey;
    this.fetchFn = options.fetch || fetch;
  }

  /**
   * Fetch prompt content from VoltOps API
   */
  async fetchPrompt(reference: PromptReference): Promise<PromptApiResponse> {
    const url = this.buildPromptUrl(reference);
    const headers = this.buildHeaders();

    try {
      const response = await this.fetchFn(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Return the full response as it matches PromptApiResponse format
      return data as PromptApiResponse;
    } catch (error) {
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
