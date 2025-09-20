import type { A2AServerDeps, A2AServerLike, A2AServerMetadata } from "@voltagent/internal/a2a";

export class A2AServerRegistry<TServer extends A2AServerLike = A2AServerLike> {
  private readonly servers = new Set<TServer>();
  private readonly idByServer = new Map<TServer, string>();
  private readonly serverById = new Map<string, TServer>();
  private readonly metadataById = new Map<string, A2AServerMetadata>();
  private anonymousCounter = 0;

  register(server: TServer, deps: A2AServerDeps): void {
    if (this.servers.has(server)) {
      return;
    }

    server.initialize?.(deps);

    const metadata = this.resolveMetadata(server);

    this.servers.add(server);
    this.idByServer.set(server, metadata.id);
    this.serverById.set(metadata.id, server);
    this.metadataById.set(metadata.id, metadata);
  }

  unregister(server: TServer): void {
    if (!this.servers.has(server)) {
      return;
    }

    this.servers.delete(server);

    const id = this.idByServer.get(server);
    if (id) {
      this.idByServer.delete(server);
      this.serverById.delete(id);
      this.metadataById.delete(id);
    }
  }

  getServer(id: string): TServer | undefined {
    return this.serverById.get(id);
  }

  getMetadata(id: string): A2AServerMetadata | undefined {
    const metadata = this.metadataById.get(id);
    if (!metadata) {
      return undefined;
    }
    return { ...metadata, provider: metadata.provider ? { ...metadata.provider } : undefined };
  }

  list(): TServer[] {
    return Array.from(this.servers);
  }

  listMetadata(): A2AServerMetadata[] {
    return Array.from(this.metadataById.values()).map((entry) => ({
      ...entry,
      provider: entry.provider ? { ...entry.provider } : undefined,
    }));
  }

  private resolveMetadata(server: TServer): A2AServerMetadata {
    const base = server.getMetadata?.();

    const providedName = base?.name?.trim();
    const name =
      providedName && providedName.length > 0 ? providedName : this.createAnonymousName();
    const version = base?.version?.trim() || "0.0.0";
    const description = base?.description;
    const provider = base?.provider ? { ...base.provider } : undefined;

    const candidateId = base?.id?.trim() || providedName || name;
    const normalizedId = this.normalizeIdentifier(candidateId);
    const uniqueId = this.ensureUniqueId(
      normalizedId.length > 0 ? normalizedId : this.createAnonymousSlug(),
    );

    return {
      id: uniqueId,
      name,
      version,
      description,
      provider,
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
    return `a2a-server-${this.anonymousCounter}`;
  }

  private createAnonymousName(): string {
    return `VoltAgent A2A Server ${this.anonymousCounter + 1}`;
  }
}
