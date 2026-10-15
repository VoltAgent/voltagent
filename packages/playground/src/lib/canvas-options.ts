import { useState } from "react";

export type CanvasCommand = "fit" | "focus" | "expand" | "follow";

export function useCanvasOptions() {
  const [showHistory, setShowHistory] = useState(false);
  const [showIO, setShowIO] = useState(false);
  const [command, setCommand] = useState<{ action: CanvasCommand; version: number }>();
  return {
    showHistory,
    setShowHistory,
    showIO,
    setShowIO,
    command,
    dispatch: (action: CanvasCommand) =>
      setCommand((previous) => ({ action, version: (previous?.version ?? 0) + 1 })),
  };
}
export type CanvasOptions = ReturnType<typeof useCanvasOptions>;
