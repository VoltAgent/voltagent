import { RefreshCw, Zap } from "lucide-react";

export function PlaygroundHeader({
  error,
  connected,
  loading,
  apiUrl,
  onRefresh,
}: {
  error?: Error | null;
  connected: boolean;
  loading: boolean;
  apiUrl?: string;
  onRefresh: () => void;
}) {
  return (
    <header className="topbar">
      <a className="brand" href="/">
        <span className="brand-mark">
          <Zap size={21} fill="currentColor" />
        </span>
        VoltAgent <span className="brand-divider" />{" "}
        <span className="brand-subtitle">Playground</span>
      </a>
      <span className="local-badge">
        <span />
        LOCAL
      </span>
      <div className="topbar-right">
        <span
          className={`connection ${error ? "error" : ""}`}
          title={
            connected ? "API and live events connected" : "Polling while live events reconnect"
          }
        >
          <span />
          {error ? "Disconnected" : loading ? "Connecting" : "Connected"}
        </span>
        <code>{apiUrl?.replace(/\/$/, "") ?? "Local API"}</code>
        <button
          type="button"
          className="icon-button"
          aria-label="Refresh API data"
          title="Refresh API data"
          onClick={onRefresh}
        >
          <RefreshCw size={15} />
        </button>
      </div>
    </header>
  );
}
