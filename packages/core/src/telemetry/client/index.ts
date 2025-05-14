import type { VoltAgentExporterOptions } from "../exporter";
// AgentHistoryEntry ve TimelineEvent tiplerini core paketinizdeki tanımlardan import etmeliyiz.
// Örnek import yolu, gerçek yapınıza göre düzeltilmelidir.
import type { AgentHistoryEntry, HistoryStep, TimelineEvent } from "../../agent/history"; // Veya "../history" vs.
import type { AgentStatus } from "../../agent/types";
import type { UsageInfo } from "../../agent/providers";
import type { EventStatus, TimelineEventType } from "../../events";

// Edge Function'ların beklediği payload tipleri için arayüzler
// Bunlar, Edge Function içindeki AgentHistoryEntryData'ya benzer olmalı
export interface ExportAgentHistoryPayload {
  // Edge Function'ın payload'da beklediği AgentHistoryEntry alanları.
  // 'id' ve 'timestamp' genellikle sunucu tarafında ayarlanır veya farklı şekilde ele alınır.
  // 'events' ayrı bir endpoint ile gönderilecek.
  // Edge Function içindeki AgentHistoryEntryData ile tutarlı olmalı.
  agent_id: string;
  project_id: string;
  history_id: string;
  session_id?: string;
  request_id?: string;
  event_timestamp: string;
  type: string;
  status: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: Record<string, unknown>;
  usage?: Record<string, unknown>;
  sequence_number: number;
  agent_snapshot?: Record<string, unknown>;
  steps?: HistoryStep[];
}

// TimelineEvent için payload (eğer ayrı bir endpoint olacaksa)
export interface ExportTimelineEventPayload {
  // project_id is handled by the API client/exporter itself based on the publicKey
  history_entry_id: string; // ID of the parent history entry
  event_id: string; // ID of the event itself
  event: TimelineEvent; // The entire event object to be stored in the 'value' column
}

// Payload for exporting history steps
export interface ExportHistoryStepsPayload {
  project_id: string;
  history_id: string;
  steps: HistoryStep[]; // Changed from TimelineEventType[] to HistoryStep[]
}

// Interface for updatable fields in agent_history_entries via the update function
export interface AgentHistoryUpdatableFields {
  input?: AgentHistoryEntry["input"];
  output?: string;
  status?: AgentStatus;
  usage?: UsageInfo;
  agent_snapshot?: Record<string, unknown>;
  sequence_number?: number;
}

export interface TimelineEventUpdatableFields {
  timestamp?: string;
  type?: TimelineEventType;
  name?: string;
  details?: Record<string, unknown>;
  status?: EventStatus;
  error?: Record<string, unknown>;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export class TelemetryServiceApiClient {
  private options: VoltAgentExporterOptions;
  private fetchImplementation: typeof fetch;

  constructor(options: VoltAgentExporterOptions) {
    this.options = options;
    this.fetchImplementation = options.fetch || globalThis.fetch;

    if (!this.fetchImplementation) {
      throw new Error(
        "Fetch API is not available. Please provide a fetch implementation via VoltAgentExporterOptions.",
      );
    }
  }

  private async _callEdgeFunction(
    functionName: string,
    payload: Record<string, unknown>,
  ): Promise<any> {
    const { baseUrl, publicKey, secretKey, supabaseAnonKey } = this.options;
    const functionUrl = `${baseUrl}/${functionName}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Eğer supabaseAnonKey varsa, Supabase Edge Fonksiyonları genellikle
    // bir Bearer token bekler (Supabase client'ının yaptığı gibi).
    if (supabaseAnonKey) {
      headers.Authorization = `Bearer ${supabaseAnonKey}`;
    }
    // Not: Edge fonksiyonlarımız gövde içinde publicKey ve clientSecretKey aldığı için,
    // bu header'daki anonKey sadece fonksiyon çağrısını yetkilendirmek için olabilir (eğer fonksiyon ayarları gerektiriyorsa).
    // Asıl kimlik doğrulama gövde içindeki anahtarlarla yapılacak.

    try {
      const response = await this.fetchImplementation(functionUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          publicKey,
          clientSecretKey: secretKey, // Exporter'daki secretKey'i clientSecretKey olarak gönderiyoruz
          payload,
        }),
      });

      if (!response.ok) {
        let errorBody: any;
        try {
          errorBody = await response.json();
        } catch (_e) {
          errorBody = await response.text();
        }
        console.error(
          `[TelemetryServiceApiClient] Error calling ${functionName}: ${response.status} ${response.statusText}`,
          errorBody,
        );
        throw new Error(
          `Failed to call Edge Function ${functionName}: ${response.status} ${response.statusText} - ${JSON.stringify(errorBody)}`,
        );
      }
      return await response.json();
    } catch (error) {
      console.error(
        `[TelemetryServiceApiClient] Network or other error calling ${functionName}:`,
        error,
      );
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  public async exportAgentHistory(
    historyEntryData: ExportAgentHistoryPayload,
  ): Promise<{ historyEntryId: string }> {
    // AgentHistoryEntry'den 'id', 'timestamp', 'events' gibi alanları çıkarıp
    // Edge Function'ın beklediği payload'a dönüştür.
    // event_timestamp'ı ISO string olarak formatla.
    const payload = {
      ...historyEntryData,
      // event_timestamp: historyEntryData.timestamp.toISOString(), // Eğer timestamp Date objesi ise
    };
    return this._callEdgeFunction("export-agent-history", payload);
  }

  public async exportTimelineEvent(
    timelineEventData: ExportTimelineEventPayload,
  ): Promise<{ timelineEventId: string }> {
    const payload = {
      ...timelineEventData,
      // event_timestamp: timelineEventData.timestamp.toISOString(), // Eğer timestamp Date objesi ise
    };
    // Henüz bu fonksiyonu oluşturmadık, ama şimdiden yerini hazırlayalım.
    return this._callEdgeFunction("export-timeline-event", payload);
  }

  public async exportHistorySteps(
    project_id: string,
    history_id: string,
    steps: HistoryStep[], // Changed from TimelineEventType[] to HistoryStep[]
  ): Promise<void> {
    const payload: ExportHistoryStepsPayload = {
      project_id,
      history_id,
      steps,
    };
    await this._callEdgeFunction(
      "export-history-steps",
      payload as unknown as Record<string, unknown>,
    );
  }

  public async updateAgentHistory(
    project_id: string,
    history_id: string,
    updates: AgentHistoryUpdatableFields,
  ): Promise<void> {
    await this._callEdgeFunction("update-agent-history", {
      project_id,
      history_id,
      updates,
    } as unknown as Record<string, unknown>);
  }

  public async updateTimelineEvent(
    history_id: string,
    event_id: string,
    updatedEvent: TimelineEvent,
  ): Promise<void> {
    await this._callEdgeFunction("update-timeline-event", {
      history_id,
      event_id,
      event: updatedEvent,
    } as unknown as Record<string, unknown>);
  }
}
