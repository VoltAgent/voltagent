import { z } from "zod";
import { type AgentTool, type ProviderTool, Tool, ToolManager, createTool } from "../index";
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
      const tools = toolManager.getTools();
      expect(tools).toEqual([]);
    });

    it("should initialize with provided tools", () => {
      const manager = new ToolManager([mockTool1, mockTool2]);
      const tools = manager.getTools();
      expect(tools.length).toBe(2);
      expect(tools[0].name).toBe("tool1");
      expect(tools[1].name).toBe("tool2");
    });
  });

  describe("addTool", () => {
    it("should add a tool", () => {
      const result = toolManager.addTool(mockTool1);
      expect(result).toBe(true);

      const tools = toolManager.getTools();
      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe("tool1");
      expect(tools[0].description).toBe("Test tool 1");
    });

    it("should replace an existing tool with the same name", () => {
      toolManager.addTool(mockTool1);

      const updatedTool = createTool({
        name: "tool1",
        description: "Updated test tool 1",
        parameters: z.object({
          newParam: z.string().describe("New parameter"),
        }),
        execute: vi.fn().mockResolvedValue("Updated tool 1 result"),
      });

      const result = toolManager.addTool(updatedTool);
      expect(result).toBe(true); // should return true when replacing

      const tools = toolManager.getTools();
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

      toolManager.addTool(clientSideTool);
      const tools = toolManager.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe("clientSideTool");
      expect(tools[0].execute).toBeUndefined();
      expect(tools[0].isClientSide()).toBe(true);
    });
  });

  describe("addItems", () => {
    it("should add multiple tools", () => {
      toolManager.addItems([mockTool1, mockTool2]);

      const tools = toolManager.getTools();
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

      const tools = toolManager.getTools();
      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe("tool2");
    });

    it("should return false when trying to remove a non-existent tool", () => {
      const result = toolManager.removeTool("nonExistentTool");
      expect(result).toBe(false);
    });
  });

  describe("combineStaticAndRuntimeBaseTools", () => {
    it("should return a copy of all tools", () => {
      toolManager.addItems([mockTool1, mockTool2]);

      const preparedTools = toolManager.combineStaticAndRuntimeBaseTools();
      expect(preparedTools.length).toBe(2);
      expect(preparedTools[0].name).toBe("tool1");
      expect(preparedTools[1].name).toBe("tool2");

      // Should be a copy, not the same reference
      expect(preparedTools).not.toBe(toolManager.getTools());
    });

    it("should include dynamic tools when provided", () => {
      toolManager.addTool(mockTool1);

      const dynamicTools = [mockTool2];

      const preparedTools = toolManager.combineStaticAndRuntimeBaseTools(dynamicTools);
      expect(preparedTools.length).toBe(2);
      expect(preparedTools[0].name).toBe("tool1");
      expect(preparedTools[1].name).toBe("tool2");
    });

    it("should handle dynamic toolkits", () => {
      toolManager.addTool(mockTool1);

      // Create a toolkit with mockTool2
      const testToolkit: Toolkit = createToolkit({
        name: "test-toolkit",
        description: "Test toolkit",
        tools: [mockTool2],
      });

      const preparedTools = toolManager.combineStaticAndRuntimeBaseTools([testToolkit]);
      expect(preparedTools.length).toBe(2); // mockTool1 + mockTool2 from toolkit
      expect(preparedTools[0].name).toBe("tool1");
      expect(preparedTools[1].name).toBe("tool2");
    });

    it("should handle mixed dynamic tools and toolkits", () => {
      // Create a third tool
      const mockTool3 = createTool({
        name: "tool3",
        description: "Test tool 3",
        parameters: z.object({
          param3: z.boolean(),
        }),
        execute: vi.fn().mockResolvedValue("Tool 3 result"),
      });

      // Create a toolkit
      const testToolkit: Toolkit = createToolkit({
        name: "test-toolkit",
        description: "Test toolkit",
        tools: [mockTool2],
      });

      const preparedTools = toolManager.combineStaticAndRuntimeBaseTools([
        mockTool1,
        testToolkit,
        mockTool3,
      ]);
      expect(preparedTools.length).toBe(3); // mockTool1 + mockTool2 from toolkit + mockTool3
      expect(preparedTools.map((t) => t.name).sort()).toEqual(["tool1", "tool2", "tool3"]);
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

  describe("hasTool", () => {
    it("should return true if tool exists", () => {
      toolManager.addTool(mockTool1);

      expect(toolManager.hasTool("tool1")).toBe(true);
    });

    it("should return false if tool doesn't exist", () => {
      expect(toolManager.hasTool("nonExistentTool")).toBe(false);
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
      type: "provider-defined",
      name,
      description: `Provider tool ${name}`,
    }) as unknown as ProviderTool;

  it("should add a standalone provider tool and expose via getProviderTools but not getTools", () => {
    const providerTool = createProviderTool("prov1");

    const added = manager.addTool(providerTool); // method accepts union
    expect(added).toBe(true);

    // provider tools should not appear in base tools list
    expect(manager.getTools().map((t) => t.name)).toEqual([]);

    // but should appear in provider tools list
    const providerTools = manager.getProviderTools();
    expect(providerTools).toHaveLength(1);
    expect(providerTools[0].name).toBe("prov1");

    // hasTool should consider provider tools too
    expect(manager.hasTool("prov1")).toBe(true);
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

    // getProviderTools aggregates both standalone and toolkit tools
    const providerTools = manager.getProviderTools();
    expect(providerTools.map((t) => (t as ProviderTool).name)).toEqual(["prov-in-kit"]);

    // provider tools from toolkit should still be excluded from getTools
    expect(manager.getTools()).toHaveLength(0);
  });

  it("should prevent adding a toolkit when a provider tool name conflicts with existing standalone provider tool", () => {
    const providerTool = createProviderTool("dup-prov");
    expect(manager.addTool(providerTool as unknown as AgentTool)).toBe(true);

    const kitWithConflict = createToolkit({
      name: "conflicting-kit",
      tools: [createProviderTool("dup-prov") as unknown as AgentTool],
    });

    // addToolkit should refuse due to name conflict
    expect(manager.addToolkit(kitWithConflict)).toBe(false);

    // Provider tools list should still contain only the standalone one
    expect(manager.getProviderTools().map((t) => (t as ProviderTool).name)).toEqual(["dup-prov"]);
  });

  it("should remove standalone provider tool via removeTool", () => {
    const providerTool = createProviderTool("to-remove");
    manager.addTool(providerTool as unknown as AgentTool);

    expect(manager.hasTool("to-remove")).toBe(true);
    expect(manager.getProviderTools()).toHaveLength(1);

    // remove it
    expect(manager.removeTool("to-remove")).toBe(true);
    expect(manager.hasTool("to-remove")).toBe(false);
    expect(manager.getProviderTools()).toHaveLength(0);
  });
});
