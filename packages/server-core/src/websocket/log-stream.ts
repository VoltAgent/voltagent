/**
 * Framework-agnostic log stream manager for real-time log streaming
 */

import { getGlobalLogBuffer, getGlobalLogger } from "@voltagent/core";
import type { LogEntry, LogFilter, Logger } from "@voltagent/internal";
import { safeStringify } from "@voltagent/internal/utils";
import type { IWebSocket, LogStreamClient } from "../types/websocket";

export class LogStreamManager {
  private clients: Set<LogStreamClient> = new Set();
  private logBuffer: any;
  private logger: Logger;

  constructor() {
    // Get the global log buffer and listen for new logs
    this.logBuffer = getGlobalLogBuffer();
    this.logger = getGlobalLogger().child({ component: "log-stream-manager" });
    this.setupEventListeners();
  }

  addClient(ws: IWebSocket, filter?: LogFilter): void {
    const client: LogStreamClient = { ws, filter };
    this.clients.add(client);

    // Send initial logs to the new client
    this.sendInitialLogs(client);

    // Handle client disconnect
    ws.on("close", () => {
      this.clients.delete(client);
    });

    // Handle client messages (filter updates)
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "updateFilter") {
          client.filter = message.filter;
          this.logger.trace("Updated log filter for client", { filter: client.filter });
        }
      } catch (error) {
        this.logger.error("Failed to parse WebSocket message", { error });
      }
    });

    this.logger.trace(`Log stream client connected. Active clients: ${this.clients.size}`);
  }

  private sendInitialLogs(client: LogStreamClient): void {
    const logBuffer = getGlobalLogBuffer();
    const logs = logBuffer.query({
      ...client.filter,
      limit: client.filter?.limit || 100,
    });

    if (logs.length > 0) {
      this.sendToClient(client, {
        type: "initial",
        logs,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private setupEventListeners(): void {
    // Listen for new logs
    this.logBuffer.on("log-added", (log: LogEntry) => {
      this.broadcastLog(log);
    });
  }

  private broadcastLog(log: LogEntry): void {
    if (this.clients.size === 0) return;

    this.logger.trace(`Broadcasting log: "${log.msg}"`);

    // Send log to each client based on their filter
    for (const client of this.clients) {
      if (this.shouldSendToClient(log, client.filter)) {
        this.sendToClient(client, {
          type: "update",
          logs: [log],
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  private shouldSendToClient(log: LogEntry, filter?: LogFilter): boolean {
    if (!filter) return true;

    // Check level filter
    if (filter.level && this.getLevelPriority(log.level) < this.getLevelPriority(filter.level)) {
      return false;
    }

    // If executionId filter is provided, check both executionId and parentExecutionId
    if (filter.executionId) {
      const matchesExecution =
        log.executionId === filter.executionId || log.parentExecutionId === filter.executionId;
      if (!matchesExecution) return false;
    }

    // Check other filters
    if (filter.agentId && log.agentId !== filter.agentId) return false;
    if (filter.conversationId && log.conversationId !== filter.conversationId) return false;
    if (filter.workflowId && log.workflowId !== filter.workflowId) return false;

    // Check time filters
    if (filter.since && new Date(log.time) < filter.since) return false;
    if (filter.until && new Date(log.time) > filter.until) return false;

    return true;
  }

  private getLevelPriority(level: string): number {
    const priorities: Record<string, number> = {
      fatal: 60,
      error: 50,
      warn: 40,
      info: 30,
      debug: 20,
      trace: 10,
    };
    return priorities[level] || 0;
  }

  private sendToClient(client: LogStreamClient, data: any): void {
    if (client.ws.readyState === 1) {
      // WebSocket.OPEN
      try {
        client.ws.send(safeStringify(data));
      } catch (error) {
        this.logger.error("Failed to send log to client", { error });
        this.clients.delete(client);
      }
    }
  }

  removeAllClients(): void {
    for (const client of this.clients) {
      client.ws.close();
    }
    this.clients.clear();
  }
}
