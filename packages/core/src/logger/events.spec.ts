import { describe, expect, it } from "vitest";
import {
  type LogEventName,
  LogEvents,
  getEventAction,
  getEventComponent,
  getEventStatus,
  isFailureEvent,
  isSuccessEvent,
} from "./events";

describe("LogEvents", () => {
  it("should have all expected event constants", () => {
    // Agent events
    expect(LogEvents.AGENT_GENERATION_STARTED).toBe("agent.generation.started");
    expect(LogEvents.AGENT_GENERATION_COMPLETED).toBe("agent.generation.completed");
    expect(LogEvents.AGENT_GENERATION_FAILED).toBe("agent.generation.failed");
    expect(LogEvents.AGENT_STREAM_STARTED).toBe("agent.stream.started");
    expect(LogEvents.AGENT_STREAM_COMPLETED).toBe("agent.stream.completed");
    expect(LogEvents.AGENT_STREAM_FAILED).toBe("agent.stream.failed");
    expect(LogEvents.AGENT_OBJECT_STARTED).toBe("agent.object.started");
    expect(LogEvents.AGENT_OBJECT_COMPLETED).toBe("agent.object.completed");
    expect(LogEvents.AGENT_OBJECT_FAILED).toBe("agent.object.failed");
    expect(LogEvents.AGENT_STREAM_OBJECT_STARTED).toBe("agent.stream_object.started");
    expect(LogEvents.AGENT_STREAM_OBJECT_COMPLETED).toBe("agent.stream_object.completed");
    expect(LogEvents.AGENT_STREAM_OBJECT_FAILED).toBe("agent.stream_object.failed");
    expect(LogEvents.AGENT_TOOL_INITIATED).toBe("agent.tool.initiated");
    expect(LogEvents.AGENT_CREATED).toBe("agent.lifecycle.created");
    expect(LogEvents.AGENT_STEP_TEXT).toBe("agent.step.text");
    expect(LogEvents.AGENT_STEP_TOOL_CALL).toBe("agent.step.tool_call");
    expect(LogEvents.AGENT_STEP_TOOL_RESULT).toBe("agent.step.tool_result");

    // Tool events
    expect(LogEvents.TOOL_EXECUTION_STARTED).toBe("tool.execution.started");
    expect(LogEvents.TOOL_EXECUTION_COMPLETED).toBe("tool.execution.completed");
    expect(LogEvents.TOOL_EXECUTION_FAILED).toBe("tool.execution.failed");
    expect(LogEvents.TOOL_REGISTERED).toBe("tool.lifecycle.registered");
    expect(LogEvents.TOOL_REMOVED).toBe("tool.lifecycle.removed");

    // Memory events
    expect(LogEvents.MEMORY_OPERATION_STARTED).toBe("memory.operation.started");
    expect(LogEvents.MEMORY_OPERATION_COMPLETED).toBe("memory.operation.completed");
    expect(LogEvents.MEMORY_OPERATION_FAILED).toBe("memory.operation.failed");
    expect(LogEvents.MEMORY_CONVERSATION_LOADED).toBe("memory.conversation.loaded");
    expect(LogEvents.MEMORY_CONVERSATION_SAVED).toBe("memory.conversation.saved");

    // Workflow events
    expect(LogEvents.WORKFLOW_STARTED).toBe("workflow.execution.started");
    expect(LogEvents.WORKFLOW_COMPLETED).toBe("workflow.execution.completed");
    expect(LogEvents.WORKFLOW_FAILED).toBe("workflow.execution.failed");
    expect(LogEvents.WORKFLOW_SUSPENDED).toBe("workflow.execution.suspended");
    expect(LogEvents.WORKFLOW_RESUMED).toBe("workflow.execution.resumed");
    expect(LogEvents.WORKFLOW_STEP_STARTED).toBe("workflow.step.started");
    expect(LogEvents.WORKFLOW_STEP_COMPLETED).toBe("workflow.step.completed");
    expect(LogEvents.WORKFLOW_STEP_FAILED).toBe("workflow.step.failed");
    expect(LogEvents.WORKFLOW_STEP_SKIPPED).toBe("workflow.step.skipped");

    // MCP events
    expect(LogEvents.MCP_CONNECTION_ESTABLISHED).toBe("mcp.connection.established");
    expect(LogEvents.MCP_CONNECTION_FAILED).toBe("mcp.connection.failed");
    expect(LogEvents.MCP_CONNECTION_CLOSED).toBe("mcp.connection.closed");
    expect(LogEvents.MCP_METHOD_CALLED).toBe("mcp.method.called");
    expect(LogEvents.MCP_METHOD_COMPLETED).toBe("mcp.method.completed");
    expect(LogEvents.MCP_METHOD_FAILED).toBe("mcp.method.failed");

    // Event propagation
    expect(LogEvents.EVENT_PROPAGATED).toBe("event.propagation.propagated");
    expect(LogEvents.EVENT_PROPAGATION_FAILED).toBe("event.propagation.failed");
    expect(LogEvents.EVENT_PROPAGATION_SKIPPED).toBe("event.propagation.skipped");

    // API events
    expect(LogEvents.API_REQUEST_RECEIVED).toBe("api.request.received");
    expect(LogEvents.API_REQUEST_COMPLETED).toBe("api.request.completed");
    expect(LogEvents.API_REQUEST_FAILED).toBe("api.request.failed");
    expect(LogEvents.API_WEBSOCKET_CONNECTED).toBe("api.websocket.connected");
    expect(LogEvents.API_WEBSOCKET_DISCONNECTED).toBe("api.websocket.disconnected");
  });

  it("should follow consistent naming pattern", () => {
    Object.values(LogEvents).forEach((event) => {
      // Should have at least 3 parts: component.entity.status
      const parts = event.split(".");
      expect(parts.length).toBeGreaterThanOrEqual(3);

      // Each part should be lowercase
      parts.forEach((part) => {
        expect(part).toBe(part.toLowerCase());
      });
    });
  });
});

describe("getEventComponent", () => {
  it("should extract component from event name", () => {
    expect(getEventComponent(LogEvents.AGENT_GENERATION_STARTED)).toBe("agent");
    expect(getEventComponent(LogEvents.TOOL_EXECUTION_STARTED)).toBe("tool");
    expect(getEventComponent(LogEvents.MEMORY_OPERATION_STARTED)).toBe("memory");
    expect(getEventComponent(LogEvents.WORKFLOW_STARTED)).toBe("workflow");
    expect(getEventComponent(LogEvents.MCP_CONNECTION_ESTABLISHED)).toBe("mcp");
    expect(getEventComponent(LogEvents.API_REQUEST_RECEIVED)).toBe("api");
    expect(getEventComponent(LogEvents.EVENT_PROPAGATED)).toBe("event");
  });

  it("should handle any event following the pattern", () => {
    const customEvent = "custom.entity.action.status" as LogEventName;
    expect(getEventComponent(customEvent)).toBe("custom");
  });
});

describe("getEventAction", () => {
  it("should extract action from event name", () => {
    expect(getEventAction(LogEvents.AGENT_GENERATION_STARTED)).toBe("generation");
    expect(getEventAction(LogEvents.TOOL_EXECUTION_STARTED)).toBe("execution");
    expect(getEventAction(LogEvents.MEMORY_OPERATION_STARTED)).toBe("operation");
    expect(getEventAction(LogEvents.WORKFLOW_STARTED)).toBe("execution");
  });

  it("should handle multi-part actions", () => {
    expect(getEventAction(LogEvents.AGENT_STREAM_OBJECT_STARTED)).toBe("stream_object");
    expect(getEventAction(LogEvents.AGENT_TOOL_INITIATED)).toBe("tool");
    expect(getEventAction(LogEvents.AGENT_STEP_TOOL_CALL)).toBe("step");
  });

  it("should handle lifecycle actions", () => {
    expect(getEventAction(LogEvents.AGENT_CREATED)).toBe("lifecycle");
    expect(getEventAction(LogEvents.TOOL_REGISTERED)).toBe("lifecycle");
  });

  it("should handle event propagation actions", () => {
    expect(getEventAction(LogEvents.EVENT_PROPAGATED)).toBe("propagation");
    expect(getEventAction(LogEvents.EVENT_PROPAGATION_FAILED)).toBe("propagation");
  });
});

describe("getEventStatus", () => {
  it("should extract status from event name", () => {
    expect(getEventStatus(LogEvents.AGENT_GENERATION_STARTED)).toBe("started");
    expect(getEventStatus(LogEvents.AGENT_GENERATION_COMPLETED)).toBe("completed");
    expect(getEventStatus(LogEvents.AGENT_GENERATION_FAILED)).toBe("failed");
  });

  it("should handle different status types", () => {
    expect(getEventStatus(LogEvents.WORKFLOW_SUSPENDED)).toBe("suspended");
    expect(getEventStatus(LogEvents.WORKFLOW_RESUMED)).toBe("resumed");
    expect(getEventStatus(LogEvents.WORKFLOW_STEP_SKIPPED)).toBe("skipped");
    expect(getEventStatus(LogEvents.MCP_CONNECTION_ESTABLISHED)).toBe("established");
    expect(getEventStatus(LogEvents.MCP_CONNECTION_CLOSED)).toBe("closed");
    expect(getEventStatus(LogEvents.API_WEBSOCKET_CONNECTED)).toBe("connected");
    expect(getEventStatus(LogEvents.API_WEBSOCKET_DISCONNECTED)).toBe("disconnected");
  });

  it("should handle action-only events", () => {
    expect(getEventStatus(LogEvents.AGENT_TOOL_INITIATED)).toBe("initiated");
    expect(getEventStatus(LogEvents.AGENT_CREATED)).toBe("created");
    expect(getEventStatus(LogEvents.TOOL_REGISTERED)).toBe("registered");
    expect(getEventStatus(LogEvents.TOOL_REMOVED)).toBe("removed");
    expect(getEventStatus(LogEvents.MEMORY_CONVERSATION_LOADED)).toBe("loaded");
    expect(getEventStatus(LogEvents.MEMORY_CONVERSATION_SAVED)).toBe("saved");
    expect(getEventStatus(LogEvents.MCP_METHOD_CALLED)).toBe("called");
    expect(getEventStatus(LogEvents.EVENT_PROPAGATED)).toBe("propagated");
  });
});

describe("isFailureEvent", () => {
  it("should return true for failure events", () => {
    expect(isFailureEvent(LogEvents.AGENT_GENERATION_FAILED)).toBe(true);
    expect(isFailureEvent(LogEvents.AGENT_STREAM_FAILED)).toBe(true);
    expect(isFailureEvent(LogEvents.AGENT_OBJECT_FAILED)).toBe(true);
    expect(isFailureEvent(LogEvents.AGENT_STREAM_OBJECT_FAILED)).toBe(true);
    expect(isFailureEvent(LogEvents.TOOL_EXECUTION_FAILED)).toBe(true);
    expect(isFailureEvent(LogEvents.MEMORY_OPERATION_FAILED)).toBe(true);
    expect(isFailureEvent(LogEvents.WORKFLOW_FAILED)).toBe(true);
    expect(isFailureEvent(LogEvents.WORKFLOW_STEP_FAILED)).toBe(true);
    expect(isFailureEvent(LogEvents.MCP_CONNECTION_FAILED)).toBe(true);
    expect(isFailureEvent(LogEvents.MCP_METHOD_FAILED)).toBe(true);
    expect(isFailureEvent(LogEvents.EVENT_PROPAGATION_FAILED)).toBe(true);
    expect(isFailureEvent(LogEvents.API_REQUEST_FAILED)).toBe(true);
  });

  it("should return false for non-failure events", () => {
    expect(isFailureEvent(LogEvents.AGENT_GENERATION_STARTED)).toBe(false);
    expect(isFailureEvent(LogEvents.AGENT_GENERATION_COMPLETED)).toBe(false);
    expect(isFailureEvent(LogEvents.WORKFLOW_SUSPENDED)).toBe(false);
    expect(isFailureEvent(LogEvents.WORKFLOW_RESUMED)).toBe(false);
    expect(isFailureEvent(LogEvents.MCP_CONNECTION_ESTABLISHED)).toBe(false);
    expect(isFailureEvent(LogEvents.MCP_CONNECTION_CLOSED)).toBe(false);
  });

  it("should handle custom events", () => {
    const failureEvent = "custom.action.failed" as LogEventName;
    const successEvent = "custom.action.completed" as LogEventName;

    expect(isFailureEvent(failureEvent)).toBe(true);
    expect(isFailureEvent(successEvent)).toBe(false);
  });
});

describe("isSuccessEvent", () => {
  it("should return true for completed events", () => {
    expect(isSuccessEvent(LogEvents.AGENT_GENERATION_COMPLETED)).toBe(true);
    expect(isSuccessEvent(LogEvents.AGENT_STREAM_COMPLETED)).toBe(true);
    expect(isSuccessEvent(LogEvents.AGENT_OBJECT_COMPLETED)).toBe(true);
    expect(isSuccessEvent(LogEvents.AGENT_STREAM_OBJECT_COMPLETED)).toBe(true);
    expect(isSuccessEvent(LogEvents.TOOL_EXECUTION_COMPLETED)).toBe(true);
    expect(isSuccessEvent(LogEvents.MEMORY_OPERATION_COMPLETED)).toBe(true);
    expect(isSuccessEvent(LogEvents.WORKFLOW_COMPLETED)).toBe(true);
    expect(isSuccessEvent(LogEvents.WORKFLOW_STEP_COMPLETED)).toBe(true);
    expect(isSuccessEvent(LogEvents.MCP_METHOD_COMPLETED)).toBe(true);
    expect(isSuccessEvent(LogEvents.API_REQUEST_COMPLETED)).toBe(true);
  });

  it("should return true for passed events", () => {
    const passedEvent = "test.validation.passed" as LogEventName;
    expect(isSuccessEvent(passedEvent)).toBe(true);
  });

  it("should return false for non-success events", () => {
    expect(isSuccessEvent(LogEvents.AGENT_GENERATION_STARTED)).toBe(false);
    expect(isSuccessEvent(LogEvents.AGENT_GENERATION_FAILED)).toBe(false);
    expect(isSuccessEvent(LogEvents.WORKFLOW_SUSPENDED)).toBe(false);
    expect(isSuccessEvent(LogEvents.WORKFLOW_RESUMED)).toBe(false);
    expect(isSuccessEvent(LogEvents.MCP_CONNECTION_ESTABLISHED)).toBe(false);
    expect(isSuccessEvent(LogEvents.MCP_CONNECTION_CLOSED)).toBe(false);
  });

  it("should handle custom events", () => {
    const completedEvent = "custom.action.completed" as LogEventName;
    const passedEvent = "custom.validation.passed" as LogEventName;
    const otherEvent = "custom.action.started" as LogEventName;

    expect(isSuccessEvent(completedEvent)).toBe(true);
    expect(isSuccessEvent(passedEvent)).toBe(true);
    expect(isSuccessEvent(otherEvent)).toBe(false);
  });
});
