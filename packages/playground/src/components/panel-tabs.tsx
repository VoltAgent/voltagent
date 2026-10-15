import type { EntityKind } from "../lib/api";

export type Panel =
  | "run"
  | "review"
  | "compare"
  | "tools"
  | "workspace"
  | "memory"
  | "usage"
  | "cases";

export function PanelTabs({
  kind,
  panel,
  onChange,
  hasTrace = false,
}: {
  kind: EntityKind;
  panel?: Panel;
  onChange: (panel: Panel) => void;
  hasTrace?: boolean;
}) {
  const utilities: Array<{ id: Panel; label: string }> = [{ id: "tools", label: "Tools" }];
  if (kind === "agent")
    utilities.push({ id: "memory", label: "Memory" }, { id: "workspace", label: "Workspace" });
  utilities.push({ id: "usage", label: "API" });
  return (
    <nav className="panel-nav" aria-label="Runner and utilities">
      <button
        type="button"
        className={panel === "run" ? "active" : ""}
        onClick={() => onChange("run")}
      >
        {kind === "agent" ? "Chat" : "Run"}
      </button>
      <button
        type="button"
        disabled={!hasTrace}
        className={panel === "review" ? "active" : ""}
        onClick={() => onChange("review")}
      >
        Result
      </button>
      {panel === "compare" && <span className="panel-current">Compare</span>}
      <button
        type="button"
        className={panel === "cases" ? "active" : ""}
        onClick={() => onChange("cases")}
      >
        Tests
      </button>
      <label className="utility-select">
        <span className="sr-only">Utilities</span>
        <select
          aria-label="Utilities"
          value={utilities.some((item) => item.id === panel) ? panel : ""}
          onChange={(event) => onChange(event.target.value as Panel)}
        >
          <option value="" disabled>
            Utilities
          </option>
          {utilities.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
