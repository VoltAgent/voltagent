import type { LogBuffer, LogEntry, LogFilter } from "./types";

/**
 * In-memory circular buffer for storing recent log entries
 */
export class InMemoryLogBuffer implements LogBuffer {
  private buffer: LogEntry[] = [];
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  add(entry: LogEntry): void {
    this.buffer.push(entry);

    // Remove oldest entries if buffer exceeds max size
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  query(filter?: LogFilter): LogEntry[] {
    if (!filter) {
      return [...this.buffer];
    }

    let results = this.buffer;

    // Filter by level
    if (filter.level) {
      const levelPriority = this.getLevelPriority(filter.level);
      results = results.filter((entry) => this.getLevelPriority(entry.level) >= levelPriority);
    }

    // Filter by agentId
    if (filter.agentId) {
      results = results.filter((entry) => entry.agentId === filter.agentId);
    }

    // Filter by conversationId
    if (filter.conversationId) {
      results = results.filter((entry) => entry.conversationId === filter.conversationId);
    }

    // Filter by workflowId
    if (filter.workflowId) {
      results = results.filter((entry) => entry.workflowId === filter.workflowId);
    }

    // Filter by executionId (also check parentExecutionId for sub-agent logs)
    if (filter.executionId) {
      results = results.filter(
        (entry) =>
          entry.executionId === filter.executionId ||
          entry.parentExecutionId === filter.executionId,
      );
    }

    // Filter by time range
    if (filter.since || filter.until) {
      results = results.filter((entry) => {
        const entryTime = new Date(entry.timestamp);
        // Return logs that are after 'since' and before or equal to 'until'
        if (filter.since && entryTime < filter.since) return false;
        if (filter.until && entryTime > filter.until) return false;
        return true;
      });
    }

    // Apply limit
    if (filter.limit && filter.limit > 0) {
      results = results.slice(-filter.limit);
    }

    return [...results];
  }

  clear(): void {
    this.buffer = [];
  }

  size(): number {
    return this.buffer.length;
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
}
