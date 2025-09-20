import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { GetPromptRequest, GetPromptResult, Prompt } from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "@voltagent/internal";

import type { MCPPromptsAdapter, MCPStaticPromptConfig } from "../types";

interface PromptBridgeArgs {
  staticPrompts?: MCPStaticPromptConfig[];
}

type PromptKey = `${string}::${string | ""}`;

export class PromptBridge {
  private readonly staticEntries = new Map<PromptKey, MCPStaticPromptConfig>();
  private readonly staticPromptDescriptors: Prompt[] = [];
  private adapter?: MCPPromptsAdapter;
  private logger?: Logger;

  private readonly servers = new Set<Server>();

  private dynamicPromptCache: Prompt[] | null = null;

  constructor(args: PromptBridgeArgs = {}) {
    for (const entry of args.staticPrompts ?? []) {
      const key = this.toKey(entry.name, undefined);
      if (!this.staticEntries.has(key)) {
        this.staticEntries.set(key, entry);
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
    const merged = new Map<PromptKey, Prompt>();

    for (const prompt of this.staticPromptDescriptors) {
      const version = typeof prompt.version === "string" ? prompt.version : undefined;
      merged.set(this.toKey(prompt.name, version), prompt);
    }

    if (this.adapter) {
      const dynamic = await this.ensureDynamicPromptCache();
      for (const prompt of dynamic) {
        const version = typeof prompt.version === "string" ? prompt.version : undefined;
        merged.set(this.toKey(prompt.name, version), prompt);
      }
    }

    return Array.from(merged.values());
  }

  async getPrompt(params: GetPromptRequest["params"]): Promise<GetPromptResult> {
    const key = this.toKey(
      params.name,
      typeof params.version === "string" ? params.version : undefined,
    );

    const staticConfig =
      this.staticEntries.get(key) ?? this.staticEntries.get(this.toKey(params.name, undefined));
    if (!this.adapter || !this.adapter.getPrompt) {
      if (!staticConfig) {
        throw new Error(
          `Prompt '${params.name}'${params.version ? ` (version ${params.version})` : ""} not found`,
        );
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
        promptVersion: params.version,
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
      version: undefined,
      arguments: [],
      messages: config.messages,
    };
  }

  private toKey(name: string, version?: string): PromptKey {
    return `${name}::${version ?? ""}`;
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
