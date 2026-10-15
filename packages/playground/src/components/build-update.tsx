import { useEffect, useState } from "react";

declare const __PLAYGROUND_BUILD_ID__: string;

export function BuildUpdate({ running }: { running: boolean }) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (typeof __PLAYGROUND_BUILD_ID__ === "undefined") return;
    const abort = new AbortController();
    const check = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/build.json", { cache: "no-store", signal: abort.signal });
        if (!response.ok) return;
        const value: unknown = await response.json();
        if (
          !abort.signal.aborted &&
          value &&
          typeof value === "object" &&
          "id" in value &&
          typeof value.id === "string"
        )
          setAvailable(value.id !== __PLAYGROUND_BUILD_ID__);
      } catch {
        /* Development restarts can briefly make the manifest unavailable. */
      }
    };
    void check();
    const timer = setInterval(() => void check(), 30000);
    document.addEventListener("visibilitychange", check);
    return () => {
      abort.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  if (!available) return null;
  return (
    <div className="build-update" role="status">
      A new playground version is ready.{" "}
      {running
        ? "Finish or stop the current run to reload."
        : "Save any unsent draft before reloading."}
      <button type="button" disabled={running} onClick={() => window.location.reload()}>
        Reload playground
      </button>
    </div>
  );
}
