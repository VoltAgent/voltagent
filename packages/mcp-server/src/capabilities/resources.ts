import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type {
  Resource,
  ResourceContents,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "@voltagent/internal";

import type { MCPResourcesAdapter, MCPStaticResourceConfig } from "../types";

interface ResourceBridgeArgs {
  staticResources?: MCPStaticResourceConfig[];
}

export class ResourceBridge {
  private readonly staticResources = new Map<string, MCPStaticResourceConfig>();
  private readonly staticResourceList: Resource[] = [];

  private adapter?: MCPResourcesAdapter;
  private logger?: Logger;

  private dynamicResourceCache: Resource[] | null = null;
  private dynamicTemplateCache: ResourceTemplate[] | null = null;

  private readonly subscriptions = new Set<string>();
  private readonly servers = new Set<Server>();

  constructor(args: ResourceBridgeArgs = {}) {
    for (const resource of args.staticResources ?? []) {
      if (!this.staticResources.has(resource.uri)) {
        this.staticResources.set(resource.uri, resource);
        this.staticResourceList.push(this.toResourceDescriptor(resource));
      }
    }
  }

  attach(args: { adapter?: MCPResourcesAdapter; server: Server; logger?: Logger }) {
    this.adapter = args.adapter;
    this.logger = args.logger;
    this.registerServer(args.server);
  }

  registerServer(server: Server) {
    this.servers.add(server);
  }

  get enabled(): boolean {
    return this.staticResources.size > 0 || Boolean(this.adapter);
  }

  get supportsNotifications(): boolean {
    return Boolean(this.adapter) || this.staticResources.size > 0;
  }

  async listResources(): Promise<Resource[]> {
    const entries = new Map<string, Resource>();
    for (const resource of this.staticResourceList) {
      entries.set(resource.uri, resource);
    }

    if (this.adapter?.listResources) {
      const dynamic = await this.ensureDynamicResourceCache();
      for (const resource of dynamic) {
        entries.set(resource.uri, resource);
      }
    }

    return Array.from(entries.values());
  }

  async readResource(uri: string): Promise<ResourceContents | ResourceContents[]> {
    const staticEntry = this.staticResources.get(uri);

    if (staticEntry) {
      const contents: ResourceContents = {
        uri: staticEntry.uri,
        mimeType: staticEntry.mimeType,
        ...(staticEntry.text ? { text: staticEntry.text } : {}),
        ...(staticEntry.blobBase64 ? { blob: staticEntry.blobBase64 } : {}),
      };
      return contents;
    }

    if (!this.adapter?.readResource) {
      throw new Error(`Resource '${uri}' not available`);
    }

    return this.adapter.readResource(uri);
  }

  async listTemplates(): Promise<ResourceTemplate[]> {
    if (!this.adapter?.listResourceTemplates) {
      return [];
    }
    if (!this.dynamicTemplateCache) {
      this.dynamicTemplateCache = await this.adapter.listResourceTemplates();
    }
    return this.dynamicTemplateCache;
  }

  async handleSubscribe(uri: string): Promise<void> {
    this.subscriptions.add(uri);
    if (this.adapter?.subscribe) {
      await this.adapter.subscribe({ uri });
    }
  }

  async handleUnsubscribe(uri: string): Promise<void> {
    this.subscriptions.delete(uri);
    if (this.adapter?.unsubscribe) {
      await this.adapter.unsubscribe({ uri });
    }
  }

  async notifyUpdated(uri: string): Promise<void> {
    if (!this.subscriptions.has(uri)) {
      return;
    }
    await Promise.all(
      Array.from(this.servers).map((server) => server.sendResourceUpdated({ uri })),
    );
  }

  async notifyListChanged(): Promise<void> {
    this.dynamicResourceCache = null;
    this.dynamicTemplateCache = null;
    await Promise.all(Array.from(this.servers).map((server) => server.sendResourceListChanged()));
  }

  private toResourceDescriptor(resource: MCPStaticResourceConfig): Resource {
    return {
      uri: resource.uri,
      name: resource.name ?? resource.uri,
      description: resource.description,
      mimeType: resource.mimeType,
    };
  }

  private async ensureDynamicResourceCache(): Promise<Resource[]> {
    if (!this.adapter?.listResources) {
      return [];
    }

    if (!this.dynamicResourceCache) {
      try {
        const resources = await this.adapter.listResources();
        this.dynamicResourceCache = Array.isArray(resources) ? [...resources] : [];
      } catch (error) {
        this.logger?.warn?.("Failed to list dynamic MCP resources", {
          error: error instanceof Error ? error.message : error,
        });
        this.dynamicResourceCache = [];
      }
    }

    return this.dynamicResourceCache;
  }
}
