import type { EntityKind } from "./api";

export interface PlaygroundRoute {
  kind: EntityKind;
  entity?: string;
  trace?: string;
  span?: string;
}
export function readRoute(search: string): PlaygroundRoute {
  const params = new URLSearchParams(search);
  return {
    kind: params.get("kind") === "workflow" ? "workflow" : "agent",
    entity: params.get("entity") || undefined,
    trace: params.get("trace") || undefined,
    span: params.get("span") || undefined,
  };
}
export function routeUrl(url: string, state: PlaygroundRoute): string {
  const result = new URL(url);
  for (const [key, value] of Object.entries(state)) {
    if (value) result.searchParams.set(key, value);
    else result.searchParams.delete(key);
  }
  return result.href;
}
