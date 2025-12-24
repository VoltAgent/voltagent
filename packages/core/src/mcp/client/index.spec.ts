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
  const mockSetRequestHandler = vi.fn();

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

    // Create a mock client with setRequestHandler for elicitation support
    mockClient = {
      connect: mockConnect,
      close: mockClose,
      listTools: mockListTools,
      callTool: mockCallTool,
      request: mockRequest,
      setRequestHandler: mockSetRequestHandler,
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

      // Always includes elicitation capability
      expect(Client).toHaveBeenCalledWith(mockClientInfo, {
        capabilities: { elicitation: {} },
      });
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

      // Always includes elicitation capability
      expect(Client).toHaveBeenCalledWith(mockClientInfo, {
        capabilities: { elicitation: {} },
      });
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

      // Always includes elicitation capability
      expect(Client).toHaveBeenCalledWith(mockClientInfo, {
        capabilities: { elicitation: {} },
      });
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

      // Always includes elicitation capability
      expect(Client).toHaveBeenCalledWith(mockClientInfo, {
        capabilities: { elicitation: {} },
      });
      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        new URL(mockStreamableHTTPServerConfig.url),
        {
          requestInit: undefined,
          sessionId: "test-session",
        },
      );
    });

    it("should initialize with elicitation handler from config", () => {
      const mockElicitationHandler = vi.fn();

      const client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
        elicitation: {
          onRequest: mockElicitationHandler,
        },
      });

      // Should include elicitation in capabilities
      expect(Client).toHaveBeenCalledWith(mockClientInfo, {
        capabilities: { elicitation: {} },
      });

      // Should register the elicitation handler
      expect(mockSetRequestHandler).toHaveBeenCalled();

      // Should have handler set via bridge
      expect(client.elicitation.hasHandler).toBe(true);
    });

    it("should always enable elicitation capability even without handler", () => {
      const client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
      });

      // Always includes elicitation capability
      expect(Client).toHaveBeenCalledWith(mockClientInfo, {
        capabilities: { elicitation: {} },
      });

      // Handler not set initially
      expect(client.elicitation.hasHandler).toBe(false);
    });

    it("should expose elicitation bridge for dynamic handler management", () => {
      const client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
      });

      // elicitation property should be accessible
      expect(client.elicitation).toBeDefined();
      expect(typeof client.elicitation.setHandler).toBe("function");
      expect(typeof client.elicitation.once).toBe("function");
      expect(typeof client.elicitation.removeHandler).toBe("function");
      expect(typeof client.elicitation.hasHandler).toBe("boolean");
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

  describe("Elicitation", () => {
    let capturedRequestHandler: ((request: any) => Promise<any>) | undefined;

    beforeEach(() => {
      // Capture the request handler when setRequestHandler is called
      mockSetRequestHandler.mockImplementation((_schema, handler) => {
        capturedRequestHandler = handler;
      });
    });

    it("should call elicitation handler when server requests input", async () => {
      const mockElicitationHandler = vi.fn().mockResolvedValue({
        action: "accept",
        content: { confirmed: true },
      });

      new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
        elicitation: {
          onRequest: mockElicitationHandler,
        },
      });

      // Simulate server sending elicitation request
      const mockRequest = {
        params: {
          message: "Please confirm deletion",
          requestedSchema: {
            type: "object",
            properties: { confirmed: { type: "boolean" } },
          },
        },
      };

      // Call the captured handler
      expect(capturedRequestHandler).toBeDefined();
      const result = await capturedRequestHandler?.(mockRequest);

      expect(mockElicitationHandler).toHaveBeenCalledWith(mockRequest.params);
      expect(result).toEqual({
        action: "accept",
        content: { confirmed: true },
      });
    });

    it("should use per-call elicitation handler from tool execution options", async () => {
      mockListTools.mockResolvedValue({
        tools: [
          {
            name: "tool1",
            description: "Tool 1 description",
            inputSchema: { type: "object" },
          },
        ],
      });

      const client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
      });

      let resolveCallTool: ((value: any) => void) | undefined;
      const callToolPromise = new Promise((resolve) => {
        resolveCallTool = resolve;
      });
      mockCallTool.mockImplementation(() => callToolPromise);

      const agentTools = (await client.getAgentTools()) as Record<string, any>;
      const mockElicitationHandler = vi.fn().mockResolvedValue({
        action: "accept",
        content: { confirmed: true },
      });

      const executePromise = agentTools.TestClient_tool1.execute(
        { param: "value" },
        { elicitation: mockElicitationHandler },
      );

      expect(client.elicitation.hasHandler).toBe(true);

      const mockRequest = {
        params: {
          message: "Confirm delete",
          requestedSchema: {
            type: "object",
            properties: { confirmed: { type: "boolean" } },
          },
        },
      };

      expect(capturedRequestHandler).toBeDefined();
      const elicitationResult = await capturedRequestHandler?.(mockRequest);

      expect(mockElicitationHandler).toHaveBeenCalledWith(mockRequest.params);
      expect(elicitationResult).toEqual({
        action: "accept",
        content: { confirmed: true },
      });

      resolveCallTool?.({ content: "ok" });
      await executePromise;

      expect(client.elicitation.hasHandler).toBe(false);
    });

    it("should return cancel action when elicitation handler throws error", async () => {
      const mockElicitationHandler = vi.fn().mockRejectedValue(new Error("Handler failed"));

      new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
        elicitation: {
          onRequest: mockElicitationHandler,
        },
      });

      const mockRequest = {
        params: {
          message: "Please confirm",
        },
      };

      expect(capturedRequestHandler).toBeDefined();
      const result = await capturedRequestHandler?.(mockRequest);

      expect(result).toEqual({
        action: "cancel",
        content: undefined,
      });

      // Should log the error
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        "Error processing user input request",
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });

    it("should return cancel action when no handler is set", async () => {
      new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
        // No elicitation handler provided
      });

      const mockRequest = {
        params: {
          message: "Please confirm",
        },
      };

      expect(capturedRequestHandler).toBeDefined();
      const result = await capturedRequestHandler?.(mockRequest);

      expect(result).toEqual({
        action: "cancel",
        content: undefined,
      });

      // Should log warning about missing handler
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        "No user input handler registered, cancelling request",
      );
    });

    it("should re-register elicitation handler after SSE fallback", async () => {
      const mockElicitationHandler = vi.fn();

      const client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
        elicitation: {
          onRequest: mockElicitationHandler,
        },
      });

      // Initial registration
      expect(mockSetRequestHandler).toHaveBeenCalledTimes(1);

      // Simulate streamable HTTP failure and SSE fallback
      const streamableError = new Error("Streamable HTTP failed");
      mockConnect.mockRejectedValueOnce(streamableError).mockResolvedValueOnce(undefined);

      // Reset to track new registrations
      mockSetRequestHandler.mockClear();

      await client.connect();

      // Should have re-registered after fallback
      expect(mockSetRequestHandler).toHaveBeenCalledTimes(1);
    });

    it("should allow setting handler dynamically via setHandler", async () => {
      const client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
      });

      expect(client.elicitation.hasHandler).toBe(false);

      const dynamicHandler = vi.fn().mockResolvedValue({
        action: "accept",
        content: { data: "test" },
      });

      client.elicitation.setHandler(dynamicHandler);

      expect(client.elicitation.hasHandler).toBe(true);
    });

    it("should support one-time handler via once method", async () => {
      const client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
      });

      const oneTimeHandler = vi.fn().mockResolvedValue({
        action: "accept",
        content: { once: true },
      });

      client.elicitation.once(oneTimeHandler);
      expect(client.elicitation.hasHandler).toBe(true);

      // First call should work
      const mockRequest = { params: { message: "Test" } };
      const result = await capturedRequestHandler?.(mockRequest);

      expect(oneTimeHandler).toHaveBeenCalledWith(mockRequest.params);
      expect(result).toEqual({ action: "accept", content: { once: true } });

      // Handler should be removed after first call
      expect(client.elicitation.hasHandler).toBe(false);
    });

    it("should allow removing handler via removeHandler", () => {
      const client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
        elicitation: {
          onRequest: vi.fn(),
        },
      });

      expect(client.elicitation.hasHandler).toBe(true);

      client.elicitation.removeHandler();

      expect(client.elicitation.hasHandler).toBe(false);
    });

    it("should support method chaining on elicitation bridge", () => {
      const client = new MCPClient({
        clientInfo: mockClientInfo,
        server: mockHttpServerConfig,
      });

      const handler = vi.fn();

      // All methods should return 'this' for chaining
      const result = client.elicitation.setHandler(handler).removeHandler().setHandler(handler);

      expect(result).toBe(client.elicitation);
    });
  });
});
