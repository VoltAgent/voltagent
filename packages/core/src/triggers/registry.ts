import { LoggerProxy } from "../logger";
import type { VoltAgentTriggerConfig } from "./types";
import type { RegisteredTrigger, TriggerHttpMethod } from "./types";

function normalizePath(path: string): string {
  if (!path) {
    return "/triggers/default";
  }
  const trimmed = path.trim();
  if (trimmed.startsWith("/")) {
    return trimmed.replace(/\/+$/g, "") || "/";
  }
  return `/${trimmed.replace(/\/+$/g, "")}`;
}

function sanitizeDefaultPath(name: string): string {
  const sanitized = name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/\./g, "/")
    .replace(/[^A-Za-z0-9/_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  return `/triggers/${sanitized || "event"}`;
}

function normalizeMethod(method?: TriggerHttpMethod): TriggerHttpMethod {
  if (!method) {
    return "post";
  }
  const lower = method.toLowerCase();
  if (
    lower === "get" ||
    lower === "post" ||
    lower === "put" ||
    lower === "patch" ||
    lower === "delete"
  ) {
    return lower;
  }
  return "post";
}

declare global {
  // eslint-disable-next-line no-var
  var ___voltagent_trigger_registry: TriggerRegistry | undefined;
}

export class TriggerRegistry {
  private readonly logger = new LoggerProxy({ component: "trigger-registry" });
  private readonly triggers = new Map<string, RegisteredTrigger>();
  private readonly pathIndex = new Map<string, RegisteredTrigger>();

  public static getInstance(): TriggerRegistry {
    if (!globalThis.___voltagent_trigger_registry) {
      globalThis.___voltagent_trigger_registry = new TriggerRegistry();
    }
    return globalThis.___voltagent_trigger_registry;
  }

  public register(name: string, config: VoltAgentTriggerConfig): RegisteredTrigger {
    const handler = typeof config === "function" ? config : config.handler;
    const path = normalizePath(
      typeof config === "function"
        ? sanitizeDefaultPath(name)
        : config.path || config.definition?.defaultPath || sanitizeDefaultPath(name),
    );
    const method = normalizeMethod(typeof config === "function" ? undefined : config.method);
    const definition = typeof config === "function" ? undefined : config.definition;
    const summary =
      typeof config === "function" ? undefined : (config.summary ?? definition?.summary);
    const description =
      typeof config === "function" ? undefined : (config.description ?? definition?.description);
    const metadata = typeof config === "function" ? undefined : config.metadata;

    const registration: RegisteredTrigger = {
      name,
      path,
      method,
      handler,
      definition,
      summary,
      description,
      metadata,
    };

    if (this.triggers.has(name)) {
      this.logger.debug(`Replacing existing trigger handler for ${name}`);
    }

    const previous = this.pathIndex.get(path);
    if (previous && previous.name !== name) {
      this.logger.warn(
        `Trigger path conflict detected for ${path}. Overriding handler registered for ${previous.name}.`,
      );
    }

    this.triggers.set(name, registration);
    this.pathIndex.set(path, registration);

    this.logger.info(`Registered trigger ${name} (${method.toUpperCase()} ${path})`);

    return registration;
  }

  public registerMany(triggers?: Record<string, VoltAgentTriggerConfig>): void {
    if (!triggers) {
      return;
    }
    Object.entries(triggers).forEach(([name, config]) => this.register(name, config));
  }

  public unregister(name: string): boolean {
    const registration = this.triggers.get(name);
    if (!registration) {
      return false;
    }
    this.triggers.delete(name);
    if (registration.path) {
      const existing = this.pathIndex.get(registration.path);
      if (existing && existing.name === name) {
        this.pathIndex.delete(registration.path);
      }
    }
    return true;
  }

  public get(name: string): RegisteredTrigger | undefined {
    return this.triggers.get(name);
  }

  public getByPath(path: string): RegisteredTrigger | undefined {
    return this.pathIndex.get(normalizePath(path));
  }

  public list(): RegisteredTrigger[] {
    return Array.from(this.triggers.values());
  }

  public clear(): void {
    this.triggers.clear();
    this.pathIndex.clear();
  }
}
