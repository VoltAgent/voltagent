import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { type TriggerHttpRequestContext, executeTriggerHandler } from "@voltagent/server-core";
import type { OpenAPIHonoType } from "../zod-openapi-compat";

function extractHeaders(
  headers: Headers | NodeJS.Dict<string | string[] | undefined>,
): Record<string, string> {
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  const result: Record<string, string> = {};
  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value === "string") {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value.join(", ");
    }
  });
  return result;
}

function extractQuery(query: unknown): Record<string, string | string[]> {
  if (!query) {
    return {};
  }

  if (typeof (query as any)[Symbol.iterator] === "function") {
    try {
      return Object.fromEntries(query as Iterable<[string, string | string[]]>);
    } catch {
      // Fall through to object handling
    }
  }

  if (typeof query === "object") {
    const entries = query as Record<string, string | string[] | undefined>;
    const result: Record<string, string | string[]> = {};
    Object.entries(entries).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }
      if (Array.isArray(value)) {
        result[key] = value.length > 1 ? value : (value[0] ?? "");
        return;
      }
      result[key] = value;
    });
    return result;
  }

  return {};
}

export function registerTriggerRoutes(
  app: OpenAPIHonoType,
  deps: ServerProviderDeps,
  logger: Logger,
): void {
  const triggers = deps.triggerRegistry.list();
  triggers.forEach((trigger) => {
    const method = trigger.method ?? "post";
    const handler = async (c: any) => {
      const body = await c.req.json().catch(() => undefined);
      const context: TriggerHttpRequestContext = {
        body,
        headers: extractHeaders(c.req.raw?.headers ?? new Headers()),
        query: extractQuery(c.req.queries()),
        raw: c.req.raw,
      };
      const response = await executeTriggerHandler(trigger, context, deps, logger);
      return c.json(response.body ?? { success: true }, response.status, response.headers);
    };

    if (typeof (app as any)[method] !== "function") {
      logger.warn(`Skipping trigger ${trigger.name}: method ${method} not supported by Hono`);
      return;
    }

    (app as any)[method](trigger.path, handler);
    logger.info("[volt] Trigger route registered", {
      trigger: trigger.name,
      method: method.toUpperCase(),
      path: trigger.path,
    });
  });
}
