import type {
  VoltAgentClientOptions,
  CreateHistoryRequest,
  UpdateHistoryRequest,
  History,
  AddEventRequest,
  UpdateEventRequest,
  Event,
  ApiResponse,
  ApiError,
} from "../types";

export class VoltAgentCoreAPI {
  private baseUrl: string;
  private headers: HeadersInit;
  private timeout: number;

  constructor(options: VoltAgentClientOptions) {
    this.baseUrl = options.baseUrl.endsWith("/") ? options.baseUrl.slice(0, -1) : options.baseUrl;
    this.timeout = options.timeout || 30000;
    this.headers = {
      "Content-Type": "application/json",
      "x-public-key": options.publicKey,
      "x-secret-key": options.secretKey,
      ...options.headers,
    };
  }

  /**
   * Basic fetch method - used by all requests
   */
  private async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Set default options
    const fetchOptions: RequestInit = {
      headers: this.headers,
      ...options,
    };

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Parse response
      const data = await response.json();

      // Error handling
      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          message: data.message || "An error occurred",
          errors: data.errors,
        };
        throw error;
      }

      return { data: data } as T;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        throw {
          status: 408,
          message: "Request timeout",
        } as ApiError;
      }

      if (error instanceof TypeError) {
        // Network errors
        throw {
          status: 0,
          message: "Network error",
        } as ApiError;
      }

      // Other errors (if already thrown as ApiError)
      throw error;
    }
  }

  /**
   * Creates a new history
   * @param data Required data for history
   * @returns Created history object
   */
  async addHistory(data: CreateHistoryRequest): Promise<History> {
    const response = await this.fetchApi<ApiResponse<History>>("/history", {
      method: "POST",
      body: JSON.stringify(data),
    });

    return response.data;
  }

  /**
   * Updates an existing history
   * @param data Required data for history update
   * @returns Updated history object
   */
  async updateHistory(data: UpdateHistoryRequest): Promise<History> {
    const { id, ...updateData } = data;
    const response = await this.fetchApi<ApiResponse<History>>(`/history/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updateData),
    });

    return response.data;
  }

  /**
   * Adds a new event to an existing history
   * @param data Required data for event
   * @returns Added event object
   */
  async addEvent(data: AddEventRequest): Promise<Event> {
    // Convert from TimelineEventCore to DTO format
    const eventDto = {
      history_id: data.historyId,
      event_type: data.event.type,
      event_name: data.event.name,
      start_time: data.event.startTime,
      end_time: data.event.endTime,
      status: data.event.status,
      status_message: data.event.statusMessage,
      level: data.event.level,
      version: data.event.version,
      parent_event_id: data.event.parentEventId,
      tags: data.event.tags,
      metadata: data.event.metadata,
      input: data.event.input,
      output: data.event.output,
    };

    const response = await this.fetchApi<ApiResponse<Event>>("/history-events", {
      method: "POST",
      body: JSON.stringify(eventDto),
    });

    return response.data;
  }

  /**
   * Updates an existing event
   * @param data Required data for event update
   * @returns Updated event object
   */
  async updateEvent(data: UpdateEventRequest): Promise<Event> {
    const { id, ...updateData } = data;
    const response = await this.fetchApi<ApiResponse<Event>>(`/history-events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updateData),
    });

    return response.data;
  }
}
