import { vi, describe, expect, it, beforeEach } from "vitest";
import { InMemoryLogBuffer } from "./buffer";
import type { LogEntry, LogFilter } from "./types";

describe("InMemoryLogBuffer", () => {
  let buffer: InMemoryLogBuffer;

  beforeEach(() => {
    buffer = new InMemoryLogBuffer();
  });

  describe("constructor", () => {
    it("should create buffer with default max size of 1000", () => {
      const defaultBuffer = new InMemoryLogBuffer();
      expect(defaultBuffer.size()).toBe(0);
    });

    it("should create buffer with custom max size", () => {
      const customBuffer = new InMemoryLogBuffer(500);
      expect(customBuffer.size()).toBe(0);
    });
  });

  describe("add", () => {
    it("should add entries to the buffer", () => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "info",
        msg: "Test message",
      };

      buffer.add(entry);
      expect(buffer.size()).toBe(1);
      expect(buffer.query()[0]).toEqual(entry);
    });

    it("should maintain circular buffer behavior when exceeding max size", () => {
      const smallBuffer = new InMemoryLogBuffer(3);

      const entries: LogEntry[] = [
        { timestamp: "2024-01-01T00:00:00.000Z", level: "info", msg: "Entry 1" },
        { timestamp: "2024-01-01T00:00:01.000Z", level: "info", msg: "Entry 2" },
        { timestamp: "2024-01-01T00:00:02.000Z", level: "info", msg: "Entry 3" },
        { timestamp: "2024-01-01T00:00:03.000Z", level: "info", msg: "Entry 4" },
      ];

      entries.forEach((entry) => smallBuffer.add(entry));

      expect(smallBuffer.size()).toBe(3);
      const results = smallBuffer.query();
      expect(results[0].msg).toBe("Entry 2");
      expect(results[1].msg).toBe("Entry 3");
      expect(results[2].msg).toBe("Entry 4");
    });
  });

  describe("query", () => {
    beforeEach(() => {
      // Add test entries
      const entries: LogEntry[] = [
        {
          timestamp: "2024-01-01T00:00:00.000Z",
          level: "debug",
          msg: "Debug message",
          agentId: "agent1",
          conversationId: "conv1",
          workflowId: "workflow1",
          executionId: "exec1",
        },
        {
          timestamp: "2024-01-01T00:00:01.000Z",
          level: "info",
          msg: "Info message",
          agentId: "agent2",
          conversationId: "conv2",
          workflowId: "workflow2",
          executionId: "exec2",
        },
        {
          timestamp: "2024-01-01T00:00:02.000Z",
          level: "warn",
          msg: "Warning message",
          agentId: "agent1",
          conversationId: "conv1",
          parentExecutionId: "exec1", // Sub-agent log
        },
        {
          timestamp: "2024-01-01T00:00:03.000Z",
          level: "error",
          msg: "Error message",
          agentId: "agent2",
        },
      ];

      entries.forEach((entry) => buffer.add(entry));
    });

    it("should return all entries when no filter is provided", () => {
      const results = buffer.query();
      expect(results).toHaveLength(4);
    });

    it("should filter by log level with priority", () => {
      const filter: LogFilter = { level: "info" };
      const results = buffer.query(filter);

      expect(results).toHaveLength(3); // info, warn, error
      expect(results.every((entry) => ["info", "warn", "error"].includes(entry.level))).toBe(true);
    });

    it("should filter by agentId", () => {
      const filter: LogFilter = { agentId: "agent1" };
      const results = buffer.query(filter);

      expect(results).toHaveLength(2);
      expect(results.every((entry) => entry.agentId === "agent1")).toBe(true);
    });

    it("should filter by conversationId", () => {
      const filter: LogFilter = { conversationId: "conv1" };
      const results = buffer.query(filter);

      expect(results).toHaveLength(2);
      expect(results.every((entry) => entry.conversationId === "conv1")).toBe(true);
    });

    it("should filter by workflowId", () => {
      const filter: LogFilter = { workflowId: "workflow1" };
      const results = buffer.query(filter);

      expect(results).toHaveLength(1);
      expect(results[0].workflowId).toBe("workflow1");
    });

    it("should filter by executionId including parentExecutionId", () => {
      const filter: LogFilter = { executionId: "exec1" };
      const results = buffer.query(filter);

      expect(results).toHaveLength(2); // Direct match and sub-agent log
      expect(results[0].executionId).toBe("exec1");
      expect(results[1].parentExecutionId).toBe("exec1");
    });

    it("should filter by time range - since", () => {
      const filter: LogFilter = {
        since: new Date("2024-01-01T00:00:01.500Z"),
      };
      const results = buffer.query(filter);

      expect(results).toHaveLength(2); // Last two entries
      expect(results[0].msg).toContain("Warning");
      expect(results[1].msg).toContain("Error");
    });

    it("should filter by time range - until", () => {
      const filter: LogFilter = {
        until: new Date("2024-01-01T00:00:01.500Z"),
      };
      const results = buffer.query(filter);

      expect(results).toHaveLength(2); // First two entries
      expect(results[0].msg).toContain("Debug");
      expect(results[1].msg).toContain("Info");
    });

    it("should filter by time range - both since and until", () => {
      const filter: LogFilter = {
        since: new Date("2024-01-01T00:00:00.500Z"),
        until: new Date("2024-01-01T00:00:02.500Z"),
      };
      const results = buffer.query(filter);

      expect(results).toHaveLength(2); // Middle two entries
      expect(results[0].msg).toContain("Info");
      expect(results[1].msg).toContain("Warning");
    });

    it("should apply limit to results", () => {
      const filter: LogFilter = { limit: 2 };
      const results = buffer.query(filter);

      expect(results).toHaveLength(2);
      // Should return the last 2 entries
      expect(results[0].msg).toContain("Warning");
      expect(results[1].msg).toContain("Error");
    });

    it("should combine multiple filters", () => {
      const filter: LogFilter = {
        level: "debug",
        agentId: "agent1",
        limit: 10,
      };
      const results = buffer.query(filter);

      expect(results).toHaveLength(2);
      expect(results.every((entry) => entry.agentId === "agent1")).toBe(true);
    });

    it("should return a copy of the buffer array", () => {
      const results = buffer.query();
      const originalLength = results.length;

      // Modifying the returned array should not affect the buffer
      results.pop();

      const newResults = buffer.query();
      expect(newResults.length).toBe(originalLength);
    });
  });

  describe("clear", () => {
    it("should clear all entries from the buffer", () => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "info",
        msg: "Test message",
      };

      buffer.add(entry);
      buffer.add(entry);
      expect(buffer.size()).toBe(2);

      buffer.clear();
      expect(buffer.size()).toBe(0);
      expect(buffer.query()).toEqual([]);
    });
  });

  describe("size", () => {
    it("should return the current number of entries", () => {
      expect(buffer.size()).toBe(0);

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "info",
        msg: "Test message",
      };

      buffer.add(entry);
      expect(buffer.size()).toBe(1);

      buffer.add(entry);
      expect(buffer.size()).toBe(2);
    });
  });

  describe("getLevelPriority", () => {
    it("should handle case-insensitive level names", () => {
      const entries: LogEntry[] = [
        { timestamp: new Date().toISOString(), level: "DEBUG", msg: "Debug" },
        { timestamp: new Date().toISOString(), level: "Info", msg: "Info" },
        { timestamp: new Date().toISOString(), level: "WARN", msg: "Warn" },
      ];

      entries.forEach((entry) => buffer.add(entry));

      const filter: LogFilter = { level: "info" };
      const results = buffer.query(filter);

      expect(results).toHaveLength(2); // Info and Warn
    });

    it("should handle unknown log levels", () => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "custom",
        msg: "Custom level message",
      };

      buffer.add(entry);

      const filter: LogFilter = { level: "debug" };
      const results = buffer.query(filter);

      expect(results).toHaveLength(0); // Unknown level has priority 0
    });
  });
});
