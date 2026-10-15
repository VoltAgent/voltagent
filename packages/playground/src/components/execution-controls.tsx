import { ListTree } from "lucide-react";
import type { CanvasOptions } from "../lib/canvas-options";

export function ExecutionControls({
  execution,
  hasTrace,
  presentation,
  onPresentation,
  spanMode,
  hiddenCount,
  onToggleInternals,
  showLogs,
  onToggleLogs,
  showSearch,
  onToggleSearch,
  compact,
  onToggleCompact,
  canvas,
  hasHistory,
}: {
  execution: boolean;
  hasTrace: boolean;
  presentation: "flow" | "waterfall";
  onPresentation: (value: "flow" | "waterfall") => void;
  spanMode: "overview" | "all";
  hiddenCount: number;
  onToggleInternals: () => void;
  showLogs: boolean;
  onToggleLogs: () => void;
  showSearch: boolean;
  onToggleSearch: () => void;
  compact: boolean;
  onToggleCompact: () => void;
  canvas: CanvasOptions;
  hasHistory: boolean;
}) {
  return (
    <div className="view-tools">
      {hasTrace && (
        <button
          type="button"
          aria-controls="execution-steps"
          aria-expanded={showSearch}
          onClick={onToggleSearch}
        >
          <ListTree size={14} /> Steps
        </button>
      )}
      {hasTrace && execution && presentation === "flow" && (
        <button type="button" onClick={() => canvas.dispatch("fit")}>
          Overview
        </button>
      )}
      {hasTrace && (
        <details className="view-options">
          <summary>View</summary>
          <div
            className="view-options-body"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button"))
                event.currentTarget.closest("details")?.removeAttribute("open");
            }}
          >
            {execution && (
              <label>
                Layout
                <select
                  aria-label="Execution view"
                  value={presentation}
                  onChange={(event) => onPresentation(event.target.value as "flow" | "waterfall")}
                >
                  <option value="flow">Flow</option>
                  <option value="waterfall">Waterfall</option>
                </select>
              </label>
            )}

            <label>
              <input type="checkbox" checked={showLogs} onChange={onToggleLogs} /> Show logs
            </label>
            {presentation === "flow" && (
              <>
                {!execution && (
                  <button type="button" onClick={() => canvas.dispatch("fit")}>
                    Fit structure
                  </button>
                )}
                <button type="button" onClick={() => canvas.dispatch("focus")}>
                  Focus step
                </button>
                <button type="button" onClick={() => canvas.dispatch("expand")}>
                  Expand all steps
                </button>
                <button type="button" onClick={() => canvas.dispatch("follow")}>
                  Follow latest step
                </button>
                {hasHistory && (
                  <label>
                    <input
                      type="checkbox"
                      checked={canvas.showHistory}
                      onChange={(event) => canvas.setShowHistory(event.target.checked)}
                    />{" "}
                    Show previous runs
                  </label>
                )}
                <label>
                  <input
                    type="checkbox"
                    checked={canvas.showIO}
                    onChange={(event) => canvas.setShowIO(event.target.checked)}
                  />{" "}
                  Input / output & lifecycle cards
                </label>

                <label>
                  <input type="checkbox" checked={!compact} onChange={onToggleCompact} /> Extra
                  metadata
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={spanMode === "all"}
                    onChange={onToggleInternals}
                  />
                  Show internal spans ({hiddenCount})
                </label>
              </>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
