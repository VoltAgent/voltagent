import { randomUUID } from "node:crypto";
import type * as http from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { StreamableHTTPServerTransportOptions } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  CallToolResult,
  ElicitRequest,
  ElicitResult,
  GetPromptRequest,
  GetPromptResult,
  Tool as MCPToolDefinition,
  Prompt,
  Resource,
  ResourceContents,
  ResourceTemplate,
  ServerCapabilities,
} from "@modelcontextprotocol/sdk/types.js";
import {
  CallToolRequestSchema,
  ElicitRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  SetLevelRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  isInitializeRequest,
} from "@modelcontextprotocol/sdk/types.js";
import type { Agent, RegisteredWorkflow, Tool, Workflow } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";

import { AgentAdapter } from "./adapters/agent";
import { ToolAdapter } from "./adapters/tool";
import { WorkflowAdapter } from "./adapters/workflow";
import { PromptBridge } from "./capabilities/prompts";
import { ResourceBridge } from "./capabilities/resources";
import type { FilterContext, WorkflowSummary } from "./filters";
import { passthroughFilter } from "./filters";
import type {
  TransportController,
  TransportRegistry,
  TransportStartOptions,
} from "./transports/registry";
import { transportRegistry as defaultTransportRegistry } from "./transports/registry";
import type {
  CapabilityRecord,
  MCPAgentMetadata,
  MCPElicitationAdapter,
  MCPListedTool,
  MCPLoggingAdapter,
  MCPPromptsAdapter,
  MCPResourcesAdapter,
  MCPServerCapabilitiesConfig,
  MCPServerConfig,
  MCPServerDeps,
  MCPServerMetadata,
  MCPServerPackageInfo,
  MCPServerRemoteInfo,
  MCPServerSSERequestOptions,
  MCPStreamableHTTPRequestOptions,
  MCPToolMetadata,
  MCPToolOrigin,
  MCPWorkflowConfigEntry,
  ProtocolConfig,
  ProtocolRecord,
} from "./types";
import "./transports";
import { ExternalSseTransport, type SseBridge } from "./transports/external-sse";

interface RegisteredToolEntry {
  name: string;
  definition: MCPToolDefinition;
  origin: MCPToolOrigin;
  execute: (
    args: unknown,
    requestElicitation?: (request: ElicitRequest["params"]) => Promise<ElicitResult>,
  ) => Promise<CallToolResult>;
}

type TransportName = keyof ProtocolConfig;

type SseTransportLike = ExternalSseTransport | SSEServerTransport;

interface SseSessionEntry {
  transport: SseTransportLike;
  server: Server;
  closing: boolean;
  isExternal: boolean;
}

export class MCPServer {
  private deps?: MCPServerDeps;
  private readonly mcpServer: Server;
  private readonly transportRegistry: TransportRegistry;
  private readonly transportControllers = new Map<string, TransportController>();
  private readonly connectedTransports = new Map<string, Transport>();
  private readonly httpTransports = new Map<string, StreamableHTTPServerTransport>();
  private readonly httpServerInstances = new Map<string, Server>();
  private readonly sseSessions = new Map<string, SseSessionEntry>();
  private readonly serverId: string;
  private readonly metadata: MCPServerMetadata;
  private capabilityConfig: MCPServerCapabilitiesConfig;
  private readonly promptBridge: PromptBridge;
  private readonly resourceBridge: ResourceBridge;
  private readonly configuredAgents: Agent[];
  private readonly configuredAgentMetadata: MCPAgentMetadata[];
  private readonly configuredWorkflows: RegisteredWorkflow[];
  private readonly configuredWorkflowSummaries: WorkflowSummary[];
  private readonly configuredWorkflowMap: Map<string, RegisteredWorkflow>;
  private readonly configuredTools: Tool[];
  private readonly configuredToolMetadata: MCPToolMetadata[];
  private readonly serversWithCapabilities = new WeakSet<Server>();
  private readonly releaseDate?: string;
  private readonly packagesInfo?: MCPServerPackageInfo[];
  private readonly remotesInfo?: MCPServerRemoteInfo[];
  private readonly elicitationHandlers = new WeakMap<
    Server,
    (request: ElicitRequest["params"]) => Promise<ElicitResult>
  >();
  private loggingAdapter?: MCPLoggingAdapter;
  private promptsAdapter?: MCPPromptsAdapter;
  private resourcesAdapter?: MCPResourcesAdapter;
  private elicitationAdapter?: MCPElicitationAdapter;

  constructor(
    private readonly config: MCPServerConfig,
    transportRegistry: TransportRegistry = defaultTransportRegistry,
  ) {
    this.mcpServer = new Server({
      name: config.name,
      version: config.version,
      description: config.description,
    });
    this.transportRegistry = transportRegistry;
    this.capabilityConfig = {
      logging: config.capabilities?.logging ?? false,
      prompts: config.capabilities?.prompts ?? Boolean(config.adapters?.prompts),
      resources: config.capabilities?.resources ?? Boolean(config.adapters?.resources),
      elicitation: config.capabilities?.elicitation ?? false,
    };
    this.promptBridge = new PromptBridge();
    this.resourceBridge = new ResourceBridge();
    this.configuredAgents = this.normalizeConfiguredAgents(config.agents ?? {});
    this.configuredAgentMetadata = this.configuredAgents.map((agent) =>
      this.toAgentMetadata(agent),
    );
    this.configuredWorkflows = this.normalizeConfiguredWorkflows(config.workflows ?? {});
    this.configuredWorkflowSummaries = this.configuredWorkflows.map((entry) =>
      this.toWorkflowSummary(entry),
    );
    this.configuredWorkflowMap = new Map();
    for (const entry of this.configuredWorkflows) {
      const id = entry.workflow.id;
      if (id && !this.configuredWorkflowMap.has(id)) {
        this.configuredWorkflowMap.set(id, entry);
      }
    }
    this.configuredTools = this.normalizeConfiguredTools(config.tools ?? {});
    this.configuredToolMetadata = this.configuredTools.map((tool) => this.toToolMetadata(tool));
    this.releaseDate = config.releaseDate;
    this.packagesInfo = config.packages ? [...config.packages] : undefined;
    this.remotesInfo = config.remotes ? [...config.remotes] : undefined;

    this.serverId = this.normalizeIdentifier(config.id ?? config.name);
    const protocolsConfig: ProtocolConfig = {
      stdio: config.protocols?.stdio ?? true,
      http: config.protocols?.http ?? true,
      sse: config.protocols?.sse ?? true,
    };

    const metadataProtocols = {
      ...protocolsConfig,
    } as ProtocolRecord;

    const metadataCapabilities = {
      ...this.capabilityConfig,
    } as CapabilityRecord;

    this.metadata = {
      id: this.serverId,
      name: config.name,
      version: config.version,
      description: config.description,
      protocols: metadataProtocols,
      capabilities: metadataCapabilities,
      agents: this.configuredAgentMetadata.length ? [...this.configuredAgentMetadata] : undefined,
      workflows: this.configuredWorkflowSummaries.length
        ? [...this.configuredWorkflowSummaries]
        : undefined,
      tools: this.configuredToolMetadata.length ? [...this.configuredToolMetadata] : undefined,
      releaseDate: this.releaseDate,
      packages: this.packagesInfo ? [...this.packagesInfo] : undefined,
      remotes: this.remotesInfo ? [...this.remotesInfo] : undefined,
    };
  }

  initialize(deps: MCPServerDeps): void {
    this.deps = deps;

    const configAdapters = this.config.adapters ?? {};
    this.loggingAdapter = configAdapters.logging ?? deps.logging;
    this.promptsAdapter = configAdapters.prompts ?? deps.prompts;
    this.resourcesAdapter = configAdapters.resources ?? deps.resources;
    this.elicitationAdapter = configAdapters.elicitation ?? deps.elicitation;

    this.promptBridge.attach({
      adapter: this.promptsAdapter,
      server: this.mcpServer,
    });

    this.resourceBridge.attach({
      adapter: this.resourcesAdapter,
      server: this.mcpServer,
    });

    if (this.loggingAdapter?.setLevel && this.capabilityConfig.logging !== false) {
      this.capabilityConfig.logging = true;
    }

    if (this.promptBridge.enabled && this.capabilityConfig.prompts !== false) {
      this.capabilityConfig.prompts = true;
    }

    if (this.resourceBridge.enabled && this.capabilityConfig.resources !== false) {
      this.capabilityConfig.resources = true;
    }

    if (this.elicitationAdapter?.sendRequest && this.capabilityConfig.elicitation !== false) {
      this.capabilityConfig.elicitation = true;
    }

    if (this.capabilityConfig.elicitation) {
      this.elicitationHandlers.set(this.mcpServer, this.buildElicitationHandler(this.mcpServer));
    }

    this.metadata.capabilities = {
      ...this.capabilityConfig,
    } as CapabilityRecord;
    this.metadata.agents = this.configuredAgentMetadata.length
      ? [...this.configuredAgentMetadata]
      : undefined;
    this.metadata.workflows = this.configuredWorkflowSummaries.length
      ? [...this.configuredWorkflowSummaries]
      : undefined;
    this.metadata.tools = this.configuredToolMetadata.length
      ? [...this.configuredToolMetadata]
      : undefined;
  }

  hasProtocol(name: keyof ProtocolConfig = "stdio"): boolean {
    if (this.config.protocols && name in this.config.protocols) {
      return Boolean(this.config.protocols[name]);
    }
    return true;
  }

  listTools(contextOverrides: Partial<Omit<FilterContext, "transport">> = {}): MCPListedTool[] {
    const context = this.createFilterContext("http", contextOverrides);
    const registry = this.buildToolRegistry(context);
    const entries = Array.from(registry.values());

    return entries.map((entry) => ({
      name: entry.name,
      type: entry.origin,
      definition: entry.definition,
    }));
  }

  async executeTool(
    name: string,
    args: unknown,
    contextOverrides: Partial<Omit<FilterContext, "transport">> = {},
  ): Promise<CallToolResult> {
    const context = this.createFilterContext("http", contextOverrides);
    const registry = this.buildToolRegistry(context);
    const entry = registry.get(name);

    if (!entry) {
      throw new Error(`Unknown tool '${name}' for MCP server '${this.serverId}'`);
    }

    return entry.execute(args ?? {});
  }

  async enableStdio(
    contextOverrides: Partial<Omit<FilterContext, "transport">> = {},
  ): Promise<void> {
    await this.startTransport("stdio", { contextOverrides });
  }

  async close(): Promise<void> {
    await this.stopAllTransports();

    for (const transport of this.httpTransports.values()) {
      await transport.close().catch(() => {});
    }
    this.httpTransports.clear();

    for (const server of this.httpServerInstances.values()) {
      await server.close?.().catch(() => {});
    }
    this.httpServerInstances.clear();

    for (const sessionId of Array.from(this.sseSessions.keys())) {
      await this.cleanupSseSession(sessionId).catch(() => {});
    }

    await this.mcpServer.close();
  }

  protected getToolFilter() {
    return this.config.filterTools ?? passthroughFilter();
  }

  protected getAgentFilter() {
    return this.config.filterAgents ?? passthroughFilter();
  }

  protected getWorkflowFilter() {
    return this.config.filterWorkflows ?? passthroughFilter();
  }

  public async startTransport(name: TransportName, options?: TransportStartOptions): Promise<void> {
    let controller = this.transportControllers.get(name);
    if (!controller) {
      if (!this.transportRegistry.has(name)) {
        throw new Error(`Transport '${name}' is not registered`);
      }
      controller = this.transportRegistry.create(name, this);
      this.transportControllers.set(name, controller);
    }

    if (!controller.isRunning()) {
      await controller.start(options);
    }
  }

  public async startConfiguredTransports(options?: TransportStartOptions): Promise<void> {
    const protocols = {
      stdio: this.config.protocols?.stdio ?? true,
      sse: this.config.protocols?.sse ?? true,
      http: this.config.protocols?.http ?? true,
    };

    const tasks: Array<Promise<void>> = [];

    if (protocols.stdio && this.transportRegistry.has("stdio")) {
      tasks.push(this.startTransport("stdio", options));
    }

    if (protocols.sse && this.transportRegistry.has("sse")) {
      tasks.push(this.startTransport("sse", options));
    }

    if (protocols.http && this.transportRegistry.has("http")) {
      tasks.push(this.startTransport("http", options));
    }

    await Promise.all(tasks);
  }

  public async stopTransport(name: TransportName): Promise<void> {
    const controller = this.transportControllers.get(name);
    if (controller) {
      await controller.stop().catch(() => {});
      this.transportControllers.delete(name);
    }

    if (this.connectedTransports.has(name)) {
      await this.detachTransport(name).catch(() => {});
    }
  }

  private async stopAllTransports(): Promise<void> {
    const names = Array.from(this.transportControllers.keys()) as TransportName[];
    await Promise.all(names.map((name) => this.stopTransport(name)));

    const remaining = Array.from(this.connectedTransports.keys());
    await Promise.all(remaining.map((name) => this.detachTransport(name).catch(() => {})));
  }

  public async startStdioTransport(
    contextOverrides: Partial<Omit<FilterContext, "transport">> = {},
  ): Promise<StdioServerTransport> {
    const context = this.createFilterContext("stdio", contextOverrides);
    if (!this.hasProtocol("stdio")) {
      throw new Error("Stdio transport is not enabled in the configuration");
    }

    const transport = new StdioServerTransport();
    await this.connectTransport("stdio", context, transport);
    return transport;
  }

  public async handleStreamableHttpRequest(
    options: MCPStreamableHTTPRequestOptions,
  ): Promise<void> {
    const { url, httpPath, req, res, transportOptions, contextOverrides } = options;

    if (url.pathname !== httpPath) {
      this.writeJsonResponse(res, 404, { error: "Unknown MCP HTTP route" });
      return;
    }

    try {
      const sessionId = this.extractSessionId(url, req);

      if (sessionId && this.httpTransports.has(sessionId)) {
        const transport = this.httpTransports.get(sessionId);
        const body = req.method === "POST" ? await this.parseJsonBody(req) : undefined;
        await transport?.handleRequest(req, res, body);
        return;
      }

      if (sessionId && !this.httpTransports.has(sessionId)) {
        this.writeJsonResponse(res, 404, { error: `No active MCP session for id '${sessionId}'` });
        return;
      }

      if (req.method !== "POST") {
        this.writeJsonResponse(res, 400, {
          error: "Streamable HTTP initialization must use POST",
        });
        return;
      }

      const body = await this.parseJsonBody(req);

      if (!isInitializeRequest(body)) {
        this.writeJsonResponse(res, 400, {
          error: "Invalid initialize payload for Streamable HTTP transport",
        });
        return;
      }

      let serverInstance: Server | undefined;

      const httpOptions: StreamableHTTPServerTransportOptions = {
        sessionIdGenerator: () => randomUUID(),
        ...(transportOptions ?? {}),
        onsessioninitialized: async (id) => {
          if (!serverInstance) {
            return;
          }
          this.registerHttpSession(id, transport, serverInstance);
        },
        onsessionclosed: async (id) => {
          this.cleanupHttpSession(id);
        },
      };

      const transport = new StreamableHTTPServerTransport(httpOptions);

      transport.onclose = () => {
        if (transport.sessionId) {
          this.cleanupHttpSession(transport.sessionId);
        }
      };

      const context = this.createFilterContext("http", contextOverrides ?? {});
      serverInstance = this.createServerForContext(context);

      await serverInstance.connect(transport);
      await transport.handleRequest(req, res, body);

      const establishedId = transport.sessionId;
      if (establishedId && !this.httpTransports.has(establishedId)) {
        this.registerHttpSession(establishedId, transport, serverInstance);
      }
    } catch (error) {
      if (!res.headersSent) {
        this.writeJsonResponse(res, 500, {
          error: "Failed to handle MCP Streamable HTTP request",
        });
      }
      throw error;
    }
  }

  public async handleSseRequest(options: MCPServerSSERequestOptions): Promise<void> {
    const { url, ssePath, messagePath, req, res, transportOptions, contextOverrides } = options;

    if (url.pathname !== ssePath && url.pathname !== messagePath) {
      this.writeJsonResponse(res, 404, { error: "Unknown MCP SSE route" });
      return;
    }

    if (url.pathname === ssePath) {
      const context = this.createFilterContext("sse", contextOverrides ?? {});
      const serverInstance = this.createServerForContext(context);
      const transport = new SSEServerTransport(messagePath, res, transportOptions);
      const sessionId = transport.sessionId;

      this.sseSessions.set(sessionId, {
        transport,
        server: serverInstance,
        closing: false,
        isExternal: false,
      });

      transport.onclose = () => {
        void this.cleanupSseSession(sessionId, { closeTransport: false });
      };

      try {
        await serverInstance.connect(transport);
        await transport.start();
      } catch (error) {
        await this.cleanupSseSession(sessionId).catch(() => {});
        throw error;
      }

      return;
    }

    const sessionId = this.extractSessionId(url, req);

    if (!sessionId) {
      this.writeJsonResponse(res, 400, {
        error: "Missing sessionId for MCP SSE message request",
      });
      return;
    }

    const session = this.sseSessions.get(sessionId);

    if (!session) {
      this.writeJsonResponse(res, 404, {
        error: `No active MCP SSE session for id '${sessionId}'`,
      });
      return;
    }

    const body = await this.parseJsonBody(req);
    await (session.transport as SSEServerTransport).handlePostMessage(req, res, body);
  }

  public async createExternalSseSession(
    bridge: SseBridge,
    messagePath: string,
    contextOverrides: Partial<Omit<FilterContext, "transport">> = {},
  ): Promise<{ sessionId: string; completion: Promise<void> }> {
    const context = this.createFilterContext("sse", contextOverrides);
    const serverInstance = this.createServerForContext(context);
    const transport = new ExternalSseTransport(bridge, messagePath);
    const sessionId = transport.sessionId;

    const entry: SseSessionEntry = {
      transport,
      server: serverInstance,
      closing: false,
      isExternal: true,
    };

    this.sseSessions.set(sessionId, entry);

    const completion = new Promise<void>((resolve) => {
      transport.onclose = () => {
        void this.cleanupSseSession(sessionId, { closeTransport: false }).finally(resolve);
      };
    });

    try {
      await serverInstance.connect(transport);
      await transport.start();
    } catch (error) {
      await this.cleanupSseSession(sessionId).catch(() => {});
      throw error;
    }

    return { sessionId, completion };
  }

  public async handleExternalSseMessage(
    sessionId: string,
    body: unknown,
    headers: Record<string, string>,
  ): Promise<void> {
    const session = this.sseSessions.get(sessionId);

    if (!session || !session.isExternal) {
      throw new Error(`No active MCP SSE session for id '${sessionId}'`);
    }

    await (session.transport as ExternalSseTransport).dispatch(body, headers);
  }

  public async closeExternalSseSession(sessionId: string): Promise<void> {
    await this.cleanupSseSession(sessionId).catch(() => {});
  }

  public async detachTransport(name: string): Promise<void> {
    const transport = this.connectedTransports.get(name);
    if (!transport) {
      return;
    }

    this.connectedTransports.delete(name);
    try {
      await transport.close();
    } catch {
      // ignore
    }
  }

  private createFilterContext(
    transport: FilterContext["transport"],
    overrides: Partial<Omit<FilterContext, "transport">> = {},
  ): FilterContext {
    return {
      transport,
      ...overrides,
    };
  }

  private registerHttpSession(
    sessionId: string,
    transport: StreamableHTTPServerTransport,
    serverInstance: Server,
  ): void {
    this.httpTransports.set(sessionId, transport);
    this.httpServerInstances.set(sessionId, serverInstance);
  }

  private cleanupHttpSession(sessionId: string): void {
    const transport = this.httpTransports.get(sessionId);
    if (transport) {
      this.httpTransports.delete(sessionId);
    }

    const serverInstance = this.httpServerInstances.get(sessionId);
    if (serverInstance) {
      this.httpServerInstances.delete(sessionId);
      serverInstance.close?.().catch(() => {});
    }
  }

  private extractSessionId(url: URL, req: http.IncomingMessage): string | undefined {
    const queryValue = url.searchParams.get("sessionId");
    if (queryValue) {
      return queryValue;
    }

    const header = req.headers["mcp-session-id"];
    if (Array.isArray(header)) {
      return header[0];
    }

    return header || undefined;
  }

  private async cleanupSseSession(
    sessionId: string,
    options: { closeTransport?: boolean } = {},
  ): Promise<void> {
    const session = this.sseSessions.get(sessionId);
    if (!session) {
      return;
    }

    if (session.closing) {
      return;
    }

    session.closing = true;
    this.sseSessions.delete(sessionId);

    if (options.closeTransport !== false) {
      await session.transport.close().catch(() => {});
    }

    await session.server.close?.().catch(() => {});
  }

  private async parseJsonBody(req: http.IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];

    for await (const chunk of req) {
      if (typeof chunk === "string") {
        chunks.push(Buffer.from(chunk));
      } else {
        chunks.push(chunk);
      }
    }

    if (chunks.length === 0) {
      return undefined;
    }

    const raw = Buffer.concat(chunks).toString("utf-8");

    try {
      return raw.length ? JSON.parse(raw) : undefined;
    } catch (_) {
      throw new Error("Invalid JSON payload received by MCP server");
    }
  }

  private writeJsonResponse(
    res: http.ServerResponse<http.IncomingMessage>,
    statusCode: number,
    payload: unknown,
  ): void {
    if (res.headersSent) {
      return;
    }

    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(safeStringify(payload));
  }

  private async connectTransport(
    name: TransportName,
    context: FilterContext,
    transport: Transport,
  ): Promise<void> {
    if (this.connectedTransports.has(name)) {
      await this.detachTransport(name).catch(() => {});
    }

    const registry = this.buildToolRegistry(context);
    this.registerCapabilityHandlers(this.mcpServer);
    this.registerToolHandlers(this.mcpServer, registry);
    await this.mcpServer.connect(transport);
    this.connectedTransports.set(name, transport);
  }

  private ensureDeps(): MCPServerDeps {
    if (!this.deps) {
      throw new Error("MCPServer not initialized");
    }
    return this.deps;
  }

  private normalizeConfiguredAgents(agents: Record<string, Agent>): Agent[] {
    const map = new Map<string, Agent>();
    for (const agent of Object.values(agents)) {
      const key = agent.id ?? agent.name;
      if (!key || map.has(key)) {
        continue;
      }
      map.set(key, agent);
    }
    return Array.from(map.values());
  }

  private toAgentMetadata(agent: Agent): MCPAgentMetadata {
    const instructions = typeof agent.instructions === "string" ? agent.instructions : undefined;
    const description = agent.purpose ?? agent.name;
    return {
      id: agent.id,
      name: agent.name,
      description,
      purpose: agent.purpose,
      instructions,
    };
  }

  private normalizeConfiguredWorkflows(
    workflows: Record<string, MCPWorkflowConfigEntry>,
  ): RegisteredWorkflow[] {
    const map = new Map<string, RegisteredWorkflow>();
    for (const entry of Object.values(workflows)) {
      const normalized = this.normalizeExtraWorkflow(entry);
      if (!normalized) {
        continue;
      }
      const id = normalized.workflow.id;
      if (id && !map.has(id)) {
        map.set(id, normalized);
      }
    }
    return Array.from(map.values());
  }

  private normalizeExtraWorkflow(workflow: MCPWorkflowConfigEntry): RegisteredWorkflow | undefined {
    if (this.isRegisteredWorkflow(workflow)) {
      if (!workflow.workflow.id) {
        console.warn("Skipping MCP extra workflow without an id", {
          name: workflow.workflow.name,
        });
        return undefined;
      }
      return workflow;
    }

    if (this.isWorkflowConvertible(workflow)) {
      return this.normalizeExtraWorkflow(workflow.toWorkflow());
    }

    const raw = workflow as Workflow<any, any, any, any>;
    if (!raw.id) {
      console.warn("Skipping MCP extra workflow without an id", {
        name: raw.name,
      });
      return undefined;
    }

    return this.createRegisteredWorkflow(raw);
  }

  private normalizeConfiguredTools(tools: Record<string, Tool>): Tool[] {
    const map = new Map<string, Tool>();
    for (const tool of Object.values(tools)) {
      const key = tool.id ?? tool.name;
      if (!key || map.has(key)) {
        continue;
      }
      map.set(key, tool);
    }
    return Array.from(map.values());
  }

  private toToolMetadata(tool: Tool): MCPToolMetadata {
    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
    };
  }

  private isRegisteredWorkflow(value: MCPWorkflowConfigEntry): value is RegisteredWorkflow {
    return Boolean(value && typeof value === "object" && "workflow" in value);
  }

  private isWorkflowConvertible(
    value: MCPWorkflowConfigEntry,
  ): value is { toWorkflow(): Workflow<any, any, any, any> } {
    return Boolean(
      value && typeof value === "object" && typeof (value as any).toWorkflow === "function",
    );
  }

  private createRegisteredWorkflow(workflow: Workflow<any, any, any, any>): RegisteredWorkflow {
    return {
      workflow,
      registeredAt: new Date(),
      executionCount: 0,
      lastExecutedAt: undefined,
      inputSchema: workflow.inputSchema,
      suspendSchema: workflow.suspendSchema,
      resumeSchema: workflow.resumeSchema,
    } satisfies RegisteredWorkflow;
  }

  private toWorkflowSummary(entry: RegisteredWorkflow): WorkflowSummary {
    return {
      id: entry.workflow.id,
      name: entry.workflow.name,
      purpose: entry.workflow.purpose,
      metadata: {
        steps: entry.workflow.steps.length,
      },
    };
  }

  private collectFilteredComponents(context: FilterContext) {
    const deps = this.ensureDeps();

    const agentMap = new Map<string, Agent>();
    for (const agent of deps.agentRegistry.getAllAgents()) {
      const key = agent.id ?? agent.name;
      if (key) {
        agentMap.set(key, agent);
      }
    }
    for (const agent of this.configuredAgents) {
      const key = agent.id ?? agent.name;
      if (key && !agentMap.has(key)) {
        agentMap.set(key, agent);
      }
    }
    const combinedAgents = Array.from(agentMap.values());
    const topLevelAgents = combinedAgents.filter((agent) => {
      if (!agent.id || !deps.getParentAgentIds) {
        return true;
      }
      const parents = deps.getParentAgentIds(agent.id);
      return !parents || parents.length === 0;
    });

    const filteredAgents = this.getAgentFilter()({ items: topLevelAgents, context });

    const registeredWorkflows = deps.workflowRegistry.getAllWorkflows();
    const workflowSource = new Map<string, RegisteredWorkflow>();
    const combinedWorkflowSummaries: WorkflowSummary[] = [];

    for (const entry of registeredWorkflows) {
      const summary = this.toWorkflowSummary(entry);
      if (!summary.id) {
        continue;
      }
      if (!workflowSource.has(summary.id)) {
        combinedWorkflowSummaries.push(summary);
        workflowSource.set(summary.id, entry);
      }
    }

    for (const summary of this.configuredWorkflowSummaries) {
      if (!summary.id || workflowSource.has(summary.id)) {
        continue;
      }
      combinedWorkflowSummaries.push(summary);
      const entry = this.configuredWorkflowMap.get(summary.id);
      if (entry) {
        workflowSource.set(summary.id, entry);
      }
    }

    const filteredSummaries = this.getWorkflowFilter()({
      items: combinedWorkflowSummaries,
      context,
    });
    const filteredWorkflows: RegisteredWorkflow[] = [];

    for (const summary of filteredSummaries) {
      if (!summary.id) {
        continue;
      }
      const entry = workflowSource.get(summary.id);
      if (entry) {
        filteredWorkflows.push(entry);
      }
    }

    const toolById = new Map<string, Tool>();

    for (const tool of this.configuredTools) {
      const key = tool.id ?? tool.name;
      if (key && !toolById.has(key)) {
        toolById.set(key, tool);
      }
    }

    const filteredTools = this.getToolFilter()({ items: Array.from(toolById.values()), context });

    return {
      agents: filteredAgents,
      workflows: filteredWorkflows,
      tools: filteredTools,
    };
  }

  private buildToolRegistry(context: FilterContext): Map<string, RegisteredToolEntry> {
    const filtered = this.collectFilteredComponents(context);
    const usedNames = new Set<string>();
    const entries: RegisteredToolEntry[] = [
      ...this.createToolEntries(filtered.tools, usedNames),
      ...this.createAgentEntries(filtered.agents, usedNames),
      ...this.createWorkflowEntries(filtered.workflows, usedNames),
    ];

    return new Map(entries.map((entry) => [entry.name, entry]));
  }

  private registerToolHandlers(
    serverInstance: Server,
    registry: Map<string, RegisteredToolEntry>,
  ): void {
    const elicitationHandler = this.elicitationHandlers.get(serverInstance);
    const definitions = Array.from(registry.values()).map((entry) => entry.definition);

    serverInstance.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: definitions,
    }));

    serverInstance.setRequestHandler(CallToolRequestSchema, async (request) => {
      const entry = registry.get(request.params.name);

      if (!entry) {
        throw new Error(`Unknown tool requested: ${request.params.name}`);
      }

      const args = request.params.arguments ?? {};
      return entry.execute(args, elicitationHandler);
    });
  }

  private registerCapabilityHandlers(serverInstance: Server): void {
    if (this.serversWithCapabilities.has(serverInstance)) {
      return;
    }
    const capabilities: ServerCapabilities = { tools: {} };

    if (this.promptBridge.enabled) {
      this.promptBridge.registerServer(serverInstance);
    }

    if (this.resourceBridge.enabled) {
      this.resourceBridge.registerServer(serverInstance);
    }

    if (this.capabilityConfig.logging) {
      capabilities.logging = {};
    }

    if (this.capabilityConfig.prompts) {
      capabilities.prompts = { listChanged: true };
    }

    if (this.capabilityConfig.resources) {
      capabilities.resources = {
        subscribe: this.resourceBridge.supportsNotifications,
        listChanged: this.resourceBridge.supportsNotifications,
      };
    }

    if (this.capabilityConfig.elicitation) {
      capabilities.elicitation = {};
      // Elicitation requests are handled by the MCP SDK by calling server.elicitInput.
      // We expose the adapter for future use when bridging to VoltAgent components.
    }

    serverInstance.registerCapabilities(capabilities);
    this.serversWithCapabilities.add(serverInstance);

    if (this.capabilityConfig.logging) {
      serverInstance.setRequestHandler(SetLevelRequestSchema, async (request) => {
        const level = request.params.level;
        await this.setLogLevel(level);
        return {};
      });
    }

    if (this.capabilityConfig.prompts) {
      serverInstance.setRequestHandler(ListPromptsRequestSchema, async () => ({
        prompts: await this.promptBridge.listPrompts(),
      }));

      serverInstance.setRequestHandler(GetPromptRequestSchema, async (request) => {
        return this.promptBridge.getPrompt(request.params);
      });
    }

    if (this.capabilityConfig.resources) {
      serverInstance.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: await this.resourceBridge.listResources(),
      }));

      serverInstance.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const contents = await this.resourceBridge.readResource(request.params.uri);
        return {
          contents: Array.isArray(contents) ? contents : [contents],
        };
      });

      serverInstance.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
        resourceTemplates: await this.resourceBridge.listTemplates(),
      }));

      serverInstance.setRequestHandler(SubscribeRequestSchema, async (request) => {
        await this.resourceBridge.handleSubscribe(request.params.uri);
        return {};
      });

      serverInstance.setRequestHandler(UnsubscribeRequestSchema, async (request) => {
        await this.resourceBridge.handleUnsubscribe(request.params.uri);
        return {};
      });
    }

    if (this.capabilityConfig.elicitation) {
      this.registerElicitationHandler(serverInstance);
    }
  }

  private registerElicitationHandler(serverInstance: Server): void {
    if (this.elicitationHandlers.has(serverInstance)) {
      return;
    }

    const handler = this.buildElicitationHandler(serverInstance);

    this.elicitationHandlers.set(serverInstance, handler);

    serverInstance.setRequestHandler(ElicitRequestSchema, async (request) => {
      const handlerFn = this.elicitationHandlers.get(serverInstance);
      if (!handlerFn) {
        throw new Error("Elicitation handler not configured");
      }
      const response = await handlerFn(request.params);
      return response;
    });
  }

  private createServerForContext(context: FilterContext): Server {
    const serverInstance = new Server({
      name: this.config.name,
      version: this.config.version,
      description: this.config.description,
    });

    const registry = this.buildToolRegistry(context);
    this.registerCapabilityHandlers(serverInstance);
    this.registerToolHandlers(serverInstance, registry);

    if (this.capabilityConfig.elicitation) {
      const handler = this.buildElicitationHandler(serverInstance);

      this.elicitationHandlers.set(serverInstance, handler);

      serverInstance.setRequestHandler(ElicitRequestSchema, async (request) => {
        const handlerFn = this.elicitationHandlers.get(serverInstance);
        if (!handlerFn) {
          throw new Error("Elicitation handler not configured");
        }
        return handlerFn(request.params);
      });
    }

    return serverInstance;
  }

  private buildElicitationHandler(serverInstance: Server) {
    return async (request: ElicitRequest["params"]): Promise<ElicitResult> => {
      if (this.elicitationAdapter?.sendRequest) {
        return this.elicitationAdapter.sendRequest(request);
      }
      const response = await serverInstance.elicitInput(request);
      return response as ElicitResult;
    };
  }

  private createToolEntries(tools: Tool[], usedNames: Set<string>): RegisteredToolEntry[] {
    return tools.map((tool) => {
      const name = this.createUniqueName(tool.name || tool.id, usedNames, "voltagent_tool");
      const definition = ToolAdapter.toMCPTool(tool, name, tool.name);
      return {
        name,
        definition,
        origin: "tool",
        execute: (args: unknown, requestElicitation) =>
          ToolAdapter.executeTool(tool, args, {
            requestElicitation,
          }),
      };
    });
  }

  private createAgentEntries(agents: Agent[], usedNames: Set<string>): RegisteredToolEntry[] {
    return agents.map((agent) => {
      const base = agent.id ? `agent_${agent.id}` : agent.name;
      const name = this.createUniqueName(base, usedNames, "voltagent_agent");
      const definition = AgentAdapter.toMCPTool(agent, name);
      return {
        name,
        definition,
        origin: "agent",
        execute: (args: unknown, requestElicitation) =>
          AgentAdapter.executeAgent(agent, args, requestElicitation),
      };
    });
  }

  private createWorkflowEntries(
    workflows: RegisteredWorkflow[],
    usedNames: Set<string>,
  ): RegisteredToolEntry[] {
    return workflows.flatMap((registered) => {
      const entries: RegisteredToolEntry[] = [];
      const base = registered.workflow.id
        ? `workflow_${registered.workflow.id}`
        : registered.workflow.name;

      const runName = this.createUniqueName(base, usedNames, "voltagent_workflow");
      const runDefinition = WorkflowAdapter.toMCPTool(registered, runName);
      entries.push({
        name: runName,
        definition: runDefinition,
        origin: "workflow",
        execute: (args: unknown, requestElicitation) =>
          WorkflowAdapter.executeWorkflow(registered, args, requestElicitation),
      });

      const resumeName = this.createUniqueName(
        `${base}_resume`,
        usedNames,
        "voltagent_workflow_resume",
      );
      const resumeDefinition = WorkflowAdapter.toResumeTool(registered, resumeName);
      entries.push({
        name: resumeName,
        definition: resumeDefinition,
        origin: "workflow",
        execute: async (args: unknown) => {
          if (!this.deps) {
            throw new Error("MCP server not initialized before executing resume tool");
          }
          return WorkflowAdapter.resumeWorkflow(registered, args, this.deps);
        },
      });

      return entries;
    });
  }

  private createUniqueName(base: string, usedNames: Set<string>, fallback: string): string {
    const sanitizedBase = this.sanitizeName(base) || fallback;
    let candidate = sanitizedBase;
    let counter = 1;

    while (usedNames.has(candidate)) {
      candidate = `${sanitizedBase}_${counter++}`;
    }

    usedNames.add(candidate);
    return candidate;
  }

  private sanitizeName(name: string): string {
    const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    return sanitized.length > 0 ? sanitized : "";
  }

  private normalizeIdentifier(value: string): string {
    const sanitized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^[-_]+|[-_]+$/g, "");

    return sanitized || "mcp-server";
  }

  public getMetadata(): MCPServerMetadata {
    return {
      ...this.metadata,
      protocols: { ...this.metadata.protocols },
      capabilities: this.metadata.capabilities ? { ...this.metadata.capabilities } : undefined,
      agents: this.metadata.agents
        ? this.metadata.agents.map((agent) => ({ ...agent }))
        : undefined,
      workflows: this.metadata.workflows
        ? this.metadata.workflows.map((workflow) => ({
            ...workflow,
            metadata: workflow.metadata ? { ...workflow.metadata } : undefined,
          }))
        : undefined,
      tools: this.metadata.tools ? this.metadata.tools.map((tool) => ({ ...tool })) : undefined,
      releaseDate: this.metadata.releaseDate,
      packages: this.metadata.packages ? [...this.metadata.packages] : undefined,
      remotes: this.metadata.remotes ? [...this.metadata.remotes] : undefined,
    };
  }

  public async setLogLevel(level: string): Promise<void> {
    if (this.loggingAdapter?.setLevel) {
      await this.loggingAdapter.setLevel(level);
    }
  }

  public async listPrompts(): Promise<Prompt[]> {
    return this.promptBridge.listPrompts();
  }

  public async getPrompt(params: GetPromptRequest["params"]): Promise<GetPromptResult> {
    return this.promptBridge.getPrompt(params);
  }

  public async listResources(): Promise<Resource[]> {
    return this.resourceBridge.listResources();
  }

  public async readResource(uri: string): Promise<ResourceContents | ResourceContents[]> {
    return this.resourceBridge.readResource(uri);
  }

  public async listResourceTemplates(): Promise<ResourceTemplate[]> {
    return this.resourceBridge.listTemplates();
  }

  public async notifyPromptListChanged(): Promise<void> {
    await this.promptBridge.notifyChanged();
  }

  public async notifyResourceListChanged(): Promise<void> {
    await this.resourceBridge.notifyListChanged();
  }

  public async notifyResourceUpdated(uri: string): Promise<void> {
    await this.resourceBridge.notifyUpdated(uri);
  }
}
