import type { Logger } from "@voltagent/internal";
import type { Agent } from "../agent/agent";
import type { ServerProviderDeps } from "../types";
import type { VoltOpsClient } from "../voltops/client";

export type TriggerHttpMethod = "get" | "post" | "put" | "patch" | "delete";

export interface VoltOpsTriggerEnvelope<TPayload = unknown> {
  provider?: string;
  trigger?: string;
  event?: string;
  payload?: TPayload;
  deliveryId?: string;
  bindingId?: string;
  targetId?: string;
  catalogId?: string;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface VoltOpsTriggerDefinition<TPayload = unknown> {
  /** Unique trigger key, e.g. `github.star` */
  name: string;
  /** Provider identifier such as `github`, `airtable`, or `gmail-new-email` */
  provider: string;
  /** Short label for display purposes */
  summary?: string;
  /** Longer description of the trigger */
  description?: string;
  /** Suggested HTTP path (used when building default routes) */
  defaultPath?: string;
  /** Optional delivery method metadata (webhook, polling, schedule, etc.) */
  deliveryMode?: string;
  /** Optional category metadata */
  category?: string;
  /** Optional payload description */
  payloadType?: TPayload;
}

export interface RegisteredTrigger<TPayload = unknown> {
  name: string;
  path: string;
  method: TriggerHttpMethod;
  handler: TriggerHandler<TPayload>;
  definition?: VoltOpsTriggerDefinition<TPayload>;
  summary?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface TriggerHandlerContext<TPayload = unknown> {
  payload: TPayload;
  event: VoltOpsTriggerEnvelope<TPayload>;
  trigger: RegisteredTrigger<TPayload>;
  logger: Logger;
  headers: Record<string, string>;
  agentRegistry: ServerProviderDeps["agentRegistry"];
  workflowRegistry: ServerProviderDeps["workflowRegistry"];
  voltOpsClient?: VoltOpsClient;
  agents: Record<string, Agent>;
  rawRequest?: unknown;
  triggerContext: Map<string | symbol, unknown>;
}

export type TriggerHandlerBody =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[];

export interface TriggerHandlerResponse {
  status?: number;
  body?: TriggerHandlerBody;
  headers?: Record<string, string>;
}

// biome-ignore lint/suspicious/noConfusingVoidType: trigger handlers may return void for default responses
export type TriggerHandlerResult = void | TriggerHandlerBody | TriggerHandlerResponse;

/**
 * @deprecated Use {@link TriggerHandlerResult}. This alias remains for backwards compatibility.
 */
export type TriggerHandlerReturn =
  | TriggerHandlerResult
  | Promise<TriggerHandlerResult>
  | Promise<void>;

export type TriggerHandler<TPayload = unknown> = (
  context: TriggerHandlerContext<TPayload>,
) => TriggerHandlerReturn;

export type VoltAgentTriggerConfig<TPayload = unknown> =
  | TriggerHandler<TPayload>
  | {
      handler: TriggerHandler<TPayload>;
      path?: string;
      method?: TriggerHttpMethod;
      definition?: VoltOpsTriggerDefinition<TPayload>;
      summary?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    };

export type VoltAgentTriggersConfig = Record<string, VoltAgentTriggerConfig>;

export function defineVoltOpsTrigger<TPayload = unknown>(
  definition: VoltOpsTriggerDefinition<TPayload>,
): VoltOpsTriggerDefinition<TPayload> {
  return Object.freeze(definition);
}
