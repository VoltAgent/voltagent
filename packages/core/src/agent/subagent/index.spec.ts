import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Agent } from "../agent";
import type { BaseMessage } from "../providers";
import type { AgentHandoffOptions } from "../types";
import { SubAgentManager } from "./index";

// Creating a Mock Agent class
class MockAgent {
  id: string;
  name: string;
  description: string;
  instructions: string;
  purpose?: string;
  hooks?: any;

  constructor(id: string, name: string, description = "Mock agent description") {
    this.id = id;
    this.name = name;
    this.description = description;
    this.instructions = description;
  }

  getStatus() {
    return "idle";
  }

  getModelName() {
    return "mock-model";
  }

  getFullState() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      status: this.getStatus(),
      model: this.getModelName(),
      subAgents: [],
    };
  }

  getToolsForApi() {
    return [];
  }

  async generateText(_messages: any[], _options: any) {
    return {
      text: `Response from ${this.name}`,
    };
  }

  // Mock streamText method for event forwarding tests
  async streamText(_messages: any[], _options: any) {
    const mockEvents = [
      { type: "text-delta", textDelta: "Hello " },
      { type: "text-delta", textDelta: "from " },
      { type: "text-delta", textDelta: this.name },
      {
        type: "tool-call",
        toolCallId: "tool-1",
        toolName: "mock_tool",
        args: { input: "test" },
      },
      {
        type: "tool-result",
        toolCallId: "tool-1",
        toolName: "mock_tool",
        result: "mock result",
      },
      {
        type: "finish",
        finishReason: "stop",
        usage: { totalTokens: 10 },
      },
    ];

    return {
      fullStream: (async function* () {
        for (const event of mockEvents) {
          yield event;
        }
      })(),
    };
  }
}

describe("SubAgentManager", () => {
  let subAgentManager: SubAgentManager;
  let mockAgent1: any;
  let mockAgent2: any;
  let mockDelegateToolOptions: any;

  beforeEach(() => {
    mockAgent1 = new MockAgent("agent1", "Math Agent");
    mockAgent2 = new MockAgent("agent2", "Writing Agent");
    subAgentManager = new SubAgentManager("Main Agent");
    mockDelegateToolOptions = {
      sourceAgent: mockAgent1,
      operationContext: { userContext: new Map(), systemContext: new Map() },
      currentHistoryEntryId: "history-123",
    };
  });

  describe("constructor", () => {
    it("should initialize with empty sub-agents when none provided", () => {
      expect(subAgentManager.getSubAgents()).toEqual([]);
    });

    it("should initialize with provided sub-agents", () => {
      const manager = new SubAgentManager("Main Agent", [mockAgent1, mockAgent2]);
      expect(manager.getSubAgents().length).toBe(2);
    });
  });

  describe("addSubAgent", () => {
    it("should add a new sub-agent", () => {
      subAgentManager.addSubAgent(mockAgent1);
      expect(subAgentManager.getSubAgents().length).toBe(1);
      expect(subAgentManager.getSubAgents()[0]).toBe(mockAgent1);
    });
  });

  describe("removeSubAgent", () => {
    it("should remove an existing sub-agent", () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);
      expect(subAgentManager.getSubAgents().length).toBe(2);

      subAgentManager.removeSubAgent(mockAgent1.id);
      expect(subAgentManager.getSubAgents().length).toBe(1);
      expect(subAgentManager.getSubAgents()[0]).toBe(mockAgent2);
    });
  });

  describe("hasSubAgents", () => {
    it("should return false when no sub-agents", () => {
      expect(subAgentManager.hasSubAgents()).toBe(false);
    });

    it("should return true when has sub-agents", () => {
      subAgentManager.addSubAgent(mockAgent1);
      expect(subAgentManager.hasSubAgents()).toBe(true);
    });
  });

  describe("calculateMaxSteps", () => {
    it("should return default steps when no sub-agents", () => {
      expect(subAgentManager.calculateMaxSteps()).toBe(10);
    });

    it("should return multiplied steps when has sub-agents", () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);
      expect(subAgentManager.calculateMaxSteps()).toBe(20); // 10 * 2
    });

    it("should use agent-level maxSteps when provided", () => {
      const manager = new SubAgentManager("Test Agent", []);
      expect(manager.calculateMaxSteps(50)).toBe(50);
    });

    it("should use agent-level maxSteps even when sub-agents exist", () => {
      const manager = new SubAgentManager("Test Agent", [mockAgent1, mockAgent2]);
      expect(manager.calculateMaxSteps(35)).toBe(35);
      // Should not use the default calculation (which would be 20)
    });

    it("should fall back to default calculation when no agent maxSteps provided", () => {
      const manager = new SubAgentManager("Test Agent", [mockAgent1]);
      expect(manager.calculateMaxSteps()).toBe(10); // 10 * 1 sub-agent
    });

    it("should use agent-level maxSteps of 1", () => {
      const manager = new SubAgentManager("Test Agent", [mockAgent1, mockAgent2]);
      expect(manager.calculateMaxSteps(1)).toBe(1);
    });

    it("should handle agent maxSteps with no sub-agents", () => {
      const manager = new SubAgentManager("Test Agent", []);
      expect(manager.calculateMaxSteps(15)).toBe(15);
      // Should not fall back to default 10
    });
  });

  describe("generateSupervisorSystemMessage", () => {
    it("should return the original description if no sub-agents", () => {
      const subAgentManager = new SubAgentManager("TestAgent");
      const description = "Original description";

      // Call with empty agentsMemory string (default parameter)
      expect(subAgentManager.generateSupervisorSystemMessage(description)).toBe(description);
    });

    it("should generate a supervisor message when sub-agents exist", () => {
      const subAgentAgent1 = {
        id: "agent1",
        name: "Agent 1",
        instructions: "First agent",
      } as Agent<any>;
      const subAgentAgent2 = {
        id: "agent2",
        name: "Agent 2",
        instructions: "Second agent",
      } as Agent<any>;

      const subAgentManager = new SubAgentManager("TestAgent", [subAgentAgent1, subAgentAgent2]);
      const description = "Original description";

      // Call with empty agentsMemory string (default parameter)
      const result = subAgentManager.generateSupervisorSystemMessage(description);

      expect(result).toContain("You are a supervisor agent");
      expect(result).toContain("Agent 1: First agent");
      expect(result).toContain("Agent 2: Second agent");
      expect(result).toContain("<agents_memory>");
    });

    it("should generate a supervisor message with the purpose of the sub-agents, if provided", () => {
      const subAgentAgent1 = {
        id: "agent1",
        name: "Agent 1",
        purpose: "First agent",
        instructions: "A very long instructions\nwith multiple lines\nand paragraphs",
      } as Agent<any>;
      const subAgentAgent2 = {
        id: "agent2",
        name: "Agent 2",
        instructions: "No purpose provided",
      } as Agent<any>;

      const subAgentManager = new SubAgentManager("TestAgent", [subAgentAgent1, subAgentAgent2]);
      const description = "Original description";

      // Call with empty agentsMemory string (default parameter)
      const result = subAgentManager.generateSupervisorSystemMessage(description);

      expect(result).toContain("You are a supervisor agent");
      expect(result).toContain("Agent 1: First agent");
      expect(result).toContain("Agent 2: No purpose provided");
      expect(result).toContain("<agents_memory>");
    });

    it("should match snapshot", () => {
      const subAgentAgent1 = {
        id: "agent1",
        name: "Agent 1",
        purpose: "First agent",
      } as Agent<any>;
      const subAgentManager = new SubAgentManager("TestAgent", [subAgentAgent1]);
      const description = "Some base instructions";
      const result = subAgentManager.generateSupervisorSystemMessage(description);
      expect(result).toMatchSnapshot();
    });

    describe("SupervisorConfig", () => {
      let subAgentManager: SubAgentManager;
      let mockAgent1: any;
      let mockAgent2: any;

      beforeEach(() => {
        mockAgent1 = {
          id: "agent1",
          name: "Writer Agent",
          purpose: "Creates written content",
          instructions: "You are a writing assistant",
        } as Agent<any>;

        mockAgent2 = {
          id: "agent2",
          name: "Editor Agent",
          instructions: "You review and edit content",
        } as Agent<any>;

        subAgentManager = new SubAgentManager("SupervisorAgent", [mockAgent1, mockAgent2]);
      });

      describe("systemMessage override", () => {
        it("should use custom systemMessage when provided", () => {
          const customSystemMessage = "You are a friendly content manager named ContentBot.";
          const config = {
            systemMessage: customSystemMessage,
          };

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            "Some memory",
            config,
          );

          expect(result).toContain(customSystemMessage);
          expect(result).not.toContain("You are a supervisor agent");
          expect(result).not.toContain("Base instructions");
        });

        it("should include agents memory by default with custom systemMessage", () => {
          const customSystemMessage = "Custom supervisor message";
          const agentsMemory = "user: Hello\nassistant: Hi there!";
          const config = {
            systemMessage: customSystemMessage,
          };

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            agentsMemory,
            config,
          );

          expect(result).toContain(customSystemMessage);
          expect(result).toContain("<agents_memory>");
          expect(result).toContain(agentsMemory);
        });

        it("should exclude agents memory when includeAgentsMemory is false", () => {
          const customSystemMessage = "Custom supervisor message";
          const agentsMemory = "user: Hello\nassistant: Hi there!";
          const config = {
            systemMessage: customSystemMessage,
            includeAgentsMemory: false,
          };

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            agentsMemory,
            config,
          );

          expect(result).toBe(customSystemMessage);
          expect(result).not.toContain("<agents_memory>");
          expect(result).not.toContain(agentsMemory);
        });

        it("should handle empty agentsMemory with custom systemMessage", () => {
          const customSystemMessage = "Custom supervisor message";
          const config = {
            systemMessage: customSystemMessage,
          };

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            "",
            config,
          );

          expect(result).toContain(customSystemMessage);
          expect(result).toContain("<agents_memory>");
          expect(result).toContain("No previous agent interactions available.");
        });

        it("should handle undefined agentsMemory with custom systemMessage", () => {
          const customSystemMessage = "Custom supervisor message";
          const config = {
            systemMessage: customSystemMessage,
          };

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            undefined as any,
            config,
          );

          expect(result).toContain(customSystemMessage);
          expect(result).toContain("<agents_memory>");
          expect(result).toContain("No previous agent interactions available.");
        });
      });

      describe("includeAgentsMemory option", () => {
        it("should include agents memory by default in template mode", () => {
          const agentsMemory = "user: Test\nassistant: Response";
          const config = {}; // No explicit includeAgentsMemory setting

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            agentsMemory,
            config,
          );

          expect(result).toContain("<agents_memory>");
          expect(result).toContain(agentsMemory);
        });

        it("should exclude agents memory when includeAgentsMemory is false in template mode", () => {
          const agentsMemory = "user: Test\nassistant: Response";
          const config = {
            includeAgentsMemory: false,
          };

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            agentsMemory,
            config,
          );

          // Should not contain the actual memory section with the provided content
          expect(result).not.toContain(agentsMemory);
          expect(result).toContain("You are a supervisor agent");
          // The actual memory section should not be present (this check is more specific)
          expect(result).not.toMatch(/<agents_memory>\s*user: Test/);
        });

        it("should explicitly include agents memory when includeAgentsMemory is true", () => {
          const agentsMemory = "user: Test\nassistant: Response";
          const config = {
            includeAgentsMemory: true,
          };

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            agentsMemory,
            config,
          );

          expect(result).toContain("<agents_memory>");
          expect(result).toContain(agentsMemory);
        });
      });

      describe("customGuidelines", () => {
        it("should add custom guidelines to default template", () => {
          const customGuidelines = [
            "Always be polite and professional",
            "Respond within 30 seconds",
          ];
          const config = {
            customGuidelines,
          };

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            "",
            config,
          );

          expect(result).toContain("Always be polite and professional");
          expect(result).toContain("Respond within 30 seconds");
          expect(result).toContain("Provide a final answer to the User"); // Default guideline should still be there
        });

        it("should handle empty customGuidelines array", () => {
          const config = {
            customGuidelines: [],
          };

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            "",
            config,
          );

          expect(result).toContain("You are a supervisor agent");
          expect(result).toContain("Provide a final answer to the User"); // Default guidelines should still be there
        });

        it("should combine custom guidelines with default ones", () => {
          const customGuidelines = ["Custom rule 1", "Custom rule 2"];
          const config = {
            customGuidelines,
          };

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            "",
            config,
          );

          // Should contain both default and custom guidelines
          expect(result).toContain("Custom rule 1");
          expect(result).toContain("Custom rule 2");
          expect(result).toContain("Provide a final answer to the User");
          expect(result).toContain("Do not mention the name of any agent");
        });
      });

      describe("combined SupervisorConfig options", () => {
        it("should handle all config options together in template mode", () => {
          const agentsMemory = "user: Hello\nassistant: Hi!";
          const config = {
            includeAgentsMemory: true,
            customGuidelines: ["Be helpful", "Be concise"],
          };

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            agentsMemory,
            config,
          );

          expect(result).toContain("You are a supervisor agent");
          expect(result).toContain("Base instructions");
          expect(result).toContain("<agents_memory>");
          expect(result).toContain(agentsMemory);
          expect(result).toContain("Be helpful");
          expect(result).toContain("Be concise");
        });

        it("should not use customGuidelines when systemMessage is provided", () => {
          const customSystemMessage = "You are a content manager.";
          const config = {
            systemMessage: customSystemMessage,
            customGuidelines: ["This should be ignored"],
          };

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            "",
            config,
          );

          expect(result).toContain(customSystemMessage);
          expect(result).not.toContain("This should be ignored");
          expect(result).not.toContain("You are a supervisor agent");
        });
      });

      describe("edge cases", () => {
        it("should handle empty systemMessage", () => {
          const config = {
            systemMessage: "",
          };

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            "Some memory",
            config,
          );

          expect(result).toContain("<agents_memory>");
          expect(result).toContain("Some memory");
        });

        it("should handle systemMessage with only whitespace", () => {
          const config = {
            systemMessage: "   \n\t   ",
          };

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            "Some memory",
            config,
          );

          expect(result.trim()).not.toBe("");
          expect(result).toContain("<agents_memory>");
        });

        it("should handle null and undefined config values gracefully", () => {
          const config = {
            systemMessage: undefined,
            includeAgentsMemory: undefined,
            customGuidelines: undefined,
          };

          const result = subAgentManager.generateSupervisorSystemMessage(
            "Base instructions",
            "Memory",
            config,
          );

          // Should fall back to default template behavior
          expect(result).toContain("You are a supervisor agent");
          expect(result).toContain("Base instructions");
          expect(result).toContain("<agents_memory>");
        });
      });

      it("should match snapshot with custom systemMessage", () => {
        const config = {
          systemMessage: "You are a friendly content manager named ContentBot.",
          includeAgentsMemory: true,
        };

        const result = subAgentManager.generateSupervisorSystemMessage(
          "Base instructions",
          "user: Hello\nassistant: Hi there!",
          config,
        );

        expect(result).toMatchSnapshot();
      });

      it("should match snapshot with customGuidelines", () => {
        const config = {
          customGuidelines: ["Always be polite", "Respond quickly"],
        };

        const result = subAgentManager.generateSupervisorSystemMessage(
          "Base instructions",
          "user: Test\nassistant: Response",
          config,
        );

        expect(result).toMatchSnapshot();
      });
    });
  });

  describe("handoffTask", () => {
    it("should handoff task to target agent", async () => {
      // Spy on generateText
      const streamTextSpy = vi.spyOn(mockAgent1, "streamText");

      const options: AgentHandoffOptions = {
        task: "Solve this math problem",
        targetAgent: mockAgent1,
        context: { problem: "2+2" },
        sharedContext: [],
      };

      const result = await subAgentManager.handoffTask(options);

      // Verify streamText was called with task message
      expect(streamTextSpy).toHaveBeenCalled();
      const messages = streamTextSpy.mock.calls[0][0] as any[];
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toContain("Solve this math problem");

      // Verify result - should contain text from stream
      expect(result.result).toBe("Hello from Math Agent");
      expect(result.messages.length).toBe(2);
      expect(result.status).toBe("success");
    });

    it("should call onHandoff hook with correct arguments when target agent has hooks", async () => {
      const onHandoffSpy = vi.fn();

      // Create a mock agent with hooks
      const mockAgentWithHooks = new MockAgent("agent3", "Agent with Hooks") as any;
      mockAgentWithHooks.hooks = {
        onHandoff: onHandoffSpy,
      };

      const sourceAgent = new MockAgent("source", "Source Agent") as any;

      const options: AgentHandoffOptions = {
        task: "Test handoff with hooks",
        targetAgent: mockAgentWithHooks,
        sourceAgent: sourceAgent,
        context: { test: "data" },
        sharedContext: [],
      };

      await subAgentManager.handoffTask(options);

      // Verify onHandoff was called with the correct object structure
      expect(onHandoffSpy).toHaveBeenCalledWith({
        agent: mockAgentWithHooks,
        source: sourceAgent,
      });
    });
  });

  describe("handoffToMultiple", () => {
    it("should handoff task to multiple target agents", async () => {
      const handoffTaskSpy = vi.spyOn(subAgentManager, "handoffTask");

      const options = {
        task: "Process this request",
        targetAgents: [mockAgent1, mockAgent2],
        context: { data: "test data" },
      };

      await subAgentManager.handoffToMultiple(options);

      // Verify handoffTask was called for each agent
      expect(handoffTaskSpy).toHaveBeenCalledTimes(2);
      expect(handoffTaskSpy.mock.calls[0][0].targetAgent).toBe(mockAgent1);
      expect(handoffTaskSpy.mock.calls[1][0].targetAgent).toBe(mockAgent2);
    });
  });

  describe("createDelegateTool", () => {
    it("should create a delegate tool with correct configuration", () => {
      const tool = subAgentManager.createDelegateTool(mockDelegateToolOptions);

      expect(tool.name).toBe("delegate_task");
      expect(tool.description).toContain("Delegate a task");

      // Verify parameters
      const params = (tool.parameters as any).shape;
      expect(params.task).toBeDefined();
      expect(params.targetAgents).toBeDefined();
      expect(params.context).toBeDefined();
    });

    it("should throw error when executing with no valid agents", async () => {
      const tool = subAgentManager.createDelegateTool(mockDelegateToolOptions);

      // Attempt to execute with non-existent agents
      await expect(
        tool.execute({
          task: "Test task",
          targetAgents: ["non-existent-agent"],
          context: {},
        }),
      ).resolves.toMatchObject({
        error: "Failed to delegate task: No valid target agents found. Available agents: ",
        status: "error",
      });
    });

    it("should execute and return results when valid agents exist", async () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);

      const handoffToMultipleSpy = vi
        .spyOn(subAgentManager, "handoffToMultiple")
        .mockResolvedValue([
          {
            result: "Result 1",
            conversationId: "conv1",
            messages: [],
            error: undefined,
            status: "success",
          },
          {
            result: "Result 2",
            conversationId: "conv2",
            messages: [],
            error: undefined,
            status: "success",
          },
        ]);

      const tool = subAgentManager.createDelegateTool(mockDelegateToolOptions);

      const result = await tool.execute({
        task: "Test task",
        targetAgents: ["Math Agent", "Writing Agent"],
        context: {},
      });

      expect(handoffToMultipleSpy).toHaveBeenCalled();
      expect(result).toEqual([
        {
          agentName: "Math Agent",
          response: "Result 1",
          conversationId: "conv1",
          error: undefined,
          status: "success",
        },
        {
          agentName: "Writing Agent",
          response: "Result 2",
          conversationId: "conv2",
          error: undefined,
          status: "success",
        },
      ]);
      handoffToMultipleSpy.mockRestore();
    });

    it("should pass supervisor's userContext to sub-agents via parentOperationContext", async () => {
      subAgentManager.addSubAgent(mockAgent1 as any); // Math Agent

      // Spy on mockAgent1.streamText to check the options it receives
      const streamTextSpy = vi.spyOn(mockAgent1, "streamText");

      const supervisorUserContext = new Map<string | symbol, unknown>();
      supervisorUserContext.set("supervisorKey", "supervisorValue");

      // Mock the OperationContext that the delegate_tool would receive from the supervisor agent
      const mockSupervisorOperationContext = {
        operationId: "supervisor-op-id",
        userContext: supervisorUserContext,
        historyEntry: { id: "supervisor-history-id" }, // simplified mock
        eventUpdaters: new Map(),
        isActive: true,
      } as any; // Cast to any to simplify for test, real one is more complex

      // Create the delegate tool, providing the necessary options that would normally come from the Agent class
      const tool = subAgentManager.createDelegateTool({
        sourceAgent: { id: "supervisor-agent-id" } as any, // Simplified mock of sourceAgent
        operationContext: mockSupervisorOperationContext, // Pass the mocked supervisor's OperationContext
        currentHistoryEntryId: "supervisor-history-id",
      });

      await tool.execute({
        task: "Test task for userContext passing",
        targetAgents: ["Math Agent"], // Delegate to mockAgent1
        context: { someTaskContext: "taskSpecificData" },
      });

      // Check if handoffToMultiple was called (it internally calls handoffTask)
      // We are more interested in what streamText of the sub-agent receives
      expect(streamTextSpy).toHaveBeenCalled();

      // Check the options passed to mockAgent1.streamText
      const streamTextCallArgs = streamTextSpy.mock.calls[0];
      // Define types for the arguments received by the spy
      const messagesPassedToSubAgent = streamTextCallArgs[0] as BaseMessage[];
      const optionsPassedToSubAgent = streamTextCallArgs[1] as {
        parentOperationContext?: any;
      };

      // Verify the task message is part of what's passed
      expect(messagesPassedToSubAgent[0].role).toBe("user");
      expect(messagesPassedToSubAgent[0].content).toContain("Test task for userContext passing");

      // Verify the parentOperationContext from the supervisor was passed in the options
      expect(optionsPassedToSubAgent).toBeDefined();
      expect(optionsPassedToSubAgent.parentOperationContext).toBeDefined();
      expect(optionsPassedToSubAgent.parentOperationContext.userContext).toBeDefined();
      expect(optionsPassedToSubAgent.parentOperationContext.userContext).toBeInstanceOf(Map);
      expect(optionsPassedToSubAgent.parentOperationContext.userContext?.get("supervisorKey")).toBe(
        "supervisorValue",
      );
      // It should be the same instance as it's directly passed through options in createDelegateTool to handoffToMultiple
      expect(optionsPassedToSubAgent.parentOperationContext.userContext).toBe(
        supervisorUserContext,
      );

      streamTextSpy.mockRestore();
    });
  });

  describe("getSubAgentDetails", () => {
    it("should return formatted details of all sub-agents", () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);

      const details = subAgentManager.getSubAgentDetails();

      expect(details.length).toBe(2);
      expect(details[0].id).toBe("agent1");
      expect(details[0].name).toBe("Math Agent");
      expect(details[0].status).toBe("idle");
      expect(details[0].model).toBe("mock-model");
    });
  });

  describe("event forwarding", () => {
    it("should forward events during handoffTask", async () => {
      const forwardEventSpy = vi.fn();
      const mockAgent = new MockAgent("test-agent", "Test Agent");

      const options: AgentHandoffOptions = {
        task: "Test task with events",
        targetAgent: mockAgent,
        context: { test: true },
        sharedContext: [],
        forwardEvent: forwardEventSpy,
      };

      await subAgentManager.handoffTask(options);

      // Verify that events were forwarded
      // Mock agent sends: 3x text-delta + 1x tool-call + 1x tool-result (finish events no longer forwarded) = 5 events
      expect(forwardEventSpy).toHaveBeenCalledTimes(5);

      // Verify tool-call event
      expect(forwardEventSpy).toHaveBeenCalledWith({
        type: "tool-call",
        data: {
          toolCallId: "tool-1",
          toolName: "mock_tool",
          args: { input: "test" },
        },
        timestamp: expect.any(String),
        subAgentId: "test-agent",
        subAgentName: "Test Agent",
      });

      // Verify tool-result event
      expect(forwardEventSpy).toHaveBeenCalledWith({
        type: "tool-result",
        data: {
          toolCallId: "tool-1",
          toolName: "mock_tool",
          result: "mock result",
        },
        timestamp: expect.any(String),
        subAgentId: "test-agent",
        subAgentName: "Test Agent",
      });
    });

    it("should forward error events when stream fails", async () => {
      const forwardEventSpy = vi.fn();
      const mockAgent = new MockAgent("error-agent", "Error Agent");

      // Mock streamText to throw an error in the stream
      mockAgent.streamText = vi.fn().mockReturnValue({
        fullStream: (async function* () {
          yield { type: "text-delta", textDelta: "Starting..." };
          yield {
            type: "error",
            error: new Error("Stream processing failed"),
          };
        })(),
      });

      const options: AgentHandoffOptions = {
        task: "Task that will fail",
        targetAgent: mockAgent,
        context: {},
        sharedContext: [],
        forwardEvent: forwardEventSpy,
      };

      await subAgentManager.handoffTask(options);

      // Verify that error event was forwarded
      expect(forwardEventSpy).toHaveBeenCalledWith({
        type: "error",
        data: {
          error: "Stream processing failed",
          code: "STREAM_ERROR",
        },
        timestamp: expect.any(String),
        subAgentId: "error-agent",
        subAgentName: "Error Agent",
      });
    });

    it("should not forward events when forwardEvent is not provided", async () => {
      const mockAgent = new MockAgent("no-forward-agent", "No Forward Agent");

      const options: AgentHandoffOptions = {
        task: "Task without event forwarding",
        targetAgent: mockAgent,
        context: {},
        sharedContext: [],
        // No forwardEvent provided
      };

      // This should not throw an error
      const result = await subAgentManager.handoffTask(options);
      expect(result.status).toBe("success");
    });

    it("should forward events through delegate tool", async () => {
      const forwardEventSpy = vi.fn();
      const mockAgent = new MockAgent("delegate-agent", "Delegate Agent");

      subAgentManager.addSubAgent(mockAgent as any);

      const tool = subAgentManager.createDelegateTool({
        sourceAgent: { id: "supervisor-agent" } as any,
        operationContext: { userContext: new Map(), systemContext: new Map() } as any,
        currentHistoryEntryId: "history-123",
        forwardEvent: forwardEventSpy,
      });

      await tool.execute({
        task: "Test delegation with events",
        targetAgents: ["Delegate Agent"],
        context: { delegated: true },
      });

      // Verify that events were forwarded through the delegate tool
      // Mock agent sends: 3x text-delta + 1x tool-call + 1x tool-result (finish events no longer forwarded) = 5 events
      expect(forwardEventSpy).toHaveBeenCalledTimes(5);

      // Check that events have the correct structure
      const toolCallEvent = forwardEventSpy.mock.calls.find((call) => call[0].type === "tool-call");
      expect(toolCallEvent).toBeDefined();
      if (toolCallEvent) {
        expect(toolCallEvent[0]).toMatchObject({
          type: "tool-call",
          subAgentId: "delegate-agent",
          subAgentName: "Delegate Agent",
          timestamp: expect.any(String),
        });
      }
    });

    it("should handle multiple agents with event forwarding", async () => {
      const forwardEventSpy = vi.fn();
      const mockAgent1 = new MockAgent("multi-agent-1", "Multi Agent 1");
      const mockAgent2 = new MockAgent("multi-agent-2", "Multi Agent 2");

      subAgentManager.addSubAgent(mockAgent1 as any);
      subAgentManager.addSubAgent(mockAgent2 as any);

      const tool = subAgentManager.createDelegateTool({
        sourceAgent: { id: "supervisor-agent" } as any,
        operationContext: { userContext: new Map(), systemContext: new Map() } as any,
        currentHistoryEntryId: "history-456",
        forwardEvent: forwardEventSpy,
      });

      await tool.execute({
        task: "Test multiple agents with events",
        targetAgents: ["Multi Agent 1", "Multi Agent 2"],
        context: { multiple: true },
      });

      // Verify that events from both agents were forwarded
      // Each agent generates 5 events (3x text-delta + tool-call + tool-result, finish events no longer forwarded)
      expect(forwardEventSpy).toHaveBeenCalledTimes(10);

      // Check that events from both agents are present
      const agent1Events = forwardEventSpy.mock.calls.filter(
        (call) => call[0].subAgentId === "multi-agent-1",
      );
      const agent2Events = forwardEventSpy.mock.calls.filter(
        (call) => call[0].subAgentId === "multi-agent-2",
      );

      expect(agent1Events).toHaveLength(5);
      expect(agent2Events).toHaveLength(5);
    });

    it("should include correct timestamp format in forwarded events", async () => {
      const forwardEventSpy = vi.fn();
      const mockAgent = new MockAgent("timestamp-agent", "Timestamp Agent");

      const options: AgentHandoffOptions = {
        task: "Test timestamp format",
        targetAgent: mockAgent,
        context: {},
        sharedContext: [],
        forwardEvent: forwardEventSpy,
      };

      await subAgentManager.handoffTask(options);

      // Verify that all forwarded events have valid ISO timestamp
      forwardEventSpy.mock.calls.forEach((call) => {
        const event = call[0];
        expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(new Date(event.timestamp)).toBeInstanceOf(Date);
      });
    });

    it("should handle event forwarding errors by treating them as regular errors", async () => {
      const failingForwardEvent = vi.fn().mockRejectedValue(new Error("Event forwarding failed"));
      const mockAgent = new MockAgent("failing-forward-agent", "Failing Forward Agent");

      const options: AgentHandoffOptions = {
        task: "Test failing event forward",
        targetAgent: mockAgent,
        context: {},
        sharedContext: [],
        forwardEvent: failingForwardEvent,
      };

      // When event forwarding fails, the whole handoff fails
      const result = await subAgentManager.handoffTask(options);
      expect(result.status).toBe("error");
      expect((result.error as Error).message).toContain("Event forwarding failed");
      expect(failingForwardEvent).toHaveBeenCalled();
    });
  });

  describe("maxSteps propagation in handoff operations", () => {
    let subAgentManager: SubAgentManager;
    let mockAgent1: any;

    beforeEach(() => {
      mockAgent1 = new MockAgent("agent1", "Math Agent");
      subAgentManager = new SubAgentManager("Main Agent");
    });

    it("should pass maxSteps to handoffTask", async () => {
      // Spy on the target agent's streamText to check maxSteps
      const streamTextSpy = vi.spyOn(mockAgent1, "streamText");

      const options: AgentHandoffOptions = {
        task: "Test task with maxSteps",
        targetAgent: mockAgent1 as any,
        context: {},
        sharedContext: [],
        maxSteps: 42, // Should be passed to the target agent
      };

      await subAgentManager.handoffTask(options);

      expect(streamTextSpy).toHaveBeenCalled();
      const callOptions = streamTextSpy.mock.calls[0][1] as any;
      expect(callOptions).toHaveProperty("maxSteps", 42);
    });

    it("should pass maxSteps through createDelegateTool", async () => {
      subAgentManager.addSubAgent(mockAgent1 as any);

      // Spy on handoffToMultiple to verify maxSteps propagation
      const handoffToMultipleSpy = vi.spyOn(subAgentManager, "handoffToMultiple");

      const delegateTool = subAgentManager.createDelegateTool({
        sourceAgent: { id: "source-agent" } as any,
        operationContext: {
          operationId: "test-op",
          userContext: new Map(),
          conversationSteps: [],
          historyEntry: {
            id: "test-history",
            startTime: new Date(),
            input: "test",
            output: "",
            status: "completed" as const,
            steps: [],
            usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
            model: "test",
          },
          isActive: true,
        } as any,
        currentHistoryEntryId: "test-history",
        maxSteps: 100, // Should be passed through to handoffToMultiple
      });

      await delegateTool.execute({
        task: "Delegate task with maxSteps",
        targetAgents: ["Math Agent"],
        context: {},
      });

      expect(handoffToMultipleSpy).toHaveBeenCalled();
      const handoffOptions = handoffToMultipleSpy.mock.calls[0][0] as any;
      expect(handoffOptions).toHaveProperty("maxSteps", 100);
    });

    it("should handle undefined maxSteps in handoffTask", async () => {
      const streamTextSpy = vi.spyOn(mockAgent1, "streamText");

      const options: AgentHandoffOptions = {
        task: "Task without maxSteps",
        targetAgent: mockAgent1 as any,
        context: {},
        sharedContext: [],
        // No maxSteps provided
      };

      await subAgentManager.handoffTask(options);

      expect(streamTextSpy).toHaveBeenCalled();
      const callOptions = streamTextSpy.mock.calls[0][1] as any;
      // maxSteps should be undefined when not provided
      expect(callOptions.maxSteps).toBeUndefined();
    });

    it("should handle zero maxSteps in handoff operations", async () => {
      const streamTextSpy = vi.spyOn(mockAgent1, "streamText");

      const options: AgentHandoffOptions = {
        task: "Task with zero maxSteps",
        targetAgent: mockAgent1 as any,
        context: {},
        sharedContext: [],
        maxSteps: 0, // Zero should be passed through
      };

      await subAgentManager.handoffTask(options);

      expect(streamTextSpy).toHaveBeenCalled();
      const callOptions = streamTextSpy.mock.calls[0][1] as any;
      expect(callOptions).toHaveProperty("maxSteps", 0);
    });

    it("should handle negative maxSteps", async () => {
      const streamTextSpy = vi.spyOn(mockAgent1, "streamText");

      const options: AgentHandoffOptions = {
        task: "Task with negative maxSteps",
        targetAgent: mockAgent1 as any,
        context: {},
        sharedContext: [],
        maxSteps: -10, // Negative value should be passed through
      };

      await subAgentManager.handoffTask(options);

      expect(streamTextSpy).toHaveBeenCalled();
      const callOptions = streamTextSpy.mock.calls[0][1] as any;
      expect(callOptions).toHaveProperty("maxSteps", -10);
    });

    it("should verify maxSteps is passed with complex handoff options", async () => {
      const streamTextSpy = vi.spyOn(mockAgent1, "streamText");

      const options: AgentHandoffOptions = {
        task: "Complex handoff task",
        targetAgent: mockAgent1 as any,
        context: { complexData: "test" },
        sharedContext: [{ role: "user", content: "Previous message" }],
        conversationId: "test-conversation",
        userId: "test-user",
        parentAgentId: "parent-agent",
        parentHistoryEntryId: "parent-history",
        maxSteps: 50,
      };

      await subAgentManager.handoffTask(options);

      expect(streamTextSpy).toHaveBeenCalled();
      const callArgs = streamTextSpy.mock.calls[0];
      const messages = callArgs[0] as any;
      const callOptions = callArgs[1] as any;

      // Verify task message is included (task message comes after sharedContext)
      expect(messages[1].content).toContain("Complex handoff task");

      // Verify all options are passed correctly
      expect(callOptions).toHaveProperty("maxSteps", 50);
      expect(callOptions).toHaveProperty("conversationId", "test-conversation");
      expect(callOptions).toHaveProperty("userId", "test-user");
      expect(callOptions).toHaveProperty("parentAgentId", "parent-agent");
      expect(callOptions).toHaveProperty("parentHistoryEntryId", "parent-history");
    });
  });
});
