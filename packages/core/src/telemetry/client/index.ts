import type { VoltAgentExporterOptions } from "../exporter";
import type { AgentHistoryEntry, HistoryStep, TimelineEvent } from "../../agent/history";
import type { AgentStatus } from "../../agent/types";
import type { UsageInfo } from "../../agent/providers";
import type { EventStatus, TimelineEventType } from "../../events";

export interface ExportAgentHistoryPayload {
  agent_id: string;
  project_id: string;
  history_id: string;
  timestamp: string;
  type: string;
  status: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: Record<string, unknown>;
  usage?: Record<string, unknown>;
  agent_snapshot?: Record<string, unknown>;
  steps?: HistoryStep[];
  userId?: string;
  conversationId?: string;
}

export interface ExportTimelineEventPayload {
  history_id: string;
  event_id: string;
  event: TimelineEvent;
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
  agent_snapshot?: Record<string, unknown>;
}

export interface TimelineEventUpdatableFields {
  timestamp?: string;
  type?: TimelineEventType;
  name?: string;
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
  ): Promise<unknown> {
    const { baseUrl, publicKey, secretKey } = this.options;
    const functionUrl = `${baseUrl}/${functionName}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    try {
      const response = await this.fetchImplementation(functionUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          publicKey,
          clientSecretKey: secretKey,
          payload,
        }),
      });

      if (!response.ok) {
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch (_e) {
          errorBody = await response.text();
        }

        throw new Error(
          `Failed to call VoltAgentExporter Function ${functionName}: ${response.status} ${response.statusText} - ${JSON.stringify(errorBody)}`,
        );
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  public async exportAgentHistory(
    historyEntryData: ExportAgentHistoryPayload,
  ): Promise<{ historyEntryId: string }> {
    const payload = {
      ...historyEntryData,
    };
    return (await this._callEdgeFunction("export-agent-history", payload)) as {
      historyEntryId: string;
    };
  }

  public async exportTimelineEvent(
    timelineEventData: ExportTimelineEventPayload,
  ): Promise<{ timelineEventId: string }> {
    const payload = {
      ...timelineEventData,
    };
    return (await this._callEdgeFunction("export-timeline-event", payload)) as {
      timelineEventId: string;
    };
  }

  public async exportHistorySteps(
    project_id: string,
    history_id: string,
    steps: HistoryStep[],
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
    eventData: TimelineEventUpdatableFields,
  ): Promise<void> {
    await this._callEdgeFunction("update-timeline-event", {
      history_id,
      event_id,
      event: eventData,
    } as unknown as Record<string, unknown>);
  }
}
