import type { MCPServerDeps, MCPServerLike, MCPServerMetadata } from "@voltagent/internal/mcp";

export interface RegisterOptions {
  startTransports?: boolean;
  transportOptions?: Record<string, unknown>;
}

export class MCPServerRegistry<TServer extends MCPServerLike = MCPServerLike> {
  private readonly servers = new Set<TServer>();
  private readonly idByServer = new Map<TServer, string>();
  private readonly serverById = new Map<string, TServer>();
  private readonly metadataById = new Map<string, MCPServerMetadata>();
  private anonymousCounter = 0;

  register(server: TServer, deps: MCPServerDeps, options?: RegisterOptions): void {
    if (this.servers.has(server)) {
      return;
    }

    server.initialize(deps);

    const metadata = this.resolveMetadata(server);

    this.servers.add(server);
    this.idByServer.set(server, metadata.id);
    this.serverById.set(metadata.id, server);
    this.metadataById.set(metadata.id, metadata);

    if (options?.startTransports) {
      this.startConfigured(server, options.transportOptions).catch((error) => {
        console.warn("Failed to start MCP transports", { error });
      });
    }
  }

  unregister(server: TServer): void {
    if (!this.servers.has(server)) {
      return;
    }

    this.servers.delete(server);

    const serverId = this.idByServer.get(server);
    if (serverId) {
      this.idByServer.delete(server);
      this.serverById.delete(serverId);
      this.metadataById.delete(serverId);
    }

    void server.close?.().catch(() => {
      /* noop */
    });
  }

  getServer(id: string): TServer | undefined {
    return this.serverById.get(id);
  }

  getServerMetadata(id: string): MCPServerMetadata | undefined {
    const metadata = this.metadataById.get(id);
    if (!metadata) {
      return undefined;
    }
    return {
      ...metadata,
      protocols: metadata.protocols ? { ...metadata.protocols } : undefined,
      capabilities: metadata.capabilities ? { ...metadata.capabilities } : undefined,
      packages: metadata.packages ? [...metadata.packages] : undefined,
      remotes: metadata.remotes ? [...metadata.remotes] : undefined,
    };
  }

  list(): TServer[] {
    return Array.from(this.servers);
  }

  listMetadata(): MCPServerMetadata[] {
    return Array.from(this.metadataById.values()).map((metadata) => ({
      ...metadata,
      protocols: metadata.protocols ? { ...metadata.protocols } : undefined,
      capabilities: metadata.capabilities ? { ...metadata.capabilities } : undefined,
      packages: metadata.packages ? [...metadata.packages] : undefined,
      remotes: metadata.remotes ? [...metadata.remotes] : undefined,
    }));
  }

  async startAll(options?: Record<string, unknown>): Promise<void> {
    await Promise.all(this.list().map((server) => this.startConfigured(server, options)));
  }

  async stopAll(): Promise<void> {
    await Promise.all(this.list().map((server) => server.close?.() ?? Promise.resolve()));
  }

  private async startConfigured(server: TServer, options?: Record<string, unknown>): Promise<void> {
    if (typeof server.startConfiguredTransports === "function") {
      await server.startConfiguredTransports(options);
    }
  }

  private resolveMetadata(server: TServer): MCPServerMetadata {
    const base = server.getMetadata?.();

    const providedName = base?.name?.trim();
    const name =
      providedName && providedName.length > 0 ? providedName : this.createAnonymousSlug();
    const version = base?.version ?? "0.0.0";

    const providedId = base?.id?.trim();
    const idSource =
      providedId && providedId.length > 0
        ? providedId
        : providedName && providedName.length > 0
          ? providedName
          : name;

    const normalizedId = this.normalizeIdentifier(idSource);
    const uniqueId = this.ensureUniqueId(normalizedId || this.createAnonymousSlug());

    return {
      id: uniqueId,
      name,
      version,
      description: base?.description,
      protocols: base?.protocols ? { ...base.protocols } : undefined,
      capabilities: base?.capabilities ? { ...base.capabilities } : undefined,
      packages: base?.packages ? [...base.packages] : undefined,
      remotes: base?.remotes ? [...base.remotes] : undefined,
    };
  }

  private normalizeIdentifier(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^[-_]+|[-_]+$/g, "");
  }

  private ensureUniqueId(id: string): string {
    if (!this.serverById.has(id)) {
      return id;
    }

    let suffix = 1;
    let candidate = `${id}-${suffix}`;
    while (this.serverById.has(candidate)) {
      suffix += 1;
      candidate = `${id}-${suffix}`;
    }
    return candidate;
  }

  private createAnonymousSlug(): string {
    this.anonymousCounter += 1;
    return `mcp-server-${this.anonymousCounter}`;
  }
}
