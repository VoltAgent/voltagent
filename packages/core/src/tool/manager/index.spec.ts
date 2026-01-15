import { z } from "zod";
import type { ToolExecuteOptions } from "../../agent/providers/base/types";
import {
  type AgentTool,
  type ProviderTool,
  Tool,
  type ToolExecutionResult,
  ToolManager,
  createTool,
} from "../index";
import { createToolkit } from "../toolkit";
import type { Toolkit } from "../toolkit";

describe("ToolManager", () => {
  let toolManager: ToolManager;
  // Create sample tools for testing
  const mockTool1 = createTool({
    name: "tool1",
    description: "Test tool 1",
    parameters: z.object({
      param1: z.string().describe("Parameter 1"),
    }),
    execute: vi.fn().mockResolvedValue("Tool 1 result"),
  });

  const mockTool2 = createTool({
    name: "tool2",
    description: "Test tool 2",
    parameters: z.object({
      param2: z.number().describe("Parameter 2"),
    }),
    execute: vi.fn().mockResolvedValue("Tool 2 result"),
  });

  beforeEach(() => {
    toolManager = new ToolManager();
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with empty tools if none provided", () => {
      const tools = toolManager.getAllBaseTools();
      expect(tools).toEqual([]);
    });

    it("should initialize with provided tools", () => {
      const manager = new ToolManager([mockTool1, mockTool2]);
      const tools = manager.getAllBaseTools();
      expect(tools.length).toBe(2);
      expect(tools[0].name).toBe("tool1");
      expect(tools[1].name).toBe("tool2");
    });
  });

  describe("addStandaloneTool", () => {
    it("should add a tool", () => {
      const result = toolManager.addStandaloneTool(mockTool1);
      expect(result).toBe(true);

      const tools = toolManager.getAllBaseTools();
      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe("tool1");
      expect(tools[0].description).toBe("Test tool 1");
    });

    it("should replace an existing tool with the same name", () => {
      toolManager.addStandaloneTool(mockTool1);

      const updatedTool = createTool({
        name: "tool1",
        description: "Updated test tool 1",
        parameters: z.object({
          newParam: z.string().describe("New parameter"),
        }),
        execute: vi.fn().mockResolvedValue("Updated tool 1 result"),
      });

      const result = toolManager.addStandaloneTool(updatedTool);
      expect(result).toBe(true); // should return true when replacing

      const tools = toolManager.getAllBaseTools();
      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe("tool1");
      expect(tools[0].description).toBe("Updated test tool 1");
    });

    it("should add client-side tool without execute function", () => {
      const clientSideTool = new Tool({
        name: "clientSideTool",
        description: "Client-side tool",
        parameters: z.object({}),
      });

      toolManager.addStandaloneTool(clientSideTool);
      const tools = toolManager.getAllBaseTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe("clientSideTool");
      expect(tools[0].execute).toBeUndefined();
      expect(tools[0].isClientSide()).toBe(true);
    });
  });

  describe("addItems", () => {
    it("should add multiple tools", () => {
      toolManager.addItems([mockTool1, mockTool2]);

      const tools = toolManager.getAllBaseTools();
      expect(tools.length).toBe(2);
      expect(tools[0].name).toBe("tool1");
      expect(tools[1].name).toBe("tool2");
    });
  });

  describe("removeTool", () => {
    it("should remove a tool by name", () => {
      toolManager.addItems([mockTool1, mockTool2]);

      const result = toolManager.removeTool("tool1");
      expect(result).toBe(true);

      const tools = toolManager.getAllBaseTools();
      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe("tool2");
    });

    it("should return false when trying to remove a non-existent tool", () => {
      const result = toolManager.removeTool("nonExistentTool");
      expect(result).toBe(false);
    });
  });

  describe("getToolsForApi", () => {
    it("should return simplified tool information for API", () => {
      toolManager.addItems([mockTool1, mockTool2]);

      const apiTools = toolManager.getToolsForApi();
      expect(apiTools).toEqual([
        { name: "tool1", description: "Test tool 1", parameters: expect.any(Object) },
        { name: "tool2", description: "Test tool 2", parameters: expect.any(Object) },
      ]);
    });
  });

  describe("toolkits", () => {
    it("should add toolkit tools to aggregated lists", () => {
      const toolkit = createToolkit({
        name: "kit-basic",
        description: "Toolkit with tools",
        tools: [
          createTool({
            name: "kit-tool-1",
            description: "Toolkit tool 1",
            parameters: z.object({}),
            execute: vi.fn(),
          }),
          createTool({
            name: "kit-tool-2",
            description: "Toolkit tool 2",
            parameters: z.object({}),
            execute: vi.fn(),
          }),
        ],
      });

      expect(toolManager.addToolkit(toolkit as Toolkit)).toBe(true);
      expect(toolManager.getToolkits()).toHaveLength(1);
      expect(toolManager.getAllBaseTools().map((tool) => tool.name)).toEqual([
        "kit-tool-1",
        "kit-tool-2",
      ]);
      expect(toolManager.getAllToolNames().sort()).toEqual(["kit-tool-1", "kit-tool-2"]);
    });

    it("should replace existing toolkit with same name", () => {
      const initialToolkit = createToolkit({
        name: "shared-kit",
        tools: [
          createTool({
            name: "original-tool",
            description: "Original toolkit tool",
            parameters: z.object({}),
            execute: vi.fn(),
          }),
        ],
      });

      const replacementToolkit = createToolkit({
        name: "shared-kit",
        tools: [
          createTool({
            name: "replacement-tool",
            description: "Replacement toolkit tool",
            parameters: z.object({}),
            execute: vi.fn(),
          }),
        ],
      });

      expect(toolManager.addToolkit(initialToolkit as Toolkit)).toBe(true);
      expect(toolManager.addToolkit(replacementToolkit as Toolkit)).toBe(true);

      const baseToolNames = toolManager.getAllBaseTools().map((tool) => tool.name);
      expect(baseToolNames).toEqual(["replacement-tool"]);
      expect(toolManager.getToolkits()).toHaveLength(1);
    });

    it("should skip toolkit when tools conflict with existing standalone tool", () => {
      const standaloneTool = createTool({
        name: "conflicting-tool",
        description: "Standalone",
        parameters: z.object({}),
        execute: vi.fn(),
      });
      toolManager.addStandaloneTool(standaloneTool);

      const conflictingToolkit = createToolkit({
        name: "conflicting-kit",
        tools: [
          createTool({
            name: "conflicting-tool",
            description: "Toolkit duplicate",
            parameters: z.object({}),
            execute: vi.fn(),
          }),
        ],
      });

      expect(toolManager.addToolkit(conflictingToolkit as Toolkit)).toBe(false);
      expect(toolManager.getToolkits()).toHaveLength(0);
      expect(toolManager.getAllBaseTools().map((tool) => tool.name)).toEqual(["conflicting-tool"]);
    });
  });

  describe("prepareToolsForExecution", () => {
    it("should attach execute wrappers for server-side tools", async () => {
      toolManager.addStandaloneTool(mockTool1);
      const wrappedExecute = vi.fn().mockResolvedValue("wrapped-result");
      const createToolExecuteFunction = vi.fn().mockReturnValue(wrappedExecute);

      const preparedTools = toolManager.prepareToolsForExecution(createToolExecuteFunction);
      const serverToolEntry = preparedTools[mockTool1.name] as {
        description: string;
        inputSchema: unknown;
        execute?: (args: any, options?: ToolExecuteOptions) => ToolExecutionResult<any>;
      };

      expect(createToolExecuteFunction).toHaveBeenCalledTimes(1);
      expect(createToolExecuteFunction).toHaveBeenCalledWith(mockTool1);
      expect(serverToolEntry.description).toBe(mockTool1.description);
      expect(serverToolEntry.inputSchema).toBe(mockTool1.parameters);
      expect(serverToolEntry.execute).toBe(wrappedExecute);

      const args = { payload: "value" };
      const options = { toolCallId: "call-123" } as ToolExecuteOptions;
      await expect(serverToolEntry.execute?.(args, options)).resolves.toBe("wrapped-result");
      expect(wrappedExecute).toHaveBeenCalledWith(args, options);
    });

    it("should skip execute wrapper for client-side tools", () => {
      const clientTool = new Tool({
        name: "client-only-tool",
        description: "Client-side tool without execute handler",
        parameters: z.object({}),
      });
      toolManager.addStandaloneTool(clientTool);
      const createToolExecuteFunction = vi.fn();

      const preparedTools = toolManager.prepareToolsForExecution(createToolExecuteFunction);
      const clientToolEntry = preparedTools[clientTool.name] as {
        description: string;
        inputSchema: unknown;
        execute?: (args: any, options?: ToolExecuteOptions) => ToolExecutionResult<any>;
      };

      expect(createToolExecuteFunction).not.toHaveBeenCalled();
      expect(clientToolEntry.description).toBe(clientTool.description);
      expect(clientToolEntry.inputSchema).toBe(clientTool.parameters);
      expect(clientToolEntry.execute).toBeUndefined();
    });

    it("should include provider-defined tools unchanged", () => {
      toolManager.addStandaloneTool(mockTool1);
      const providerTool = {
        type: "provider",
        name: "provider-tool",
        description: "Provider-defined tool",
      } as ProviderTool;
      toolManager.addStandaloneTool(providerTool);

      const wrappedExecute = vi.fn().mockResolvedValue("wrapped-result");
      const createToolExecuteFunction = vi.fn().mockReturnValue(wrappedExecute);

      const preparedTools = toolManager.prepareToolsForExecution(createToolExecuteFunction);

      expect(createToolExecuteFunction).toHaveBeenCalledTimes(1);
      expect(preparedTools[mockTool1.name]).toMatchObject({
        description: mockTool1.description,
        inputSchema: mockTool1.parameters,
        execute: wrappedExecute,
      });
      expect(preparedTools[providerTool.name]).toBe(providerTool);
    });
  });

  describe("hasToolInAny", () => {
    it("should return true if tool exists", () => {
      toolManager.addStandaloneTool(mockTool1);

      expect(toolManager.hasToolInAny("tool1")).toBe(true);
    });

    it("should return false if tool doesn't exist", () => {
      expect(toolManager.hasToolInAny("nonExistentTool")).toBe(false);
    });
  });
});

// Provider tools tests
describe("provider-defined tools", () => {
  let manager: ToolManager;
  beforeEach(() => {
    manager = new ToolManager();
  });

  const createProviderTool = (name: string): ProviderTool =>
    ({
      type: "provider",
      name,
      description: `Provider tool ${name}`,
    }) as unknown as ProviderTool;

  it("should add a standalone provider tool and expose via getAllProviderTools but not getAllBaseTools", () => {
    const providerTool = createProviderTool("prov1");

    const added = manager.addStandaloneTool(providerTool); // method accepts union
    expect(added).toBe(true);

    // provider tools should not appear in base tools list
    expect(manager.getAllBaseTools().map((t) => t.name)).toEqual([]);

    // but should appear in provider tools list
    const providerTools = manager.getAllProviderTools();
    expect(providerTools).toHaveLength(1);
    expect(providerTools[0].name).toBe("prov1");

    // hasToolInAny should consider provider tools too
    expect(manager.hasToolInAny("prov1")).toBe(true);
  });

  it("should collect provider tools from toolkits", () => {
    const providerTool = createProviderTool("prov-in-kit");

    const kit = createToolkit({
      name: "kit-with-provider",
      description: "A toolkit containing a provider tool",
      tools: [providerTool],
    });

    const addedKit = manager.addToolkit(kit);
    expect(addedKit).toBe(true);

    // getAllProviderTools aggregates both standalone and toolkit tools
    const providerTools = manager.getAllProviderTools();
    expect(providerTools.map((t) => (t as ProviderTool).name)).toEqual(["prov-in-kit"]);

    // provider tools from toolkit should still be excluded from getAllBaseTools
    expect(manager.getAllBaseTools()).toHaveLength(0);
  });

  it("should prevent adding a toolkit when a provider tool name conflicts with existing standalone provider tool", () => {
    const providerTool = createProviderTool("dup-prov");
    expect(manager.addStandaloneTool(providerTool as unknown as AgentTool)).toBe(true);

    const kitWithConflict = createToolkit({
      name: "conflicting-kit",
      tools: [createProviderTool("dup-prov") as unknown as AgentTool],
    });

    // addToolkit should refuse due to name conflict
    expect(manager.addToolkit(kitWithConflict)).toBe(false);

    // Provider tools list should still contain only the standalone one
    expect(manager.getAllProviderTools().map((t) => (t as ProviderTool).name)).toEqual([
      "dup-prov",
    ]);
  });

  it("should remove standalone provider tool via removeTool", () => {
    const providerTool = createProviderTool("to-remove");
    manager.addStandaloneTool(providerTool as unknown as AgentTool);

    expect(manager.hasToolInAny("to-remove")).toBe(true);
    expect(manager.getAllProviderTools()).toHaveLength(1);

    // remove it
    expect(manager.removeTool("to-remove")).toBe(true);
    expect(manager.hasToolInAny("to-remove")).toBe(false);
    expect(manager.getAllProviderTools()).toHaveLength(0);
  });
});
