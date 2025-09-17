import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { convertJsonSchemaToZod } from "zod-from-json-schema";
import { convertJsonSchemaToZod as convertJsonSchemaToZodV3 } from "zod-from-json-schema-v3";
import { getGlobalLogger } from "../../logger";
import { MCPClient } from "./index";

// Mock the MCP SDK dependencies
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn(),
  getDefaultEnvironment: vi.fn().mockReturnValue({}),
}));

vi.mock("zod-from-json-schema", () => ({
  convertJsonSchemaToZod: vi.fn().mockReturnValue({}),
}));

vi.mock("zod-from-json-schema-v3", () => ({
  convertJsonSchemaToZod: vi.fn().mockReturnValue({}),
}));

// Mock the logger
const mockLoggerInstance = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn(),
};

// Set up child to return itself
mockLoggerInstance.child.mockReturnValue(mockLoggerInstance);

vi.mock("../../logger", () => ({
  getGlobalLogger: vi.fn(() => mockLoggerInstance),
}));

describe("MCPClient", () => {
  // Common test variables
  const mockClientInfo = {
    name: "TestClient",
    version: "1.0.0",
  };

  const mockHttpServerConfig = {
    type: "http" as const,
    url: "https://example.com/mcp",
  };

  const mockStdioServerConfig = {
    type: "stdio" as const,
    command: "mcp-server",
    args: ["--test"],
    cwd: "/tmp",
    env: { TEST: "true" },
  };

  // Mocks for the Client class methods
  const mockConnect = vi.fn();
  const mockClose = vi.fn();
  const mockListTools = vi.fn();
  const mockCallTool = vi.fn();
  const mockRequest = vi.fn();

  // Mock client setup
  let mockClient: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Clear logger mock calls
    mockLoggerInstance.trace.mockClear();
    mockLoggerInstance.debug.mockClear();
    mockLoggerInstance.info.mockClear();
    mockLoggerInstance.warn.mockClear();
    mockLoggerInstance.error.mockClear();
    mockLoggerInstance.fatal.mockClear();
    mockLoggerInstance.child.mockClear();
    mockLoggerInstance.child.mockReturnValue(mockLoggerInstance);

    // Create a mock client
    mockClient = {
      connect: mockConnect,
      close: mockClose,
      listTools: mockListTools,
      callTool: mockCallTool,
      request: mockRequest,
      onclose: null,
    };

    // Setup Client constructor mock
    (Client as any).mockImplementation(() => mockClient);
  });

  describe("Constructor", () => {
    it("should initialize with HTTP server config", () => {
      // The client variable is needed to trigger the constructor, even if not directly used
      // in assertions. We instantiate it to test the constructor's behavior.
      new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
      });

      expect(Client).toHaveBeenCalledWith(mockClientInfo, { capabilities: {} });
      // HTTP type now uses StreamableHTTPClientTransport with fallback
      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        new URL(mockHttpServerConfig.url),
        {
          requestInit: undefined,
        },
      );
    });

    it("should initialize with stdio server config", () => {
      // The client variable is needed to trigger the constructor, even if not directly used
      // in assertions. We instantiate it to test the constructor's behavior.
      new MCPClient({
        clientInfo: mockClientInfo,
        server: mockStdioServerConfig,
      });

      expect(Client).toHaveBeenCalledWith(mockClientInfo, { capabilities: {} });
      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: mockStdioServerConfig.command,
        args: mockStdioServerConfig.args,
        cwd: mockStdioServerConfig.cwd,
        env: expect.any(Object),
      });
    });

    it("should throw an error for unsupported server config", () => {
      expect(() => {
        new MCPClient({
          clientInfo: mockClientInfo,
          server: { type: "unknown" } as any,
        });
      }).toThrow("Unsupported server configuration type: unknown");
    });

    it("should initialize with SSE server config", () => {
      const mockSSEServerConfig = {
        type: "sse" as const,
        url: "https://example.com/mcp",
      };

      new MCPClient({
        clientInfo: mockClientInfo,
        server: mockSSEServerConfig,
      });

      expect(Client).toHaveBeenCalledWith(mockClientInfo, { capabilities: {} });
      expect(SSEClientTransport).toHaveBeenCalledWith(new URL(mockSSEServerConfig.url), {
        requestInit: undefined,
        eventSourceInit: undefined,
      });
    });

    it("should initialize with streamable HTTP server config", () => {
      const mockStreamableHTTPServerConfig = {
        type: "streamable-http" as const,
        url: "https://example.com/mcp",
        sessionId: "test-session",
      };

      new MCPClient({
        clientInfo: mockClientInfo,
        server: mockStreamableHTTPServerConfig,
      });

      expect(Client).toHaveBeenCalledWith(mockClientInfo, { capabilities: {} });
      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        new URL(mockStreamableHTTPServerConfig.url),
        {
          requestInit: undefined,
          sessionId: "test-session",
        },
      );
    });
  });

  describe("connect", () => {
    let client: MCPClient;

    beforeEach(() => {
      client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
      });
    });

    it("should connect to the server", async () => {
      const connectSpy = vi.spyOn(client, "emit");
      await client.connect();

      expect(mockConnect).toHaveBeenCalled();
      expect(connectSpy).toHaveBeenCalledWith("connect");
    });

    it("should not connect if already connected", async () => {
      await client.connect();
      mockConnect.mockClear();
      await client.connect();

      expect(mockConnect).not.toHaveBeenCalled();
    });

    it("should emit error if connection fails for non-http type", async () => {
      // Create client with stdio config to avoid fallback logic
      const stdioClient = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockStdioServerConfig,
      });

      const error = new Error("Connection failed");
      mockConnect.mockRejectedValueOnce(error);
      const errorSpy = vi.spyOn(stdioClient, "emit");

      await expect(stdioClient.connect()).rejects.toThrow("Connection failed");
      expect(errorSpy).toHaveBeenCalledWith("error", error);
    });

    it("should fallback to SSE when streamable HTTP fails for http type", async () => {
      const streamableError = new Error("Streamable HTTP failed");
      mockConnect.mockRejectedValueOnce(streamableError).mockResolvedValueOnce(undefined);

      const connectSpy = vi.spyOn(client, "emit");

      // Reset mocks to check new calls
      (SSEClientTransport as vi.Mock).mockClear();
      (Client as vi.Mock).mockClear();

      await client.connect();

      // Should have created SSE transport on fallback
      expect(SSEClientTransport).toHaveBeenCalledWith(new URL(mockHttpServerConfig.url), {
        requestInit: undefined,
        eventSourceInit: undefined,
      });

      // Should emit connect on successful fallback
      expect(connectSpy).toHaveBeenCalledWith("connect");

      // Check that the logger debug method was called
      expect(mockLoggerInstance.debug).toHaveBeenCalledWith(
        "Streamable HTTP connection failed, attempting SSE fallback",
      );
    });
  });

  describe("disconnect", () => {
    let client: MCPClient;
    let mockClientInstance: any;

    beforeEach(async () => {
      (Client as any).mockImplementation(() => {
        mockClientInstance = mockClient;
        return mockClientInstance;
      });
      client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
      });
      await client.connect();
      // Verify that the constructor set the onclose handler
      expect(mockClientInstance.onclose).toBeInstanceOf(Function);
    });

    it("should disconnect from the server and emit event", async () => {
      const disconnectEmitSpy = vi.spyOn(client, "emit");
      const closePromise = client.disconnect();
      expect(mockClose).toHaveBeenCalledTimes(1);
      if (mockClientInstance.onclose) {
        mockClientInstance.onclose();
      }
      await closePromise;
      expect(disconnectEmitSpy).toHaveBeenCalledWith("disconnect");
    });

    it("should not call close if not connected", async () => {
      const firstDisconnectPromise = client.disconnect();
      if (mockClientInstance.onclose) {
        mockClientInstance.onclose();
      }
      await firstDisconnectPromise;
      mockClose.mockClear();
      await client.disconnect();
      expect(mockClose).not.toHaveBeenCalled();
    });

    it("should emit error if disconnection fails", async () => {
      const error = new Error("Disconnection failed");
      mockClose.mockRejectedValueOnce(error);
      const errorSpy = vi.spyOn(client, "emit");
      await expect(client.disconnect()).rejects.toThrow("Disconnection failed");
      expect(errorSpy).toHaveBeenCalledWith("error", error);
    });
  });

  describe("listTools", () => {
    let client: MCPClient;

    beforeEach(() => {
      client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
      });

      mockListTools.mockResolvedValue({
        tools: [
          {
            name: "tool1",
            description: "Tool 1 description",
            inputSchema: { type: "object" },
          },
          {
            name: "tool2",
            description: "Tool 2 description",
            inputSchema: { type: "object" },
          },
        ],
      });
    });

    it("should list tools from the server", async () => {
      const tools = await client.listTools();

      expect(mockConnect).toHaveBeenCalled();
      expect(mockListTools).toHaveBeenCalled();
      expect(tools).toEqual({
        tool1: {
          name: "tool1",
          description: "Tool 1 description",
          inputSchema: { type: "object" },
        },
        tool2: {
          name: "tool2",
          description: "Tool 2 description",
          inputSchema: { type: "object" },
        },
      });
    });

    it("should handle errors when listing tools", async () => {
      const error = new Error("Failed to list tools");
      mockListTools.mockRejectedValueOnce(error);
      const errorSpy = vi.spyOn(client, "emit");

      await expect(client.listTools()).rejects.toThrow("Failed to list tools");
      expect(errorSpy).toHaveBeenCalledWith("error", error);
    });
  });

  describe("getAgentTools", () => {
    let client: MCPClient;

    beforeEach(() => {
      client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
      });

      mockListTools.mockResolvedValue({
        tools: [
          {
            name: "tool1",
            description: "Tool 1 description",
            inputSchema: { type: "object" },
          },
          {
            name: "tool2",
            description: "Tool 2 description",
            inputSchema: { type: "object" },
          },
        ],
      });
    });

    it("should convert tools to agent tools", async () => {
      const agentTools = await client.getAgentTools();

      expect(mockConnect).toHaveBeenCalled();
      expect(mockListTools).toHaveBeenCalled();
      expect(convertJsonSchemaToZodV3).toHaveBeenCalledTimes(2);

      expect(agentTools).toEqual(
        expect.objectContaining({
          TestClient_tool1: expect.objectContaining({
            name: "TestClient_tool1",
            id: expect.any(String),
            description: "Tool 1 description",
            parameters: expect.any(Object),
            execute: expect.any(Function),
          }),
          TestClient_tool2: expect.objectContaining({
            id: expect.any(String),
            name: "TestClient_tool2",
            description: "Tool 2 description",
            parameters: expect.any(Object),
            execute: expect.any(Function),
          }),
        }),
      );
    });

    it("should handle errors when getting agent tools", async () => {
      const error = new Error("Failed to get agent tools");
      mockListTools.mockRejectedValueOnce(error);
      const errorSpy = vi.spyOn(client, "emit");

      await expect(client.getAgentTools()).rejects.toThrow("Failed to get agent tools");
      expect(errorSpy).toHaveBeenCalledWith("error", error);
    });

    it("should skip a tool if schema conversion fails", async () => {
      (convertJsonSchemaToZodV3 as vi.Mock).mockImplementationOnce(() => {
        throw new Error("Schema conversion failed");
      });

      const agentTools = await client.getAgentTools();

      expect(agentTools).toEqual({
        TestClient_tool2: expect.objectContaining({
          id: expect.any(String),
          name: "TestClient_tool2",
          description: "Tool 2 description",
          parameters: expect.any(Object),
          execute: expect.any(Function),
        }),
      });

      // Check that the logger error method was called
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        "Failed to create executable tool wrapper for 'tool1':",
        expect.objectContaining({
          error: expect.any(Error),
        }),
      );
    });

    it("should create execute functions that call tools", async () => {
      mockCallTool.mockResolvedValue({ content: "result" });

      const agentTools = (await client.getAgentTools()) as Record<string, any>;
      const result = await agentTools.TestClient_tool1.execute({
        param: "value",
      });

      expect(mockCallTool).toHaveBeenCalledWith(
        {
          name: "tool1",
          arguments: { param: "value" },
        },
        expect.any(Object),
        { timeout: expect.any(Number) },
      );
      expect(result).toEqual({ content: "result" });
    });

    it("should handle errors in execute functions", async () => {
      const error = new Error("Tool execution failed");
      mockCallTool.mockRejectedValueOnce(error);

      const agentTools = (await client.getAgentTools()) as Record<string, any>;

      await expect(agentTools.TestClient_tool1.execute({ param: "value" })).rejects.toThrow();

      // Check that the logger error method was called at least once
      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });
  });

  describe("callTool", () => {
    let client: MCPClient;

    beforeEach(() => {
      client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
      });

      mockCallTool.mockResolvedValue("tool-result");
    });

    it("should call a tool on the server", async () => {
      const toolCallEmitSpy = vi.spyOn(client, "emit");

      const result = await client.callTool({
        name: "testTool",
        arguments: { param: "value" },
      });

      expect(mockConnect).toHaveBeenCalled();
      expect(mockCallTool).toHaveBeenCalledWith(
        {
          name: "testTool",
          arguments: { param: "value" },
        },
        expect.any(Object),
        { timeout: expect.any(Number) },
      );
      expect(result).toEqual({ content: "tool-result" });
      expect(toolCallEmitSpy).toHaveBeenCalledWith(
        "toolCall",
        "testTool",
        { param: "value" },
        "tool-result",
      );
    });

    it("should handle errors when calling a tool", async () => {
      const error = new Error("Failed to call tool");
      mockCallTool.mockRejectedValueOnce(error);
      const errorSpy = vi.spyOn(client, "emit");

      await expect(
        client.callTool({
          name: "testTool",
          arguments: { param: "value" },
        }),
      ).rejects.toThrow("Failed to call tool");
      expect(errorSpy).toHaveBeenCalledWith("error", error);
    });
  });

  describe("listResources", () => {
    let client: MCPClient;

    beforeEach(() => {
      client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
      });

      mockRequest.mockResolvedValue({
        resources: [{ id: "resource1" }, { id: "resource2" }, { id: 3 }],
      });
    });

    it("should list resources from the server", async () => {
      const resources = await client.listResources();

      expect(mockConnect).toHaveBeenCalled();
      expect(mockRequest).toHaveBeenCalledWith({ method: "resources/list" }, expect.any(Object));
      expect(resources).toEqual(["resource1", "resource2", "3"]);
    });

    it("should handle errors when listing resources", async () => {
      const error = new Error("Failed to list resources");
      mockRequest.mockRejectedValueOnce(error);
      const errorSpy = vi.spyOn(client, "emit");

      await expect(client.listResources()).rejects.toThrow("Failed to list resources");
      expect(errorSpy).toHaveBeenCalledWith("error", error);
    });
  });

  describe("Event handling", () => {
    let client: MCPClient;

    beforeEach(() => {
      client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
      });
    });

    it("should emit disconnect event when onclose is called", () => {
      const disconnectSpy = vi.spyOn(client, "emit");
      mockClient.onclose();
      expect(disconnectSpy).toHaveBeenCalledWith("disconnect");
    });

    it("should register and trigger event listeners", () => {
      const connectHandler = vi.fn();
      const disconnectHandler = vi.fn();
      const errorHandler = vi.fn();
      const toolCallHandler = vi.fn();

      client.on("connect", connectHandler);
      client.on("disconnect", disconnectHandler);
      client.on("error", errorHandler);
      client.on("toolCall", toolCallHandler);

      client.emit("connect");
      client.emit("disconnect");
      client.emit("error", new Error("Test error"));
      client.emit("toolCall", "testTool", { param: "value" }, "result");

      expect(connectHandler).toHaveBeenCalled();
      expect(disconnectHandler).toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalledWith(new Error("Test error"));
      expect(toolCallHandler).toHaveBeenCalledWith("testTool", { param: "value" }, "result");
    });
  });
});
