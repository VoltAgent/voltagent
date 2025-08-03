/**
 * Options for configuring the VoltAgentExporter.
 */
export interface VoltAgentExporterOptions {
  /**
   * The base URL for the VoltAgent Edge Functions.
   */
  baseUrl: string;

  /**
   * The public API key for the project, used to identify the project
   * when sending telemetry data.
   */
  publicKey: string;

  /**
   * The client's secret key (obtained once during project creation)
   * used for authenticating requests to the telemetry Edge Functions.
   * This will be sent as 'clientSecretKey' in the request body.
   */
  secretKey: string;

  /**
   * Optional fetch implementation. Defaults to global fetch.
   * Useful for environments where global fetch might not be available or needs to be polyfilled (e.g., some Node.js versions).
   */
  fetch?: typeof fetch;
}

import type { Logger } from "@voltagent/internal";
import type { HistoryStep } from "../../agent/history";
import { LoggerProxy } from "../../logger";
import { BackgroundQueue } from "../../utils/queue/queue";
import {
  type AgentHistoryUpdatableFields,
  type ExportAgentHistoryPayload,
  type ExportTimelineEventPayload,
  TelemetryServiceApiClient,
} from "../client";

export class VoltAgentExporter {
  private apiClient: TelemetryServiceApiClient;
  public readonly publicKey: string;
  private logger: Logger;

  /**
   * Internal queue for all telemetry export operations
   * Ensures non-blocking exports that don't interfere with event ordering
   */
  private telemetryQueue: BackgroundQueue;

  constructor(options: VoltAgentExporterOptions) {
    let baseUrl = options.baseUrl;
    if (baseUrl.includes("https://server.voltagent.dev")) {
      baseUrl = "https://api.voltagent.dev";
    }
    this.apiClient = new TelemetryServiceApiClient({ ...options, baseUrl });
    this.publicKey = options.publicKey;
    this.logger = new LoggerProxy({ component: "volt-agent-exporter" });

    // Initialize dedicated telemetry export queue
    this.telemetryQueue = new BackgroundQueue({
      maxConcurrency: 10, // Higher concurrency for telemetry exports (they don't affect event order)
      defaultTimeout: 30000, // 30 seconds for network operations
      defaultRetries: 5, // More retries for network reliability
    });
  }

  /**
   * Exports a single agent history entry.
   * @param historyEntryData - The agent history data to export.
   * @returns A promise that resolves with the response from the telemetry service.
   */
  public async exportHistoryEntry(
    historyEntryData: ExportAgentHistoryPayload,
  ): Promise<{ historyEntryId: string }> {
    const result = await this.apiClient.exportAgentHistory(historyEntryData);
    return {
      historyEntryId: result.id,
    };
  }

  /**
   * Exports a single agent history entry asynchronously (non-blocking).
   * Queues the export operation to avoid blocking the calling thread.
   * @param historyEntryData - The agent history data to export.
   */
  public exportHistoryEntryAsync(historyEntryData: ExportAgentHistoryPayload): void {
    this.telemetryQueue.enqueue({
      id: `export-history-${historyEntryData.history_id}`,
      operation: async () => {
        try {
          await this.exportHistoryEntry(historyEntryData);
          this.logger.trace(`History entry exported: ${historyEntryData.history_id}`);
        } catch (error) {
          this.logger.error(
            "Failed to sending history entry to VoltOps. Check your publicKey & secretKey",
            { error },
          );
          throw error;
        }
      },
    });
  }

  /**
   * Exports a single timeline event.
   * @param timelineEventData - The timeline event data to export.
   * @returns A promise that resolves with the response from the telemetry service.
   */
  public async exportTimelineEvent(
    timelineEventData: ExportTimelineEventPayload,
  ): Promise<{ timelineEventId: string }> {
    const result = await this.apiClient.exportTimelineEvent(timelineEventData);
    return {
      timelineEventId: result.id,
    };
  }

  /**
   * Exports a single timeline event asynchronously (non-blocking).
   * Queues the export operation to avoid blocking the calling thread.
   * @param timelineEventData - The timeline event data to export.
   */
  public exportTimelineEventAsync(timelineEventData: ExportTimelineEventPayload): void {
    this.telemetryQueue.enqueue({
      id: `export-timeline-${timelineEventData.event_id}`,
      operation: async () => {
        await this.exportTimelineEvent(timelineEventData);
        this.logger.trace(`Timeline event exported: ${timelineEventData.event_id}`);
      },
    });
  }

  /**
   * Exports history steps for a specific agent history entry.
   * @param history_id - The ID of the history entry to export steps for.
   * @param steps - The steps data to export.
   * @returns A promise that resolves when the export is complete.
   */
  public async exportHistorySteps(history_id: string, steps: HistoryStep[]): Promise<void> {
    await this.apiClient.exportHistorySteps(history_id, steps);
  }

  /**
   * Exports history steps for a specific agent history entry asynchronously (non-blocking).
   * @param history_id - The ID of the history entry to export steps for.
   * @param steps - The steps data to export.
   */
  public exportHistoryStepsAsync(history_id: string, steps: HistoryStep[]): void {
    this.telemetryQueue.enqueue({
      id: `export-steps-${history_id}`,
      operation: async () => {
        try {
          await this.exportHistorySteps(history_id, steps);
          this.logger.trace(`History steps exported: ${history_id}`);
        } catch (error) {
          this.logger.error("Failed to export history steps", { error });
          throw error;
        }
      },
    });
  }

  /**
   * Updates specific fields of an agent history entry.
   * @param history_id - The ID of the history entry to update.
   * @param updates - An object containing the fields to update.
   * @returns A promise that resolves when the update is complete.
   */
  public async updateHistoryEntry(
    history_id: string,
    updates: Partial<AgentHistoryUpdatableFields>,
  ): Promise<void> {
    await this.apiClient.updateAgentHistory(history_id, updates);
  }

  /**
   * Updates specific fields of an agent history entry asynchronously (non-blocking).
   * @param history_id - The ID of the history entry to update.
   * @param updates - An object containing the fields to update.
   */
  public updateHistoryEntryAsync(
    history_id: string,
    updates: Partial<AgentHistoryUpdatableFields>,
  ): void {
    this.telemetryQueue.enqueue({
      id: `update-history-${history_id}`,
      operation: async () => {
        try {
          await this.updateHistoryEntry(history_id, updates);
          this.logger.trace(`History entry updated: ${history_id}`);
        } catch (error) {
          this.logger.error("Failed to update history entry", { error });
          throw error;
        }
      },
    });
  }
}
