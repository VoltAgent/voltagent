import { type VoltOpsTriggerGroupMap, VoltOpsTriggerGroups } from "./catalog";
import type { VoltAgentTriggerConfig, VoltAgentTriggersConfig } from "./types";

type TriggerRegistrar = (config: VoltAgentTriggerConfig) => void;

type TriggerProviderDsl<TEvents extends Record<string, string>> = {
  [Event in keyof TEvents]: TriggerRegistrar;
};

type TriggerDsl = {
  [Provider in keyof VoltOpsTriggerGroupMap]: TriggerProviderDsl<VoltOpsTriggerGroupMap[Provider]>;
};

/**
 * DSL helper that allows registering triggers with dot-access syntax.
 *
 * Example:
 * ```ts
 * const volt = new VoltAgent({
 *   triggers: createTriggers((on) => {
 *     on.github.star(async ({ payload }) => {
 *       // ...
 *     });
 *   }),
 * });
 * ```
 */
export function createTriggers(builder: (on: TriggerDsl) => void): VoltAgentTriggersConfig {
  const registry: VoltAgentTriggersConfig = {};
  const providerCache = new Map<string, TriggerProviderDsl<Record<string, string>>>();

  const createEventRegistrar =
    (eventKey: string): TriggerRegistrar =>
    (config: VoltAgentTriggerConfig) => {
      registry[eventKey] = config;
    };

  const createProviderProxy = (providerKey: string): TriggerProviderDsl<Record<string, string>> => {
    const providerEvents = VoltOpsTriggerGroups[providerKey as keyof VoltOpsTriggerGroupMap] as
      | Record<string, string>
      | undefined;
    return new Proxy(
      {},
      {
        get(_target, prop) {
          if (typeof prop !== "string") {
            return undefined;
          }
          const eventKey = providerEvents?.[prop];
          if (!eventKey) {
            throw new Error(
              `Trigger event '${providerKey}.${prop}' is not defined in the VoltOps catalog.`,
            );
          }
          return createEventRegistrar(eventKey);
        },
      },
    ) as TriggerProviderDsl<Record<string, string>>;
  };

  const rootProxy: TriggerDsl = new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== "string") {
          return undefined;
        }
        if (!VoltOpsTriggerGroups[prop as keyof VoltOpsTriggerGroupMap]) {
          throw new Error(`Trigger provider '${prop}' is not defined in the VoltOps catalog.`);
        }
        if (!providerCache.has(prop)) {
          providerCache.set(prop, createProviderProxy(prop));
        }
        return providerCache.get(prop);
      },
    },
  ) as TriggerDsl;

  builder(rootProxy);

  return registry;
}
