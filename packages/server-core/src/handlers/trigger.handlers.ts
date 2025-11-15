import type {
  Agent,
  RegisteredTrigger,
  TriggerHandlerResult,
  VoltOpsTriggerEnvelope,
} from "@voltagent/core";
import {
  type Span,
  SpanKind,
  SpanStatusCode,
  TRIGGER_CONTEXT_KEY,
  context as otelContext,
  trace,
} from "@voltagent/core";
import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { isPlainObject } from "@voltagent/internal/utils";

export interface TriggerHttpRequestContext {
  body: unknown;
  headers: Record<string, string>;
  query?: Record<string, string | string[]>;
  raw?: unknown;
}

export interface TriggerHandlerHttpResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const hasResponseMetadata = (value: Record<string, unknown>): boolean =>
  hasOwn(value, "status") || hasOwn(value, "body") || hasOwn(value, "headers");

function extractPayload(body: unknown): unknown {
  if (!isPlainObject(body)) {
    return body;
  }

  if ("input" in body) {
    return body.input;
  }

  if ("payload" in body) {
    return body.payload;
  }

  if ("record" in body) {
    return body.record;
  }

  if ("data" in body) {
    return body.data;
  }

  return body;
}

function buildEnvelope(
  registration: RegisteredTrigger,
  body: unknown,
): VoltOpsTriggerEnvelope<unknown> {
  if (isPlainObject(body)) {
    return {
      trigger: registration.name,
      provider: registration.definition?.provider,
      ...body,
    } as VoltOpsTriggerEnvelope<unknown>;
  }

  return {
    trigger: registration.name,
    provider: registration.definition?.provider,
    payload: body,
  } satisfies VoltOpsTriggerEnvelope<unknown>;
}

function normalizeResult(result: TriggerHandlerResult | undefined): TriggerHandlerHttpResponse {
  if (typeof result === "undefined") {
    return { status: 200, body: { success: true } };
  }

  if (isPlainObject(result) && hasResponseMetadata(result)) {
    const status = (result.status as number | undefined) ?? 200;
    const bodyProvided = hasOwn(result, "body");
    return {
      status,
      body: bodyProvided ? result.body : { success: true },
      headers: result.headers as Record<string, string> | undefined,
    };
  }

  if (
    typeof result === "string" ||
    typeof result === "number" ||
    typeof result === "boolean" ||
    result === null ||
    Array.isArray(result) ||
    isPlainObject(result)
  ) {
    return { status: 200, body: result };
  }

  return { status: 200, body: result };
}

function extractMetadata(body: unknown): Record<string, unknown> | undefined {
  if (!isPlainObject(body)) {
    return undefined;
  }
  const metadata = (body as Record<string, unknown>).metadata;
  return isPlainObject(metadata) ? (metadata as Record<string, unknown>) : undefined;
}

function buildTriggerAttributeMap(
  registration: RegisteredTrigger,
  event: VoltOpsTriggerEnvelope,
  metadata?: Record<string, unknown>,
): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    "trigger.triggerId": event.trigger ?? registration.name,
    "trigger.provider": event.provider ?? registration.definition?.provider,
    "trigger.eventId":
      (metadata?.eventId as string | undefined) ??
      (typeof event.event === "string" ? event.event : undefined) ??
      (event.deliveryId as string | undefined),
    "trigger.bindingId": event.bindingId ?? (metadata?.bindingId as string | undefined),
    "trigger.bindingName": metadata?.bindingName,
    "trigger.bindingDisplayName": metadata?.bindingDisplayName,
    "trigger.bindingTargetId": event.targetId ?? (metadata?.bindingTargetId as string | undefined),
    "trigger.bindingTargetName": metadata?.bindingTargetName,
    "trigger.service": metadata?.service ?? event.provider ?? registration.definition?.provider,
    "trigger.catalogId": event.catalogId ?? (metadata?.catalogId as string | undefined),
    "trigger.targetEndpoint": metadata?.targetEndpoint,
    "trigger.targetName": metadata?.targetName,
    "trigger.targetType": metadata?.targetType,
    "trigger.status": metadata?.status,
    "trigger.latencyMs": metadata?.latencyMs,
    "trigger.hasTarget": metadata?.hasTarget,
    "trigger.occurredAt": metadata?.occurredAt,
  };

  if (registration.definition?.summary) {
    attributes["trigger.summary"] = registration.definition.summary;
  }
  if (registration.definition?.description) {
    attributes["trigger.description"] = registration.definition.description;
  }
  if (metadata) {
    attributes["trigger.metadata"] = metadata;
  }

  return attributes;
}

const TRIGGER_AWARE_METHODS: Record<string, number> = {
  generateText: 1,
  streamText: 1,
  generateObject: 2,
  streamObject: 2,
};

function mergeOptionsWithTriggerContext<T extends Record<string, any> | undefined>(
  options: T,
  triggerContext: Map<string | symbol, unknown>,
): any {
  const contextMap =
    options?.context instanceof Map
      ? new Map(options.context)
      : options?.context
        ? new Map(Object.entries(options.context as Record<string, unknown>))
        : new Map<string | symbol, unknown>();

  for (const [key, value] of triggerContext.entries()) {
    if (!contextMap.has(key)) {
      contextMap.set(key, value);
    }
  }

  if (options && typeof options === "object") {
    return {
      ...options,
      context: contextMap,
    };
  }

  return {
    context: contextMap,
  };
}

function createTriggerAwareAgents(
  agents: Record<string, Agent> | undefined,
  triggerContext: Map<string | symbol, unknown>,
): Record<string, Agent> {
  if (!agents) {
    return {};
  }

  const wrapped: Record<string, Agent> = {};

  for (const [key, agent] of Object.entries(agents)) {
    if (!agent) {
      continue;
    }
    wrapped[key] = new Proxy(agent, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (
          typeof prop === "string" &&
          typeof value === "function" &&
          Object.prototype.hasOwnProperty.call(TRIGGER_AWARE_METHODS, prop)
        ) {
          const optionsIndex = TRIGGER_AWARE_METHODS[prop];
          return (...args: any[]) => {
            const updatedArgs = [...args];
            if (updatedArgs.length > optionsIndex) {
              updatedArgs[optionsIndex] = mergeOptionsWithTriggerContext(
                updatedArgs[optionsIndex],
                triggerContext,
              );
            } else {
              while (updatedArgs.length < optionsIndex) {
                updatedArgs.push(undefined);
              }
              updatedArgs.push(mergeOptionsWithTriggerContext(undefined, triggerContext));
            }
            return value.apply(target, updatedArgs);
          };
        }

        if (typeof value === "function") {
          return value.bind(target);
        }

        return value;
      },
    });
  }

  return wrapped;
}

export async function executeTriggerHandler(
  registration: RegisteredTrigger,
  request: TriggerHttpRequestContext,
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<TriggerHandlerHttpResponse> {
  let triggerSpan: Span | undefined;
  try {
    const payload = extractPayload(request.body);
    const event = buildEnvelope(registration, request.body);
    const handlerLogger = logger.child({ trigger: registration.name });
    const metadata = extractMetadata(request.body);
    const triggerAttributes = buildTriggerAttributeMap(registration, event, metadata);
    const triggerContext = new Map<string | symbol, unknown>();

    for (const [key, value] of Object.entries(triggerAttributes)) {
      if (value !== undefined && value !== null && value !== "") {
        triggerContext.set(key, value);
      }
    }
    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        const contextKey = `trigger.metadata.${key}`;
        if (!triggerContext.has(contextKey)) {
          triggerContext.set(contextKey, value);
        }
      }
    }

    const tracer = deps.observability?.getTracer();
    triggerSpan = tracer?.startSpan(
      `Trigger ${registration.definition?.summary ?? registration.name}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          "span.type": "trigger",
          ...triggerAttributes,
        },
      },
      otelContext.active(),
    );

    const agentsWithContext = createTriggerAwareAgents(
      (registration.metadata?.agents as Record<string, Agent>) ?? {},
      triggerContext,
    );

    const contextWithTrigger = otelContext.active().setValue(TRIGGER_CONTEXT_KEY, triggerContext);

    const executeHandler = () =>
      registration.handler({
        payload,
        event,
        trigger: registration,
        logger: handlerLogger,
        headers: request.headers,
        agentRegistry: deps.agentRegistry,
        workflowRegistry: deps.workflowRegistry,
        voltOpsClient: deps.voltOpsClient,
        agents: agentsWithContext,
        rawRequest: request.raw,
        triggerContext,
      });

    const response = triggerSpan
      ? await otelContext.with(trace.setSpan(contextWithTrigger, triggerSpan), executeHandler)
      : await otelContext.with(contextWithTrigger, executeHandler);

    triggerSpan?.setStatus({ code: SpanStatusCode.OK });
    triggerSpan?.end();

    return normalizeResult(response);
  } catch (error) {
    if (triggerSpan) {
      triggerSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "Trigger handler failed",
      });
      if (error instanceof Error) {
        triggerSpan.recordException(error);
      }
      triggerSpan.end();
    }
    logger.error(`Trigger handler failed for ${registration.name}`, { error });
    return {
      status: 500,
      body: {
        success: false,
        error: "Trigger handler failed",
      },
    };
  }
}
