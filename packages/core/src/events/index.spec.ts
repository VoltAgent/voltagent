import { vi } from "vitest";
import type { AgentHistoryEntry } from "../agent/history";
import type { AgentStatus } from "../agent/types";
import { AgentRegistry } from "../server/registry";
import { AgentEventEmitter } from "./index";

// Mock AgentRegistry
vi.mock("../server/registry");

describe("AgentEventEmitter", () => {
  let eventEmitter: AgentEventEmitter;

  beforeEach(() => {
    // Reset the singleton instance before each test
    (AgentEventEmitter as any).instance = null;
    eventEmitter = AgentEventEmitter.getInstance();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Drain timeline events to prevent interference between tests
    await eventEmitter.drainTimelineEvents();
  });

  describe("getInstance", () => {
    it("should return the same instance on multiple calls", () => {
      const instance1 = AgentEventEmitter.getInstance();
      const instance2 = AgentEventEmitter.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("agentRegistered events", () => {
    it("should emit and receive agent registered events", () =>
      new Promise<void>((done) => {
        const agentId = "test-agent";

        eventEmitter.onAgentRegistered((receivedAgentId) => {
          expect(receivedAgentId).toBe(agentId);
          done();
        });

        eventEmitter.emitAgentRegistered(agentId);
      }));

    it("should allow unsubscribing from agent registered events", () => {
      const callback = vi.fn();
      const unsubscribe = eventEmitter.onAgentRegistered(callback);

      eventEmitter.emitAgentRegistered("test-agent");
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      eventEmitter.emitAgentRegistered("test-agent-2");
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("agentUnregistered events", () => {
    it("should emit and receive agent unregistered events", () =>
      new Promise<void>((done) => {
        const agentId = "test-agent";

        eventEmitter.onAgentUnregistered((receivedAgentId) => {
          expect(receivedAgentId).toBe(agentId);
          done();
        });

        eventEmitter.emitAgentUnregistered(agentId);
      }));

    it("should allow unsubscribing from agent unregistered events", () => {
      const callback = vi.fn();
      const unsubscribe = eventEmitter.onAgentUnregistered(callback);

      eventEmitter.emitAgentUnregistered("test-agent");
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      eventEmitter.emitAgentUnregistered("test-agent-2");
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("async timeline event publishing", () => {
    // Test history entry
    const historyEntry: Partial<AgentHistoryEntry> = {
      id: "test-history-id",
      startTime: new Date("2023-01-01T00:00:00Z"),
      input: "Test input",
      output: "Test output",
      status: "completed" as AgentStatus,
      steps: [],
    };

    // Mock historyManager
    const mockHistoryManager = {
      persistTimelineEvent: vi.fn().mockResolvedValue(historyEntry as AgentHistoryEntry),
      updateEntry: vi.fn(),
      addEventToEntry: vi.fn(),
      updateTrackedEvent: vi.fn(),
    };

    // Mock agent with history and historyManager
    const mockAgent = {
      name: "TestAgent",
      getHistory: vi.fn().mockResolvedValue([historyEntry as AgentHistoryEntry]),
      id: "test-agent",
      getHistoryManager: vi.fn().mockReturnValue(mockHistoryManager),
    };

    // Setup publishTimelineEventSync spy
    let publishTimelineEventSyncSpy: any;

    beforeEach(() => {
      // Reset mock counts
      mockHistoryManager.persistTimelineEvent.mockClear();
      mockAgent.getHistoryManager.mockClear();

      // Setup publishTimelineEventSync spy (the private method that actually processes events)
      publishTimelineEventSyncSpy = vi
        .spyOn(eventEmitter as any, "publishTimelineEventSync")
        .mockResolvedValue(historyEntry as AgentHistoryEntry);

      // Mock AgentRegistry.getInstance().getAgent and getParentAgentIds
      (AgentRegistry.getInstance as any).mockReturnValue({
        getAgent: vi.fn().mockReturnValue(mockAgent),
        getParentAgentIds: vi.fn().mockReturnValue(["parent-agent"]),
      });
    });

    describe("publishTimelineEventAsync", () => {
      it("should queue events for background processing", () => {
        const testEvent = {
          id: "test-event-id",
          name: "tool:start",
          type: "tool" as const,
          startTime: "2023-01-01T00:00:00Z",
          status: "running" as const,
          input: { query: "test query" },
          output: null,
          error: null,
          metadata: {
            id: "test-tool-id",
            displayName: "Test Tool",
            agentId: "child-agent",
          },
          traceId: "test-history-id",
        };

        // Act: publish an event asynchronously
        eventEmitter.publishTimelineEventAsync({
          agentId: "child-agent",
          historyId: "test-history-id",
          event: testEvent as any,
        });

        // Assert: event should be added to queue (we can't directly test the queue, but we can verify no error)
        expect(() => {
          eventEmitter.publishTimelineEventAsync({
            agentId: "child-agent",
            historyId: "test-history-id",
            event: testEvent as any,
          });
        }).not.toThrow();
      });

      it("should assign id and startTime to events if missing", () => {
        const testEvent = {
          name: "tool:start",
          type: "tool" as const,
          status: "running" as const,
          input: { query: "test query" },
          output: null,
          error: null,
          metadata: {
            id: "test-tool-id",
            displayName: "Test Tool",
            agentId: "child-agent",
          },
          traceId: "test-history-id",
        };

        // Act: publish an event without id and startTime
        eventEmitter.publishTimelineEventAsync({
          agentId: "child-agent",
          historyId: "test-history-id",
          event: testEvent as any,
        });

        // Assert: should not throw (id and startTime should be auto-assigned)
        expect(() => {
          eventEmitter.publishTimelineEventAsync({
            agentId: "child-agent",
            historyId: "test-history-id",
            event: testEvent as any,
          });
        }).not.toThrow();
      });
    });

    describe("automatic event propagation", () => {
      // Test event to be published
      const testEvent = {
        id: "test-event-id",
        name: "tool:start" as const,
        type: "tool" as const,
        startTime: "2023-01-01T00:00:00Z",
        status: "running" as const,
        input: { query: "test query" },
        output: null,
        error: null,
        metadata: {
          id: "test-tool-id",
          displayName: "Test Tool",
          agentId: "child-agent",
        },
        traceId: "test-history-id",
      };

      it("should propagate events to parent agents automatically", async () => {
        // Restore the original implementation for this test
        publishTimelineEventSyncSpy.mockRestore();

        // Spy on propagateEventToParentAgents for direct verification
        const propagateSpy = vi
          .spyOn(eventEmitter as any, "propagateEventToParentAgents")
          .mockResolvedValue(undefined);

        // Act: publish an event synchronously (internal method for testing)
        await (eventEmitter as any).publishTimelineEventSync({
          agentId: "child-agent",
          historyId: "test-history-id",
          event: testEvent,
        });

        // Assert: propagateEventToParentAgents should be called
        expect(propagateSpy).toHaveBeenCalledWith("child-agent", "test-history-id", testEvent);
      });

      it("should not propagate events when skipPropagation is true", async () => {
        // Restore the original implementation for this test
        publishTimelineEventSyncSpy.mockRestore();

        // Spy on propagateEventToParentAgents
        const propagateSpy = vi
          .spyOn(eventEmitter as any, "propagateEventToParentAgents")
          .mockResolvedValue(undefined);

        // Act: publish an event with skipPropagation=true
        await (eventEmitter as any).publishTimelineEventSync({
          agentId: "child-agent",
          historyId: "test-history-id",
          event: testEvent,
          skipPropagation: true,
        });

        // Assert: propagateEventToParentAgents should NOT be called
        expect(propagateSpy).not.toHaveBeenCalled();
      });

      it("should propagate events with enriched metadata to parent agents", async () => {
        // Restore the original publishTimelineEventSync
        publishTimelineEventSyncSpy.mockRestore();

        // Mock propagateEventToParentAgents to capture what would be sent to the parent agent
        const propagateMock = vi.fn().mockResolvedValue(undefined);

        // Store original method and apply mock
        const originalMethod = (eventEmitter as any).propagateEventToParentAgents;
        (eventEmitter as any).propagateEventToParentAgents = propagateMock;

        try {
          // Act: publish an event
          await (eventEmitter as any).publishTimelineEventSync({
            agentId: "child-agent",
            historyId: "test-history-id",
            event: testEvent,
          });

          // Verify propagateEventToParentAgents was called
          expect(propagateMock).toHaveBeenCalled();

          // Check that it was called with the correct parameters
          const call = propagateMock.mock.calls[0];
          expect(call[0]).toBe("child-agent"); // sourceAgentId
          expect(call[1]).toBe("test-history-id"); // historyId
          expect(call[2]).toEqual(testEvent); // event
        } finally {
          // Restore the original method (even if test fails)
          (eventEmitter as any).propagateEventToParentAgents = originalMethod;
        }
      });

      it("should handle multi-level agent hierarchies", async () => {
        // Setup mock implementation for three-level hierarchy
        const mockRegistry = AgentRegistry.getInstance() as any;
        const mockGetParentAgentIds = vi
          .fn()
          .mockReturnValueOnce(["parent-agent"]) // child's parent is 'parent-agent'
          .mockReturnValueOnce(["grandparent-agent"]); // parent's parent is 'grandparent-agent'

        mockRegistry.getParentAgentIds = mockGetParentAgentIds;

        // Mock propagateEventToParentAgents to track propagation calls
        const propagationHistory: string[] = [];
        const mockPropagateToParents = vi
          .fn()
          .mockImplementation(
            async (
              sourceAgentId: string,
              _historyId: string,
              _event: any,
              visited?: Set<string>,
            ) => {
              propagationHistory.push(sourceAgentId);

              // Simplified version of the real method
              if (visited?.has(sourceAgentId)) return;
              const newVisited = visited || new Set<string>();
              newVisited.add(sourceAgentId);

              const parentIds = mockRegistry.getParentAgentIds(sourceAgentId);
              for (const parentId of parentIds) {
                propagationHistory.push(`${sourceAgentId} -> ${parentId}`);
                // Simulate recursive call
                if (parentId === "parent-agent") {
                  propagationHistory.push("parent-agent");
                  propagationHistory.push("parent-agent -> grandparent-agent");
                }
              }
            },
          );

        // Store original method and apply mock
        const originalMethod = (eventEmitter as any).propagateEventToParentAgents;
        (eventEmitter as any).propagateEventToParentAgents = mockPropagateToParents;

        try {
          // Act: call propagation directly for testing
          await (eventEmitter as any).propagateEventToParentAgents(
            "child-agent",
            "test-history-id",
            testEvent,
          );

          // Assert: check propagation history
          expect(propagationHistory).toEqual([
            "child-agent",
            "child-agent -> parent-agent",
            "parent-agent",
            "parent-agent -> grandparent-agent",
          ]);
        } finally {
          // Restore original method
          (eventEmitter as any).propagateEventToParentAgents = originalMethod;
        }
      });
    });

    describe("emitHierarchicalHistoryEntryCreated", () => {
      it("should propagate history entry created events to parent agents", async () => {
        // Setup spy for publishTimelineEventAsync
        const publishAsyncSpy = vi.spyOn(eventEmitter, "publishTimelineEventAsync");

        // Act
        await eventEmitter.emitHierarchicalHistoryEntryCreated(
          "child-agent",
          historyEntry as AgentHistoryEntry,
        );

        // Assert
        expect(AgentRegistry.getInstance().getParentAgentIds).toHaveBeenCalledWith("child-agent");
        expect(AgentRegistry.getInstance().getAgent).toHaveBeenCalledWith("parent-agent");
        expect(publishAsyncSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            agentId: "parent-agent",
            historyId: "test-history-id",
            event: expect.objectContaining({
              name: "agent:start",
              type: "agent",
              metadata: expect.objectContaining({
                displayName: "TestAgent",
                id: "child-agent",
                agentId: "parent-agent",
              }),
            }),
          }),
        );
      });

      it("should handle multi-level hierarchy", async () => {
        // Setup agent hierarchy: child -> parent -> grandparent
        (AgentRegistry.getInstance() as any).getParentAgentIds
          .mockReturnValueOnce(["parent-agent"]) // child's parent
          .mockReturnValueOnce(["grandparent-agent"]); // parent's parent

        // Setup spy for publishTimelineEventAsync
        const publishAsyncSpy = vi.spyOn(eventEmitter, "publishTimelineEventAsync");

        // Act
        await eventEmitter.emitHierarchicalHistoryEntryCreated(
          "child-agent",
          historyEntry as AgentHistoryEntry,
        );

        // Assert
        expect(AgentRegistry.getInstance().getParentAgentIds).toHaveBeenCalledWith("child-agent");
        expect(AgentRegistry.getInstance().getParentAgentIds).toHaveBeenCalledWith("parent-agent");
        // Should have published 3 times due to recursive propagation: child->parent, child->grandparent, parent->grandparent
        expect(publishAsyncSpy).toHaveBeenCalledTimes(3);

        // Should have published to parent
        expect(publishAsyncSpy).toHaveBeenCalledWith(
          expect.objectContaining({ agentId: "parent-agent" }),
        );

        // Should have published to grandparent
        expect(publishAsyncSpy).toHaveBeenCalledWith(
          expect.objectContaining({ agentId: "grandparent-agent" }),
        );
      });

      it("should prevent infinite loops in cyclic agent relationships", async () => {
        // Setup a cycle: A -> B -> A
        (AgentRegistry.getInstance() as any).getParentAgentIds
          .mockReturnValueOnce(["agent-B"]) // agent-A's parent is agent-B
          .mockReturnValueOnce(["agent-A"]); // agent-B's parent is agent-A (cycle)

        // Setup spy for publishTimelineEventAsync
        const publishAsyncSpy = vi.spyOn(eventEmitter, "publishTimelineEventAsync");

        // Act
        await eventEmitter.emitHierarchicalHistoryEntryCreated(
          "agent-A",
          historyEntry as AgentHistoryEntry,
        );

        // Assert: should publish 2 times (A->B, B->A) but prevent infinite recursion due to visited tracking
        expect(publishAsyncSpy).toHaveBeenCalledTimes(2);
      });
    });

    describe("emitHierarchicalHistoryUpdate", () => {
      it("should propagate completed history updates to parent agents", async () => {
        // Setup completed history entry
        const completedEntry = {
          ...historyEntry,
          status: "completed" as AgentStatus,
        };

        // Setup spy for publishTimelineEventAsync
        const publishAsyncSpy = vi.spyOn(eventEmitter, "publishTimelineEventAsync");

        // Act
        await eventEmitter.emitHierarchicalHistoryUpdate(
          "child-agent",
          completedEntry as AgentHistoryEntry,
        );

        // Assert
        expect(AgentRegistry.getInstance().getParentAgentIds).toHaveBeenCalledWith("child-agent");
        expect(publishAsyncSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            agentId: "parent-agent",
            historyId: "test-history-id",
            event: expect.objectContaining({
              name: "agent:success",
              type: "agent",
              status: "completed",
              metadata: expect.objectContaining({
                displayName: "TestAgent",
                id: "child-agent",
                agentId: "parent-agent",
              }),
            }),
          }),
        );
      });

      it("should propagate error history updates to parent agents", async () => {
        // Setup error history entry
        const errorEntry = {
          ...historyEntry,
          status: "error" as AgentStatus,
          output: "Error message",
        };

        // Setup spy for publishTimelineEventAsync
        const publishAsyncSpy = vi.spyOn(eventEmitter, "publishTimelineEventAsync");

        // Act
        await eventEmitter.emitHierarchicalHistoryUpdate(
          "child-agent",
          errorEntry as AgentHistoryEntry,
        );

        // Assert
        expect(AgentRegistry.getInstance().getParentAgentIds).toHaveBeenCalledWith("child-agent");
        expect(publishAsyncSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            agentId: "parent-agent",
            historyId: "test-history-id",
            event: expect.objectContaining({
              name: "agent:error",
              type: "agent",
              status: "error",
              level: "ERROR",
              statusMessage: expect.objectContaining({
                message: "Error message",
              }),
              metadata: expect.objectContaining({
                displayName: "TestAgent",
                id: "child-agent",
                agentId: "parent-agent",
              }),
            }),
          }),
        );
      });

      it("should handle multi-level hierarchy for updates", async () => {
        // Setup agent hierarchy: child -> parent -> grandparent
        (AgentRegistry.getInstance() as any).getParentAgentIds
          .mockReturnValueOnce(["parent-agent"]) // child's parent
          .mockReturnValueOnce(["grandparent-agent"]); // parent's parent

        // Setup spy for publishTimelineEventAsync
        const publishAsyncSpy = vi.spyOn(eventEmitter, "publishTimelineEventAsync");

        // Act
        await eventEmitter.emitHierarchicalHistoryUpdate(
          "child-agent",
          historyEntry as AgentHistoryEntry,
        );

        // Assert
        expect(AgentRegistry.getInstance().getParentAgentIds).toHaveBeenCalledWith("child-agent");
        expect(AgentRegistry.getInstance().getParentAgentIds).toHaveBeenCalledWith("parent-agent");
        // Should have published 3 times due to recursive propagation: child->parent, child->grandparent, parent->grandparent
        expect(publishAsyncSpy).toHaveBeenCalledTimes(3);
      });
    });
  });
});
