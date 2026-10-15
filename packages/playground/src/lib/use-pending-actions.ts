import { useCallback, useMemo, useState } from "react";
import type { Trace } from "./api";
import {
  type ConversationAction,
  type PendingAction,
  conversationKey,
  withPendingActions,
} from "./pending-action";
import { readStoredState, writeStoredState } from "./storage";

export function usePendingActions(rawTraces: Trace[]) {
  const [pendingActions, setPendingActions] = useState(() =>
    readStoredState<Record<string, PendingAction>>("pending-actions", {}),
  );
  const onPendingAction = useCallback((action: ConversationAction) => {
    setPendingActions((previous) => {
      const key = conversationKey(action);
      const current = previous[key];
      if (
        current?.approval.join("\n") === action.pending?.approval.join("\n") &&
        current?.client.join("\n") === action.pending?.client.join("\n")
      )
        return previous;
      const next = { ...previous };
      if (action.pending) next[key] = action.pending;
      else delete next[key];
      writeStoredState("pending-actions", next);
      return next;
    });
  }, []);
  const sortedTraces = useMemo(
    () => withPendingActions(rawTraces, pendingActions),
    [rawTraces, pendingActions],
  );
  return { sortedTraces, onPendingAction };
}
