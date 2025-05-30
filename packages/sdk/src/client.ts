import type {
  VoltAgentClientOptions,
  CreateHistoryRequest,
  UpdateHistoryRequest,
  History,
  AddEventRequest,
  Event,
  ApiResponse,
  ApiError,
} from "./types";

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
   * Temel fetch metodu - tüm isteklerin kullandığı
   */
  private async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Default options'ları ayarla
    const fetchOptions: RequestInit = {
      headers: this.headers,
      ...options,
    };

    // Timeout için AbortController kullan
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

      // Diğer hatalar (zaten ApiError olarak hata fırlatıldıysa)
      throw error;
    }
  }

  /**
   * Yeni bir history oluşturur
   * @param data History için gerekli veriler
   * @returns Oluşturulan history nesnesi
   */
  async addHistory(data: CreateHistoryRequest): Promise<History> {
    const response = await this.fetchApi<ApiResponse<History>>("/history", {
      method: "POST",
      body: JSON.stringify(data),
    });

    return response.data;
  }

  /**
   * Var olan bir history'yi günceller
   * @param data History güncellemesi için gerekli veriler
   * @returns Güncellenmiş history nesnesi
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
   * Var olan bir history'ye yeni bir event ekler
   * @param data Event için gerekli veriler
   * @returns Eklenen event nesnesi
   */
  async addEvent(data: AddEventRequest): Promise<Event> {
    // TimelineEventCore'dan DTO formatına dönüştür
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
}
