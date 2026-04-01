type ValidationIssue = {
  code?: string;
  expected?: unknown;
  received?: unknown;
  path?: unknown;
};

type PathSegment = string | number;

const isPathSegment = (value: unknown): value is PathSegment =>
  typeof value === "string" || typeof value === "number";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cloneValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item));
  }
  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = cloneValue(item);
    }
    return result;
  }
  return value;
};

const getValueAtPath = (value: unknown, path: PathSegment[]): unknown => {
  let cursor: unknown = value;
  for (const segment of path) {
    if (Array.isArray(cursor) && typeof segment === "number") {
      cursor = cursor[segment];
      continue;
    }
    if (isRecord(cursor) && typeof segment === "string") {
      cursor = cursor[segment];
      continue;
    }
    return undefined;
  }
  return cursor;
};

const setValueAtPath = (value: unknown, path: PathSegment[], next: unknown): boolean => {
  if (path.length === 0) {
    return false;
  }

  let cursor: unknown = value;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    const upcoming = path[index + 1];

    if (Array.isArray(cursor) && typeof segment === "number") {
      if (cursor[segment] === undefined) {
        cursor[segment] = typeof upcoming === "number" ? [] : {};
      }
      cursor = cursor[segment];
      continue;
    }

    if (isRecord(cursor) && typeof segment === "string") {
      if (cursor[segment] === undefined) {
        cursor[segment] = typeof upcoming === "number" ? [] : {};
      }
      cursor = cursor[segment];
      continue;
    }

    return false;
  }

  const last = path[path.length - 1];
  if (Array.isArray(cursor) && typeof last === "number") {
    cursor[last] = next;
    return true;
  }
  if (isRecord(cursor) && typeof last === "string") {
    cursor[last] = next;
    return true;
  }

  return false;
};

const parseStringifiedJson = (value: string, expected: "array" | "object"): unknown | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (expected === "array" && !trimmed.startsWith("[")) {
    return undefined;
  }
  if (expected === "object" && !trimmed.startsWith("{")) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (expected === "array") {
      return Array.isArray(parsed) ? parsed : undefined;
    }
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const coerceStringifiedJsonToolArgs = (
  rawArgs: Record<string, unknown>,
  issues: readonly ValidationIssue[],
): Record<string, unknown> | null => {
  const cloned = cloneValue(rawArgs);
  if (!isRecord(cloned)) {
    return null;
  }

  let changed = false;

  for (const issue of issues) {
    if (
      issue.code !== "invalid_type" ||
      issue.received !== "string" ||
      (issue.expected !== "array" && issue.expected !== "object")
    ) {
      continue;
    }

    if (!Array.isArray(issue.path) || issue.path.some((segment) => !isPathSegment(segment))) {
      continue;
    }

    const path = issue.path as PathSegment[];
    const current = getValueAtPath(cloned, path);
    if (typeof current !== "string") {
      continue;
    }

    const parsed = parseStringifiedJson(current, issue.expected);
    if (parsed === undefined) {
      continue;
    }

    changed = setValueAtPath(cloned, path, parsed) || changed;
  }

  return changed ? cloned : null;
};
