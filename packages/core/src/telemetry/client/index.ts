import type { VoltAgentExporterOptions } from "../exporter";
import type { AgentHistoryEntry, HistoryStep } from "../../agent/history";
import type { AgentStatus } from "../../agent/types";
import type { UsageInfo } from "../../agent/providers";
import type { NewTimelineEvent } from "../../events/types";

export interface ExportAgentHistoryPayload {
  agent_id: string;
  project_id: string;
  history_id: string;
  startTime: string;
  endTime?: string;
  status: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: Record<string, unknown>;
  usage?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  steps?: HistoryStep[];
  userId?: string;
  conversationId?: string;
  model?: string;
}

export interface ExportTimelineEventPayload {
  history_id: string;
  event_id: string;
  agent_id: string;
  event: NewTimelineEvent;
}

export interface ExportHistoryStepsPayload {
  project_id: string;
  history_id: string;
  steps: HistoryStep[];
}

export interface AgentHistoryUpdatableFields {
  input?: AgentHistoryEntry["input"];
  output?: string;
  status?: AgentStatus;
  usage?: UsageInfo;
  metadata?: Record<string, unknown>;
  endTime?: string;
}

export class TelemetryServiceApiClient {
  // @ts-ignore
  private options: VoltAgentExporterOptions;
  private fetchImplementation: typeof fetch;
  private baseUrl: string;
  private publicKey: string;
  private secretKey: string;

  constructor(options: VoltAgentExporterOptions) {
    this.options = options;
    this.fetchImplementation = options.fetch || globalThis.fetch;
    this.baseUrl = options.baseUrl;
    this.publicKey = options.publicKey;
    this.secretKey = options.secretKey;

    if (!this.fetchImplementation) {
      throw new Error(
        "Fetch API is not available. Please provide a fetch implementation via VoltAgentExporterOptions.",
      );
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-public-key": this.publicKey,
      "x-secret-key": this.secretKey,
    };

    try {
      const response = await this.fetchImplementation(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch (_e) {
          errorBody = await response.text();
        }

        throw new Error(
          `API request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorBody)}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("API request error:", error);
      throw error;
    }
  }

  public async exportAgentHistory(
    historyEntryData: ExportAgentHistoryPayload,
  ): Promise<{ id: string }> {
    const payload = {
      id: historyEntryData.history_id,
      agent_id: historyEntryData.agent_id,
      status: historyEntryData.status,
      input: historyEntryData.input,
      output: historyEntryData.output,
      usage: historyEntryData.usage,
      userId: historyEntryData.userId,
      conversationId: historyEntryData.conversationId,
      metadata: {
        error: historyEntryData.error,
        agentSnapshot: historyEntryData.metadata?.agentSnapshot,
        steps: historyEntryData.steps,
        history_id: historyEntryData.history_id,
      },
      model: historyEntryData.model,
      startTime: new Date(historyEntryData.startTime).toISOString(),
      endTime: historyEntryData.endTime
        ? new Date(historyEntryData.endTime).toISOString()
        : undefined,
    };

    return this.request<{ id: string }>("POST", "/history", payload);
  }

  public async exportTimelineEvent(
    timelineEventData: ExportTimelineEventPayload,
  ): Promise<{ id: string }> {
    // Timeline eventlerini history-events endpoint'ine taşıyoruz
    const { event, history_id, event_id, agent_id } = timelineEventData;

    const payload = {
      id: event_id,
      history_id,
      event_type: event.type,
      event_name: event.name,
      start_time: new Date(event.startTime).toISOString(),
      end_time: event.endTime ? new Date(event.endTime).toISOString() : undefined,
      status: event.status,
      status_message: event.statusMessage,
      level: event.level,
      version: event.version,
      parent_event_id: event.parentEventId,
      tags: event.tags,
      input: event.input,
      output: event.output,
      metadata: {
        ...event.metadata,
      },
      agent_id: agent_id,
    };

    return this.request<{ id: string }>("POST", "/history-events", payload);
  }

  public async exportHistorySteps(history_id: string, steps: HistoryStep[]): Promise<void> {
    // History güncelleyerek steps bilgisini metadata'ya ekle
    const payload = {
      metadata: {
        steps,
      },
    };

    await this.request<void>("PATCH", `/history/${history_id}`, payload);
  }

  public async updateAgentHistory(
    history_id: string,
    updates: AgentHistoryUpdatableFields,
  ): Promise<void> {
    // Güncellemeleri history endpoint'ine gönder
    const payload: Record<string, unknown> = {};

    if (updates.input) payload.input = updates.input;
    if (updates.output) payload.output = { content: updates.output };
    if (updates.status) payload.status = updates.status;
    if (updates.usage) payload.usage = updates.usage;
    if (updates.endTime) payload.endTime = updates.endTime;

    // agent_snapshot'ı metadata olarak ekle
    if (updates.metadata) {
      payload.metadata = {
        ...updates.metadata,
      };
    }

    await this.request<void>("PATCH", `/history/${history_id}`, payload);
  }
}
