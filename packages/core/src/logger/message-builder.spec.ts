import { describe, expect, it } from "vitest";
import {
  ResourceType,
  ActionType,
  buildLogMessage,
  buildLogContext,
  buildAgentLogMessage,
  buildToolLogMessage,
  buildWorkflowLogMessage,
} from "./message-builder";

describe("ResourceType enum", () => {
  it("should have all expected resource types", () => {
    expect(ResourceType.AGENT).toBe("agent");
    expect(ResourceType.TOOL).toBe("tool");
    expect(ResourceType.WORKFLOW).toBe("workflow");
    expect(ResourceType.MEMORY).toBe("memory");
    expect(ResourceType.SYSTEM).toBe("system");
  });
});

describe("ActionType enum", () => {
  it("should have common action types", () => {
    expect(ActionType.START).toBe("start");
    expect(ActionType.COMPLETE).toBe("complete");
    expect(ActionType.ERROR).toBe("error");
  });

  it("should have agent-specific action types", () => {
    expect(ActionType.STREAM_START).toBe("streamStart");
    expect(ActionType.STREAMING).toBe("streaming");
    expect(ActionType.TOOL_CALL).toBe("toolCall");
    expect(ActionType.DELEGATE).toBe("delegate");
  });

  it("should have tool-specific action types", () => {
    expect(ActionType.EXECUTE).toBe("execute");
    expect(ActionType.VALIDATE).toBe("validate");
  });

  it("should have workflow-specific action types", () => {
    expect(ActionType.STEP_START).toBe("stepStart");
    expect(ActionType.STEP_COMPLETE).toBe("stepComplete");
    expect(ActionType.SUSPEND).toBe("suspend");
    expect(ActionType.RESUME).toBe("resume");
  });

  it("should have memory-specific action types", () => {
    expect(ActionType.ACCESS).toBe("access");
    expect(ActionType.STORE).toBe("store");
    expect(ActionType.RETRIEVE).toBe("retrieve");
  });
});

describe("buildLogMessage", () => {
  it("should build message with standard format", () => {
    const message = buildLogMessage(
      ResourceType.AGENT,
      "TestAgent",
      ActionType.START,
      "Starting agent execution",
    );

    expect(message).toBe("[agent:TestAgent] start - Starting agent execution");
  });

  it("should work with all resource types", () => {
    expect(
      buildLogMessage(ResourceType.TOOL, "Calculator", ActionType.EXECUTE, "Calculating sum"),
    ).toBe("[tool:Calculator] execute - Calculating sum");

    expect(
      buildLogMessage(
        ResourceType.WORKFLOW,
        "DataPipeline",
        ActionType.STEP_START,
        "Processing data",
      ),
    ).toBe("[workflow:DataPipeline] stepStart - Processing data");

    expect(
      buildLogMessage(
        ResourceType.MEMORY,
        "ConversationStore",
        ActionType.STORE,
        "Saving conversation",
      ),
    ).toBe("[memory:ConversationStore] store - Saving conversation");

    expect(
      buildLogMessage(ResourceType.SYSTEM, "Core", ActionType.ERROR, "System error occurred"),
    ).toBe("[system:Core] error - System error occurred");
  });

  it("should handle custom action strings", () => {
    const message = buildLogMessage(
      ResourceType.AGENT,
      "CustomAgent",
      "customAction",
      "Performing custom action",
    );

    expect(message).toBe("[agent:CustomAgent] customAction - Performing custom action");
  });

  it("should handle special characters in names and descriptions", () => {
    const message = buildLogMessage(
      ResourceType.TOOL,
      "My-Tool_v2.0",
      ActionType.EXECUTE,
      'Processing data: [1, 2, 3] with config {"key": "value"}',
    );

    expect(message).toBe(
      '[tool:My-Tool_v2.0] execute - Processing data: [1, 2, 3] with config {"key": "value"}',
    );
  });
});

describe("buildLogContext", () => {
  it("should build context with basic properties", () => {
    const context = buildLogContext(ResourceType.AGENT, "TestAgent", ActionType.START);

    expect(context).toEqual({
      resourceType: "agent",
      resourceName: "TestAgent",
      action: "start",
    });
  });

  it("should merge additional context", () => {
    const context = buildLogContext(ResourceType.TOOL, "Calculator", ActionType.EXECUTE, {
      executionId: "123",
      userId: "user-456",
      metadata: { version: "1.0" },
    });

    expect(context).toEqual({
      resourceType: "tool",
      resourceName: "Calculator",
      action: "execute",
      executionId: "123",
      userId: "user-456",
      metadata: { version: "1.0" },
    });
  });

  it("should handle undefined additional context", () => {
    const context = buildLogContext(
      ResourceType.WORKFLOW,
      "Pipeline",
      ActionType.COMPLETE,
      undefined,
    );

    expect(context).toEqual({
      resourceType: "workflow",
      resourceName: "Pipeline",
      action: "complete",
    });
  });

  it("should override base properties if provided in additional context", () => {
    const context = buildLogContext(ResourceType.MEMORY, "Store", ActionType.ACCESS, {
      resourceType: "overridden", // This should override
      extraField: "value",
    });

    expect(context).toEqual({
      resourceType: "overridden",
      resourceName: "Store",
      action: "access",
      extraField: "value",
    });
  });

  it("should handle custom action strings", () => {
    const context = buildLogContext(ResourceType.SYSTEM, "Core", "customAction", {
      timestamp: Date.now(),
    });

    expect(context.action).toBe("customAction");
  });
});

describe("buildAgentLogMessage", () => {
  it("should build agent-specific log messages", () => {
    const message = buildAgentLogMessage("ChatAgent", ActionType.START, "Starting conversation");

    expect(message).toBe("[agent:ChatAgent] start - Starting conversation");
  });

  it("should work with agent-specific actions", () => {
    expect(buildAgentLogMessage("StreamAgent", ActionType.STREAM_START, "Beginning stream")).toBe(
      "[agent:StreamAgent] streamStart - Beginning stream",
    );

    expect(buildAgentLogMessage("ToolAgent", ActionType.TOOL_CALL, "Calling calculator tool")).toBe(
      "[agent:ToolAgent] toolCall - Calling calculator tool",
    );

    expect(
      buildAgentLogMessage("DelegateAgent", ActionType.DELEGATE, "Delegating to sub-agent"),
    ).toBe("[agent:DelegateAgent] delegate - Delegating to sub-agent");
  });

  it("should handle custom actions", () => {
    const message = buildAgentLogMessage("CustomAgent", "think", "Processing user input");

    expect(message).toBe("[agent:CustomAgent] think - Processing user input");
  });
});

describe("buildToolLogMessage", () => {
  it("should build tool-specific log messages", () => {
    const message = buildToolLogMessage("Calculator", ActionType.EXECUTE, "Adding numbers");

    expect(message).toBe("[tool:Calculator] execute - Adding numbers");
  });

  it("should work with tool-specific actions", () => {
    expect(buildToolLogMessage("Validator", ActionType.VALIDATE, "Checking input format")).toBe(
      "[tool:Validator] validate - Checking input format",
    );

    expect(buildToolLogMessage("Database", ActionType.ERROR, "Connection failed")).toBe(
      "[tool:Database] error - Connection failed",
    );
  });

  it("should handle custom actions", () => {
    const message = buildToolLogMessage("FileTool", "read", "Reading file contents");

    expect(message).toBe("[tool:FileTool] read - Reading file contents");
  });
});

describe("buildWorkflowLogMessage", () => {
  it("should build workflow-specific log messages", () => {
    const message = buildWorkflowLogMessage(
      "DataPipeline",
      ActionType.START,
      "Beginning pipeline execution",
    );

    expect(message).toBe("[workflow:DataPipeline] start - Beginning pipeline execution");
  });

  it("should work with workflow-specific actions", () => {
    expect(
      buildWorkflowLogMessage("ETLWorkflow", ActionType.STEP_START, "Starting extraction step"),
    ).toBe("[workflow:ETLWorkflow] stepStart - Starting extraction step");

    expect(
      buildWorkflowLogMessage("ETLWorkflow", ActionType.STEP_COMPLETE, "Extraction completed"),
    ).toBe("[workflow:ETLWorkflow] stepComplete - Extraction completed");

    expect(
      buildWorkflowLogMessage("LongRunning", ActionType.SUSPEND, "Suspending for user input"),
    ).toBe("[workflow:LongRunning] suspend - Suspending for user input");

    expect(
      buildWorkflowLogMessage("LongRunning", ActionType.RESUME, "Resuming after user input"),
    ).toBe("[workflow:LongRunning] resume - Resuming after user input");
  });

  it("should handle custom actions", () => {
    const message = buildWorkflowLogMessage(
      "CustomWorkflow",
      "branch",
      "Taking conditional branch",
    );

    expect(message).toBe("[workflow:CustomWorkflow] branch - Taking conditional branch");
  });
});
