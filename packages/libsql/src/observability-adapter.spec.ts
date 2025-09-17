/**
 * Unit tests for LibSQLObservabilityAdapter
 */

import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { ObservabilitySpan } from "@voltagent/core";
import { SpanKind, SpanStatusCode } from "@voltagent/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LibSQLObservabilityAdapter } from "./observability-adapter";

describe("LibSQLObservabilityAdapter", () => {
  let adapter: LibSQLObservabilityAdapter;
  const testDbPath = join(process.cwd(), ".test-observability");

  beforeEach(async () => {
    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      rmSync(testDbPath, { recursive: true, force: true });
    }

    // Create adapter with in-memory database for testing
    adapter = new LibSQLObservabilityAdapter({
      url: "file::memory:",
      debug: false,
    });

    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.clear();
      await adapter.close();
    }
  });

  describe("Database Initialization", () => {
    it("should initialize database tables", async () => {
      // Database should be initialized in constructor
      // Test by adding a span - should not throw
      const span = createTestSpan();
      await expect(adapter.addSpan(span)).resolves.not.toThrow();
    });

    it("should create directory for file-based database", async () => {
      const fileAdapter = new LibSQLObservabilityAdapter({
        url: `file:${testDbPath}/observability.db`,
      });

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(existsSync(testDbPath)).toBe(true);

      await fileAdapter.close();
      rmSync(testDbPath, { recursive: true, force: true });
    });
  });

  describe("addSpan", () => {
    it("should add a basic span", async () => {
      const span = createTestSpan();

      await adapter.addSpan(span);

      const retrieved = await adapter.getSpan(span.spanId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.spanId).toBe(span.spanId);
      expect(retrieved?.traceId).toBe(span.traceId);
      expect(retrieved?.name).toBe(span.name);
    });

    it("should store span attributes correctly", async () => {
      const span = createTestSpan({
        attributes: {
          "voltagent.type": "agent",
          "voltagent.agent.id": "test-agent",
          "user.id": "user123",
          "custom.field": { nested: "value" },
        },
      });

      await adapter.addSpan(span);

      const retrieved = await adapter.getSpan(span.spanId);
      expect(retrieved?.attributes).toEqual(span.attributes);
    });

    it("should store span events", async () => {
      const span = createTestSpan({
        events: [
          {
            name: "tool:start",
            timestamp: new Date().toISOString(),
            attributes: { "tool.name": "calculator" },
          },
          {
            name: "tool:end",
            timestamp: new Date().toISOString(),
            attributes: { "tool.result": 42 },
          },
        ],
      });

      await adapter.addSpan(span);

      const retrieved = await adapter.getSpan(span.spanId);
      expect(retrieved?.events).toHaveLength(2);
      expect(retrieved?.events[0].name).toBe("tool:start");
      expect(retrieved?.events[1].name).toBe("tool:end");
    });

    it("should handle parent-child relationships", async () => {
      const parentSpan = createTestSpan();
      const childSpan = createTestSpan({
        spanId: "child-span-123",
        parentSpanId: parentSpan.spanId,
      });

      await adapter.addSpan(parentSpan);
      await adapter.addSpan(childSpan);

      const trace = await adapter.getTrace(parentSpan.traceId);
      expect(trace).toHaveLength(2);

      const child = trace.find((s) => s.spanId === childSpan.spanId);
      expect(child?.parentSpanId).toBe(parentSpan.spanId);
    });

    it("should handle spans with links", async () => {
      const span = createTestSpan({
        links: [
          {
            traceId: "linked-trace-123",
            spanId: "linked-span-456",
            attributes: { "link.type": "follows_from" },
          },
        ],
      });

      await adapter.addSpan(span);

      const retrieved = await adapter.getSpan(span.spanId);
      expect(retrieved?.links).toHaveLength(1);
      expect(retrieved?.links?.[0].traceId).toBe("linked-trace-123");
    });
  });

  describe("updateSpan", () => {
    it("should update span end time", async () => {
      const span = createTestSpan({ endTime: undefined });
      await adapter.addSpan(span);

      const endTime = new Date().toISOString();
      await adapter.updateSpan(span.spanId, {
        endTime,
        duration: 1000,
      });

      const updated = await adapter.getSpan(span.spanId);
      expect(updated?.endTime).toBe(endTime);
      expect(updated?.duration).toBe(1000);
    });

    it("should update span status", async () => {
      const span = createTestSpan();
      await adapter.addSpan(span);

      await adapter.updateSpan(span.spanId, {
        status: {
          code: SpanStatusCode.ERROR,
          message: "Test error",
        },
      });

      const updated = await adapter.getSpan(span.spanId);
      expect(updated?.status.code).toBe(SpanStatusCode.ERROR);
      expect(updated?.status.message).toBe("Test error");
    });

    it("should update span attributes", async () => {
      const span = createTestSpan();
      await adapter.addSpan(span);

      const newAttributes = {
        ...span.attributes,
        "updated.field": "new value",
      };

      await adapter.updateSpan(span.spanId, {
        attributes: newAttributes,
      });

      const updated = await adapter.getSpan(span.spanId);
      expect(updated?.attributes["updated.field"]).toBe("new value");
    });

    it("should add events to span", async () => {
      const span = createTestSpan({ events: [] });
      await adapter.addSpan(span);

      const newEvents = [
        {
          name: "custom:event",
          timestamp: new Date().toISOString(),
          attributes: { detail: "test" },
        },
      ];

      await adapter.updateSpan(span.spanId, {
        events: newEvents,
      });

      const updated = await adapter.getSpan(span.spanId);
      expect(updated?.events).toHaveLength(1);
      expect(updated?.events[0].name).toBe("custom:event");
    });
  });

  describe("getSpan", () => {
    it("should return null for non-existent span", async () => {
      const result = await adapter.getSpan("non-existent");
      expect(result).toBeNull();
    });

    it("should retrieve span with all fields", async () => {
      const span = createTestSpan({
        attributes: { test: "value" },
        events: [{ name: "test", timestamp: new Date().toISOString() }],
        links: [{ traceId: "trace1", spanId: "span1" }],
        resource: { "service.name": "test-service" },
        instrumentationScope: { name: "test-scope", version: "1.0.0" },
      });

      await adapter.addSpan(span);

      const retrieved = await adapter.getSpan(span.spanId);
      expect(retrieved).toEqual(span);
    });
  });

  describe("getTrace", () => {
    it("should return empty array for non-existent trace", async () => {
      const result = await adapter.getTrace("non-existent");
      expect(result).toEqual([]);
    });

    it("should return all spans in a trace", async () => {
      const traceId = "trace-123";
      const spans = [
        createTestSpan({ traceId, spanId: "span1" }),
        createTestSpan({ traceId, spanId: "span2", parentSpanId: "span1" }),
        createTestSpan({ traceId, spanId: "span3", parentSpanId: "span2" }),
      ];

      for (const span of spans) {
        await adapter.addSpan(span);
      }

      const trace = await adapter.getTrace(traceId);
      expect(trace).toHaveLength(3);
      expect(trace.map((s) => s.spanId).sort()).toEqual(["span1", "span2", "span3"]);
    });

    it("should return spans sorted by start time", async () => {
      const traceId = "trace-456";
      const now = Date.now();
      const spans = [
        createTestSpan({
          traceId,
          spanId: "span1",
          startTime: new Date(now + 2000).toISOString(),
        }),
        createTestSpan({
          traceId,
          spanId: "span2",
          startTime: new Date(now).toISOString(),
        }),
        createTestSpan({
          traceId,
          spanId: "span3",
          startTime: new Date(now + 1000).toISOString(),
        }),
      ];

      for (const span of spans) {
        await adapter.addSpan(span);
      }

      const trace = await adapter.getTrace(traceId);
      expect(trace.map((s) => s.spanId)).toEqual(["span2", "span3", "span1"]);
    });
  });

  describe("listTraces", () => {
    it("should return empty array when no traces exist", async () => {
      const traces = await adapter.listTraces();
      expect(traces).toEqual([]);
    });

    it("should list all trace IDs", async () => {
      const traceIds = ["trace1", "trace2", "trace3"];

      for (let i = 0; i < traceIds.length; i++) {
        await adapter.addSpan(
          createTestSpan({
            traceId: traceIds[i],
            spanId: `span-${i}`, // Unique span ID for each
          }),
        );
      }

      const traces = await adapter.listTraces();
      expect(traces.sort()).toEqual(traceIds.sort());
    });

    it("should support pagination", async () => {
      // Add 5 traces
      for (let i = 1; i <= 5; i++) {
        await adapter.addSpan(
          createTestSpan({
            traceId: `trace${i}`,
            spanId: `span-page-${i}`, // Unique span ID
            startTime: new Date(Date.now() - i * 1000).toISOString(), // Older traces have lower numbers
          }),
        );
      }

      // Get first 2 traces
      const firstPage = await adapter.listTraces(2, 0);
      expect(firstPage).toHaveLength(2);

      // Get next 2 traces
      const secondPage = await adapter.listTraces(2, 2);
      expect(secondPage).toHaveLength(2);

      // Verify no overlap
      const intersection = firstPage.filter((id) => secondPage.includes(id));
      expect(intersection).toHaveLength(0);
    });
  });

  describe("deleteOldSpans", () => {
    it("should delete spans older than timestamp", async () => {
      const now = Date.now();
      const oldSpan = createTestSpan({
        spanId: "old-span",
        startTime: new Date(now - 10000).toISOString(),
      });
      const newSpan = createTestSpan({
        spanId: "new-span",
        startTime: new Date(now).toISOString(),
      });

      await adapter.addSpan(oldSpan);
      await adapter.addSpan(newSpan);

      const deleted = await adapter.deleteOldSpans(now - 5000);
      expect(deleted).toBe(1);

      const oldRetrieved = await adapter.getSpan(oldSpan.spanId);
      const newRetrieved = await adapter.getSpan(newSpan.spanId);

      expect(oldRetrieved).toBeNull();
      expect(newRetrieved).not.toBeNull();
    });

    it("should clean up empty traces", async () => {
      const traceId = "trace-to-delete";
      const span = createTestSpan({
        traceId,
        startTime: new Date(Date.now() - 10000).toISOString(),
      });

      await adapter.addSpan(span);

      const tracesBefore = await adapter.listTraces();
      expect(tracesBefore).toContain(traceId);

      await adapter.deleteOldSpans(Date.now());

      const tracesAfter = await adapter.listTraces();
      expect(tracesAfter).not.toContain(traceId);
    });

    it("should update trace metadata when partial deletion", async () => {
      const traceId = "partial-trace";
      const oldSpan = createTestSpan({
        traceId,
        spanId: "old",
        startTime: new Date(Date.now() - 10000).toISOString(),
      });
      const newSpan = createTestSpan({
        traceId,
        spanId: "new",
        startTime: new Date().toISOString(),
      });

      await adapter.addSpan(oldSpan);
      await adapter.addSpan(newSpan);

      await adapter.deleteOldSpans(Date.now() - 5000);

      const trace = await adapter.getTrace(traceId);
      expect(trace).toHaveLength(1);
      expect(trace[0].spanId).toBe("new");
    });
  });

  describe("clear", () => {
    it("should remove all spans and traces", async () => {
      // Add multiple spans
      for (let i = 0; i < 5; i++) {
        await adapter.addSpan(
          createTestSpan({
            traceId: `trace${i}`,
            spanId: `span${i}`,
          }),
        );
      }

      // Verify they exist
      let traces = await adapter.listTraces();
      expect(traces).toHaveLength(5);

      // Clear all
      await adapter.clear();

      // Verify all gone
      traces = await adapter.listTraces();
      expect(traces).toHaveLength(0);

      const stats = await adapter.getStats();
      expect(stats.spanCount).toBe(0);
      expect(stats.traceCount).toBe(0);
    });
  });

  describe("getStats", () => {
    it("should return correct statistics", async () => {
      const now = Date.now();
      const spans = [
        createTestSpan({
          traceId: "trace1",
          spanId: "span1",
          startTime: new Date(now - 3000).toISOString(),
        }),
        createTestSpan({
          traceId: "trace1",
          spanId: "span2",
          startTime: new Date(now - 2000).toISOString(),
        }),
        createTestSpan({
          traceId: "trace2",
          spanId: "span3",
          startTime: new Date(now - 1000).toISOString(),
        }),
      ];

      for (const span of spans) {
        await adapter.addSpan(span);
      }

      const stats = await adapter.getStats();
      expect(stats.spanCount).toBe(3);
      expect(stats.traceCount).toBe(2);
      expect(stats.oldestSpan).toBeDefined();
      expect(stats.newestSpan).toBeDefined();
      expect(stats.oldestSpan?.getTime()).toBeLessThan(stats.newestSpan?.getTime() as number);
    });

    it("should handle empty database", async () => {
      const stats = await adapter.getStats();
      expect(stats.spanCount).toBe(0);
      expect(stats.traceCount).toBe(0);
      expect(stats.oldestSpan).toBeUndefined();
      expect(stats.newestSpan).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle spans without optional fields", async () => {
      const minimalSpan: ObservabilitySpan = {
        traceId: "trace-min",
        spanId: "span-min",
        name: "minimal",
        kind: SpanKind.INTERNAL,
        startTime: new Date().toISOString(),
        attributes: {},
        status: { code: SpanStatusCode.UNSET },
        events: [],
      };

      await adapter.addSpan(minimalSpan);

      const retrieved = await adapter.getSpan(minimalSpan.spanId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.parentSpanId).toBeUndefined();
      expect(retrieved?.endTime).toBeUndefined();
      expect(retrieved?.links).toBeUndefined();
    });

    it("should handle large attributes", async () => {
      const largeAttributes: any = {};
      for (let i = 0; i < 100; i++) {
        largeAttributes[`field${i}`] = `value${i}`.repeat(10);
      }

      const span = createTestSpan({ attributes: largeAttributes });
      await adapter.addSpan(span);

      const retrieved = await adapter.getSpan(span.spanId);
      expect(retrieved?.attributes).toEqual(largeAttributes);
    });

    it("should handle concurrent operations", async () => {
      const promises = [];

      // Add 10 spans concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(
          adapter.addSpan(
            createTestSpan({
              spanId: `concurrent-${i}`,
              traceId: "concurrent-trace",
            }),
          ),
        );
      }

      await Promise.all(promises);

      const trace = await adapter.getTrace("concurrent-trace");
      expect(trace).toHaveLength(10);
    });
  });
});

/**
 * Helper function to create a test span
 */
function createTestSpan(overrides: Partial<ObservabilitySpan> = {}): ObservabilitySpan {
  const now = new Date().toISOString();
  return {
    traceId: "test-trace-123",
    spanId: "test-span-456",
    name: "test-span",
    kind: SpanKind.INTERNAL,
    startTime: now,
    endTime: now,
    duration: 100,
    attributes: {
      "test.attribute": "value",
    },
    status: {
      code: SpanStatusCode.OK,
    },
    events: [],
    ...overrides,
  };
}
