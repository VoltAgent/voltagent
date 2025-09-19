export class McpSessionStore<T> {
  private readonly sessions = new Map<string, T>();

  set(sessionId: string, value: T): void {
    this.sessions.set(sessionId, value);
  }

  get(sessionId: string): T | undefined {
    return this.sessions.get(sessionId);
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  ids(): string[] {
    return Array.from(this.sessions.keys());
  }

  values(): T[] {
    return Array.from(this.sessions.values());
  }

  clear(): void {
    this.sessions.clear();
  }
}
