import type {
  LogFilter,
  ObservabilityLogRecord,
  ObservabilitySpan,
  ObservabilityStorageAdapter,
} from "../types";

/**
 * No-op storage adapter for edge runtimes where local retention is unnecessary.
 */
export class NullStorageAdapter implements ObservabilityStorageAdapter {
  async addSpan(_span: ObservabilitySpan): Promise<void> {}
  async updateSpan(_spanId: string, _updates: Partial<ObservabilitySpan>): Promise<void> {}
  async getSpan(_spanId: string): Promise<ObservabilitySpan | null> {
    return null;
  }
  async getTrace(_traceId: string): Promise<ObservabilitySpan[]> {
    return [];
  }
  async listTraces(
    _limit?: number,
    _offset?: number,
    _filter?: { entityId?: string; entityType?: "agent" | "workflow" },
  ): Promise<string[]> {
    return [];
  }
  async deleteOldSpans(_beforeTimestamp: number): Promise<number> {
    return 0;
  }
  async clear(): Promise<void> {}
  destroy(): void {}

  async saveLogRecord(_log: ObservabilityLogRecord): Promise<void> {}
  async getLogsByTraceId(_traceId: string): Promise<ObservabilityLogRecord[]> {
    return [];
  }
  async getLogsBySpanId(_spanId: string): Promise<ObservabilityLogRecord[]> {
    return [];
  }
  async queryLogs(_filter?: LogFilter): Promise<ObservabilityLogRecord[]> {
    return [];
  }
  async deleteOldLogs(_beforeTimestamp: number): Promise<number> {
    return 0;
  }
}
