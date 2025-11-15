import { DEFAULT_TRIGGER_CATALOG } from "./catalog-data/default-trigger-catalog";
import type { DefaultTriggerCatalogEntry } from "./catalog-data/default-trigger-catalog";
import { defineVoltOpsTrigger } from "./types";
import type { VoltOpsTriggerDefinition } from "./types";

export type VoltOpsTriggerCatalog = typeof DEFAULT_TRIGGER_CATALOG;
export type VoltOpsTriggerName = VoltOpsTriggerCatalog[number]["events"][number]["key"];

// Type helpers

type LowerFirst<S extends string> = S extends `${infer F}${infer R}` ? `${Lowercase<F>}${R}` : S;

type NormalizeSegment<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Lowercase<Head>}${Capitalize<NormalizeSegment<Tail>>}`
  : S extends `${infer Head}_${infer Tail}`
    ? `${Lowercase<Head>}${Capitalize<NormalizeSegment<Tail>>}`
    : LowerFirst<S>;

type ProviderIdentifier<Entry extends DefaultTriggerCatalogEntry> = NormalizeSegment<
  Entry["dslTriggerId"] extends string ? Entry["dslTriggerId"] : Entry["triggerId"]
>;

type EventPropertyName<K extends string> = K extends `${string}.${infer Rest}`
  ? Rest extends "*"
    ? "any"
    : NormalizeSegment<Rest>
  : NormalizeSegment<K>;

type BuildTriggerGroups<TCatalog extends readonly DefaultTriggerCatalogEntry[]> = {
  [Entry in TCatalog[number] as ProviderIdentifier<Entry>]: Entry["events"] extends readonly any[]
    ? {
        [Event in Entry["events"][number] as EventPropertyName<Event["key"]>]: Event["key"];
      }
    : never;
};

function toCamelCase(value: string): string {
  const hasSeparator = /[-_]/.test(value);
  if (hasSeparator) {
    return value
      .split(/[-_]/)
      .filter(Boolean)
      .map((segment, index) =>
        index === 0
          ? segment.toLowerCase()
          : segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
      )
      .join("");
  }
  if (!value) {
    return value;
  }
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function providerIdToKey(id: string): string {
  return toCamelCase(id);
}

function eventKeyToProperty(key: string): string {
  const [, rest] = key.split(".", 2);
  if (!rest) {
    return toCamelCase(key);
  }
  if (rest === "*") {
    return "any";
  }
  return toCamelCase(rest);
}

function defaultPathFromKey(key: string): string {
  return `/triggers/${key
    .trim()
    .replace(/\s+/g, "-")
    .replace(/\./g, "/")
    .replace(/[^A-Za-z0-9/_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/\/+/g, "/")}`;
}

function buildCatalog<const TCatalog extends readonly DefaultTriggerCatalogEntry[]>(
  catalog: TCatalog,
) {
  const groups: Record<string, Record<string, string>> = {};
  const definitions: Record<string, VoltOpsTriggerDefinition> = {};

  catalog.forEach((entry) => {
    entry.events.forEach((event) => {
      const resolvedProviderId =
        entry.dslTriggerId ??
        (event.key.includes(".") ? event.key.split(".", 2)[0] : entry.triggerId);
      const providerKey = providerIdToKey(resolvedProviderId || entry.triggerId);
      if (!groups[providerKey]) {
        groups[providerKey] = {};
      }
      const propertyKey = eventKeyToProperty(event.key);
      groups[providerKey][propertyKey] = event.key;
      definitions[event.key] = defineVoltOpsTrigger({
        name: event.key,
        provider: entry.triggerId,
        summary: event.displayName,
        description: event.description,
        defaultPath: defaultPathFromKey(event.key),
        deliveryMode: event.deliveryMode,
        category: entry.category || undefined,
      });
    });
  });

  return {
    groups: groups as BuildTriggerGroups<TCatalog>,
    definitions: definitions as Record<VoltOpsTriggerName, VoltOpsTriggerDefinition>,
  };
}
const { groups, definitions } = buildCatalog(DEFAULT_TRIGGER_CATALOG);

export const VoltOpsTriggerGroups = groups;
export type VoltOpsTriggerGroupMap = typeof VoltOpsTriggerGroups;
export const VoltOpsTriggerDefinitions = definitions;
export const VoltOpsTriggerNames = Object.keys(definitions) as VoltOpsTriggerName[];

export function getVoltOpsTriggerDefinition(name: VoltOpsTriggerName): VoltOpsTriggerDefinition {
  return definitions[name];
}
