import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { type TriggerHttpRequestContext, executeTriggerHandler } from "@voltagent/server-core";
import type { Elysia } from "elysia";

function extractHeaders(headers: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function extractQuery(
  query: Record<string, string | undefined>,
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Register trigger routes dynamically based on the trigger registry
 */
export function registerTriggerRoutes(app: Elysia, deps: ServerProviderDeps, logger: Logger): void {
  const triggers = deps.triggerRegistry.list();

  for (const trigger of triggers) {
    const method = (trigger.method ?? "post").toLowerCase();
    const handler = async ({ body, headers, query, request }: any) => {
      const context: TriggerHttpRequestContext = {
        body,
        headers: extractHeaders(headers),
        query: extractQuery(query),
        raw: request,
      };

      const response = await executeTriggerHandler(trigger, context, deps, logger);

      return new Response(JSON.stringify(response.body ?? { success: true }), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          ...response.headers,
        },
      });
    };

    // Register the route with the appropriate HTTP method
    switch (method) {
      case "get":
        app.get(trigger.path, handler);
        break;
      case "post":
        app.post(trigger.path, handler);
        break;
      case "put":
        app.put(trigger.path, handler);
        break;
      case "delete":
        app.delete(trigger.path, handler);
        break;
      case "patch":
        app.patch(trigger.path, handler);
        break;
      default:
        logger.warn(`Skipping trigger ${trigger.name}: method ${method} not supported`);
        continue;
    }

    logger.info("[volt] Trigger route registered", {
      trigger: trigger.name,
      method: method.toUpperCase(),
      path: trigger.path,
    });
  }
}
