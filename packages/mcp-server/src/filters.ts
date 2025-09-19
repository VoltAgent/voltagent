import type { Agent, Tool } from "@voltagent/core";

export interface WorkflowSummary {
  id: string;
  name: string;
  purpose?: string;
  metadata?: Record<string, unknown>;
}

export interface FilterContext {
  transport: "stdio" | "sse" | "http";
  sessionId?: string;
  userRole?: string;
  metadata?: Record<string, unknown>;
}

export interface FilterParams<T> {
  items: T[];
  context: FilterContext;
}

export type FilterFunction<T> = (params: FilterParams<T>) => T[];

export interface FilterConfig {
  tools?: FilterFunction<Tool>;
  agents?: FilterFunction<Agent>;
  workflows?: FilterFunction<WorkflowSummary>;
}

export const composeFilters =
  <T>(...filters: FilterFunction<T>[]): FilterFunction<T> =>
  ({ items, context }) =>
    filters.reduce((acc, filter) => filter({ items: acc, context }), items);

export const passthroughFilter =
  <T>(): FilterFunction<T> =>
  ({ items }) =>
    items;
