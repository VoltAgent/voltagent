import {
  Activity,
  ArrowUpRight,
  Bot,
  ChevronRight,
  CircleHelp,
  GitBranch,
  Search,
} from "lucide-react";
import { useState } from "react";
import type { Entity, EntityKind, Trace } from "../lib/api";
import type { RunNotes } from "../lib/run-notes";
import { RecentRuns } from "./recent-runs";

export function PlaygroundSidebar({
  kind,
  entities,
  selectedId,
  agentCount,
  workflowCount,
  onPick,
  traces,
  notes,
  activeId,
  running,
  onSelectRun,
  error,
}: {
  kind: EntityKind;
  entities?: Entity[];
  selectedId?: string;
  agentCount: number;
  workflowCount: number;
  onPick: (kind: EntityKind, id: string) => void;
  traces: Trace[];
  notes: RunNotes;
  activeId?: string;
  running: boolean;
  onSelectRun: (trace: Trace) => void;
  error?: Error | null;
}) {
  const [search, setSearch] = useState("");
  return (
    <aside className="sidebar">
      <div className="nav-tabs">
        <button
          type="button"
          className={kind === "agent" ? "active" : ""}
          onClick={() => onPick("agent", "")}
        >
          <Bot size={15} />
          Agents <span>{agentCount}</span>
        </button>
        <button
          type="button"
          className={kind === "workflow" ? "active" : ""}
          onClick={() => onPick("workflow", "")}
        >
          <GitBranch size={15} />
          Workflows <span>{workflowCount}</span>
        </button>
      </div>
      <div className="search">
        <Search size={14} />
        <input
          aria-label="Search agents and workflows"
          placeholder={`Find ${kind}s…`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="entity-list">
        {entities
          ?.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
          .map((item) => (
            <button
              type="button"
              className={`entity-item ${selectedId === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => onPick(kind, item.id)}
            >
              {kind === "agent" ? <Bot size={16} /> : <GitBranch size={16} />}
              <span>{item.name}</span>
              <ChevronRight size={13} />
            </button>
          ))}
        {entities?.length === 0 && <p className="muted sidebar-empty">No {kind}s registered.</p>}
      </div>
      <div className="history-heading">
        <Activity size={14} />
        <span>Recent runs</span>
      </div>
      <RecentRuns
        traces={traces}
        notes={notes}
        activeId={activeId}
        running={running}
        onSelect={onSelectRun}
        error={error}
      />
      <div className="sidebar-footer">
        <CircleHelp size={15} />
        <a href="https://voltagent.dev/docs/" target="_blank" rel="noreferrer">
          Documentation <ArrowUpRight size={13} />
        </a>
      </div>
    </aside>
  );
}
