import type { WebSocket } from "ws";
import { getGlobalLogBuffer, type LogFilter, type LogEntry } from "@voltagent/logger";
import { devLogger } from "@voltagent/internal/dev";

export interface LogStreamClient {
  ws: WebSocket;
  filter?: LogFilter;
}

export class LogStreamManager {
  private clients: Set<LogStreamClient> = new Set();
  private intervalId?: NodeJS.Timeout;
  private lastBroadcastTime: Date = new Date();

  constructor() {
    // Start broadcasting logs every 500ms
    this.startBroadcasting();
  }

  addClient(ws: WebSocket, filter?: LogFilter): void {
    const client: LogStreamClient = { ws, filter };
    this.clients.add(client);

    // Send initial logs to the new client
    this.sendInitialLogs(client);

    // Handle client disconnect
    ws.on("close", () => {
      this.clients.delete(client);
      devLogger.debug(`Log stream client disconnected. Active clients: ${this.clients.size}`);
    });

    // Handle client messages (filter updates)
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "updateFilter") {
          client.filter = message.filter;
          devLogger.debug("Updated log filter for client", client.filter);
        }
      } catch (error) {
        devLogger.error("Failed to parse WebSocket message:", error);
      }
    });

    devLogger.debug(`Log stream client connected. Active clients: ${this.clients.size}`);
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

  private startBroadcasting(): void {
    this.intervalId = setInterval(() => {
      this.broadcastNewLogs();
    }, 500);
  }

  private broadcastNewLogs(): void {
    if (this.clients.size === 0) return;

    const logBuffer = getGlobalLogBuffer();
    const now = new Date();

    // Get logs since last broadcast
    const allLogs = logBuffer.query({
      since: this.lastBroadcastTime,
      until: now,
    });

    if (allLogs.length === 0) return;

    // Send filtered logs to each client
    for (const client of this.clients) {
      const filteredLogs = this.filterLogsForClient(allLogs, client.filter);
      if (filteredLogs.length > 0) {
        this.sendToClient(client, {
          type: "update",
          logs: filteredLogs,
          timestamp: now.toISOString(),
        });
      }
    }

    this.lastBroadcastTime = now;
  }

  private filterLogsForClient(logs: LogEntry[], filter?: LogFilter): LogEntry[] {
    if (!filter) return logs;

    return logs.filter((log) => {
      if (filter.level && this.getLevelPriority(log.level) < this.getLevelPriority(filter.level)) {
        return false;
      }
      if (filter.agentId && log.agentId !== filter.agentId) return false;
      if (filter.conversationId && log.conversationId !== filter.conversationId) return false;
      if (filter.workflowId && log.workflowId !== filter.workflowId) return false;
      if (filter.executionId && log.executionId !== filter.executionId) return false;
      return true;
    });
  }

  private getLevelPriority(level: string): number {
    const priorities: Record<string, number> = {
      trace: 10,
      debug: 20,
      info: 30,
      warn: 40,
      error: 50,
      fatal: 60,
    };
    return priorities[level.toLowerCase()] || 0;
  }

  private sendToClient(client: LogStreamClient, data: any): void {
    try {
      if (client.ws.readyState === client.ws.OPEN) {
        client.ws.send(JSON.stringify(data));
      }
    } catch (error) {
      devLogger.error("Failed to send log to client:", error);
      this.clients.delete(client);
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Close all client connections
    for (const client of this.clients) {
      client.ws.close();
    }
    this.clients.clear();
  }
}
