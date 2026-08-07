import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { GetPromptRequest, GetPromptResult, Prompt } from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "@voltagent/internal";

import type { MCPPromptsAdapter, MCPStaticPromptConfig } from "../types";

interface PromptBridgeArgs {
  staticPrompts?: MCPStaticPromptConfig[];
}

export class PromptBridge {
  private readonly staticEntries = new Map<string, MCPStaticPromptConfig>();
  private readonly staticPromptDescriptors: Prompt[] = [];
  private adapter?: MCPPromptsAdapter;
  private logger?: Logger;

  private readonly servers = new Set<Server>();

  private dynamicPromptCache: Prompt[] | null = null;

  constructor(args: PromptBridgeArgs = {}) {
    for (const entry of args.staticPrompts ?? []) {
      if (!this.staticEntries.has(entry.name)) {
        this.staticEntries.set(entry.name, entry);
        this.staticPromptDescriptors.push(this.toPromptDescriptor(entry));
      }
    }
  }

  attach(args: { adapter?: MCPPromptsAdapter; server: Server; logger?: Logger }) {
    this.adapter = args.adapter;
    this.logger = args.logger;
    this.registerServer(args.server);
  }

  registerServer(server: Server) {
    this.servers.add(server);
  }

  get enabled(): boolean {
    return this.staticEntries.size > 0 || Boolean(this.adapter);
  }

  async listPrompts(): Promise<Prompt[]> {
    const merged = new Map<string, Prompt>();

    for (const prompt of this.staticPromptDescriptors) {
      merged.set(prompt.name, prompt);
    }

    if (this.adapter) {
      const dynamic = await this.ensureDynamicPromptCache();
      for (const prompt of dynamic) {
        merged.set(prompt.name, prompt);
      }
    }

    return Array.from(merged.values());
  }

  async getPrompt(params: GetPromptRequest["params"]): Promise<GetPromptResult> {
    const staticConfig = this.staticEntries.get(params.name);
    if (!this.adapter || !this.adapter.getPrompt) {
      if (!staticConfig) {
        throw new Error(`Prompt '${params.name}' not found`);
      }
      return {
        description: staticConfig.description,
        messages: staticConfig.messages,
      };
    }

    try {
      const result = await this.adapter.getPrompt(params);
      return result;
    } catch (error) {
      this.logger?.warn?.("Failed to resolve prompt via adapter; falling back to static prompts", {
        promptName: params.name,
        error: error instanceof Error ? error.message : error,
      });

      if (staticConfig) {
        return {
          description: staticConfig.description,
          messages: staticConfig.messages,
        };
      }

      throw error;
    }
  }

  async notifyChanged(): Promise<void> {
    this.dynamicPromptCache = null;
    await Promise.all(Array.from(this.servers).map((server) => server.sendPromptListChanged()));
  }

  private toPromptDescriptor(config: MCPStaticPromptConfig): Prompt {
    return {
      name: config.name,
      description: config.description,
      arguments: [],
    };
  }

  private async ensureDynamicPromptCache(): Promise<Prompt[]> {
    if (!this.adapter?.listPrompts) {
      return [];
    }

    if (!this.dynamicPromptCache) {
      const dynamic = await this.adapter.listPrompts();
      this.dynamicPromptCache = Array.isArray(dynamic) ? [...dynamic] : [];
    }

    return this.dynamicPromptCache;
  }
}
