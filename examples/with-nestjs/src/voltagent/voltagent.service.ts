import { Injectable, Logger } from "@nestjs/common";
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import type { ServerProviderDeps } from "@voltagent/core";
import { createVoltAgentApp } from "@voltagent/server-hono";
import type { Hono } from "hono";
import { z } from "zod";

/**
 * Example tool that converts text to uppercase
 */
const upperCaseTool = createTool({
  name: "uppercase",
  description: "Convert text to uppercase",
  parameters: z.object({
    text: z.string().describe("Text to convert to uppercase"),
  }),
  execute: async (args) => {
    return {
      result: args.text.toUpperCase(),
      length: args.text.length,
    };
  },
});

/**
 * VoltAgent service that manages agents and provides console integration.
 * This service is provided by VoltAgentModule and can be injected
 * into any controller or service in your NestJS application.
 *
 * For middleware integration (same port as NestJS), use getDeps() and getHonoApp().
 */
@Injectable()
export class VoltAgentService {
  private readonly logger = new Logger(VoltAgentService.name);
  private voltAgent: VoltAgent;
  private honoApp?: Hono;

  /**
   * Text processing agent that can convert text to uppercase
   */
  public readonly textAgent: Agent;

  constructor() {
    // Initialize the text processing agent
    this.textAgent = new Agent({
      name: "TextAgent",
      instructions:
        "You are a helpful text processing assistant. When users ask you to process text, use the uppercase tool to convert it to uppercase and explain what you did.",
      model: "openai/gpt-4o-mini",
      tools: [upperCaseTool],
    });

    // Initialize VoltAgent WITHOUT a server
    // We'll use middleware integration instead for same-port deployment
    this.voltAgent = new VoltAgent({
      agents: {
        textAgent: this.textAgent,
      },
      // No server property - console will be served via NestJS middleware
    });

    this.logger.log("VoltAgent service initialized (middleware mode)");
  }

  /**
   * Get Hono app instance for HTTP middleware integration
   * This allows VoltAgent console to be served via NestJS at /voltagent/*
   */
  async getHonoApp(): Promise<Hono> {
    if (!this.honoApp) {
      this.honoApp = (
        await createVoltAgentApp(this.getDeps(), {
          enableSwaggerUI: process.env.NODE_ENV !== "production",
          cors: false, // NestJS handles CORS at app level
        })
      ).app;

      this.logger.log("VoltAgent Hono app created for middleware integration");
    }
    return this.honoApp;
  }

  /**
   * Get ServerProviderDeps for WebSocket and HTTP handlers
   * This provides access to agents, workflows, logger, etc. for VoltAgent infrastructure
   */
  getDeps(): ServerProviderDeps {
    // Access private properties - this is safe as we're in the same package ecosystem
    // Note: VoltAgent uses 'registry' not 'agentRegistry' as the property name
    return {
      agentRegistry: (this.voltAgent as any).registry,
      workflowRegistry: (this.voltAgent as any).workflowRegistry,
      logger: (this.voltAgent as any).logger,
      voltOpsClient: (this.voltAgent as any).registry.getGlobalVoltOpsClient(),
      observability: (this.voltAgent as any).observability,
      mcp: {
        registry: (this.voltAgent as any).mcpServerRegistry,
      },
      a2a: {
        registry: (this.voltAgent as any).a2aServerRegistry,
      },
      triggerRegistry: (this.voltAgent as any).triggerRegistry,
    };
  }

  /**
   * Get logger instance for WebSocket setup
   */
  getLogger() {
    return (this.voltAgent as any).logger;
  }

  /**
   * Gracefully shutdown VoltAgent
   * Called automatically by VoltAgentModule.onModuleDestroy
   */
  async shutdown() {
    this.logger.log("Shutting down VoltAgent...");
    await this.voltAgent.shutdown();
    this.logger.log("VoltAgent shutdown complete");
  }
}
