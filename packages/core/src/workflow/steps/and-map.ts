import type { WorkflowExecuteContext } from "../internal/types";
import { defaultStepConfig } from "../internal/utils";
import type {
  WorkflowStepMap,
  WorkflowStepMapConfig,
  WorkflowStepMapEntry,
  WorkflowStepMapResult,
} from "./types";

const readPath = (value: unknown, path?: string) => {
  if (path === undefined || path === ".") {
    return value;
  }

  const parts = path.split(".");
  let current: any = value;

  for (const part of parts) {
    if (current && typeof current === "object") {
      current = current[part];
    } else {
      throw new Error(`Invalid path '${path}'`);
    }
  }

  return current;
};

const getContextValue = (context: WorkflowExecuteContext<any, any, any, any>, key: string) => {
  const ctx = context.state.context;
  if (!ctx) {
    return undefined;
  }

  if (ctx instanceof Map) {
    return ctx.get(key);
  }

  if (typeof ctx === "object") {
    return (ctx as Record<string, unknown>)[key];
  }

  return undefined;
};

const resolveMapEntry = async (
  entry: WorkflowStepMapEntry<any, any>,
  context: WorkflowExecuteContext<any, any, any, any>,
) => {
  switch (entry.source) {
    case "value":
      return entry.value;
    case "data":
      return readPath(context.data, entry.path);
    case "input":
      return readPath(context.state.input, entry.path);
    case "step": {
      const stepData = context.getStepData(entry.stepId);
      if (!stepData) {
        throw new Error(`Step '${entry.stepId}' not found in map`);
      }
      const stepValue = stepData.output !== undefined ? stepData.output : stepData.input;
      return readPath(stepValue, entry.path);
    }
    case "context": {
      const ctxValue = getContextValue(context, entry.key);
      return readPath(ctxValue, entry.path);
    }
    case "fn":
      return await entry.fn(context);
    default:
      throw new Error("Unsupported map entry");
  }
};

/**
 * Creates a mapping step that composes data from input, steps, or context.
 */
export function andMap<INPUT, DATA, MAP extends Record<string, WorkflowStepMapEntry<INPUT, DATA>>>({
  map,
  ...config
}: WorkflowStepMapConfig<INPUT, DATA, MAP>) {
  return {
    ...defaultStepConfig(config),
    type: "map",
    map,
    execute: async (context) => {
      const entries = Object.entries(map) as Array<[keyof MAP, MAP[keyof MAP]]>;
      const result = {} as WorkflowStepMapResult<MAP>;

      for (const [key, entry] of entries) {
        result[key] = (await resolveMapEntry(
          entry,
          context,
        )) as WorkflowStepMapResult<MAP>[typeof key];
      }

      return result;
    },
  } satisfies WorkflowStepMap<INPUT, DATA, MAP>;
}
