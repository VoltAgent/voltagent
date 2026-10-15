import { safeStringify } from "@voltagent/internal";
import { useCallback, useEffect, useState } from "react";

export function readStoredState<T>(key: string, initial: T): T {
  try {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(`voltagent.playground.${key}`) : null;
    return stored ? (JSON.parse(stored) as T) : initial;
  } catch {
    return initial;
  }
}

export function writeStoredState(key: string, value: unknown): void {
  try {
    localStorage.setItem(`voltagent.playground.${key}`, safeStringify(value));
  } catch {
    /* Storage may be unavailable or full. */
  }
}

export function useStoredState<T>(key: string, initial: T, override?: T) {
  const [value, setValue] = useState<T>(() => override ?? readStoredState(key, initial));
  // Persist generated defaults (especially conversation IDs) before the first edit.
  useEffect(() => {
    writeStoredState(key, value);
  }, [key, value]);
  const update = useCallback((next: T) => {
    setValue(next);
  }, []);
  return [value, update] as const;
}
