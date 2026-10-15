// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import type { Trace } from "../lib/api";
import { RecentRuns } from "./recent-runs";

it("keeps the newest result visible and reveals a selected historical run without merging unrelated runs", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const makeTrace = (id: string, attributes: Record<string, unknown> = {}): Trace => ({
    traceId: id,
    spanCount: 1,
    spans: [
      {
        spanId: id,
        traceId: id,
        name: "workflow",
        startTime: "2026-10-13T10:00:00Z",
        endTime: "2026-10-13T10:00:01Z",
        status: { code: 1 },
        attributes: {
          "workflow.execution.id": id,
          "voltagent.input": { message: "Review a duplicate bill" },
          ...attributes,
        },
      },
    ],
  });
  const earlier = makeTrace("original", { "workflow.state": "suspended" });
  const latest = makeTrace("resumed", { "workflow.previous_trace_id": "original" });
  const unrelated = makeTrace("separate");
  const traces = [latest, unrelated, earlier];
  const onSelect = vi.fn();
  const element = document.createElement("div");
  const root = createRoot(element);
  const render = (activeId: string) =>
    act(async () =>
      root.render(
        createElement(RecentRuns, {
          traces,
          activeId,
          running: false,
          onSelect,
          notes:
            activeId === "pinned" ? { original: { name: "Declined invoice", pinned: true } } : {},
        }),
      ),
    );
  try {
    await render("resumed");
    expect(element.querySelectorAll(".history-entry > .trace-item")).toHaveLength(2);
    expect(element.querySelector<HTMLDetailsElement>(".history-group")?.open).toBe(false);
    expect(element.querySelector(".history-group > summary")?.textContent).toBe("1 earlier run");
    expect(element.querySelector("[aria-current] strong")?.textContent).toBe(
      "Review a duplicate bill",
    );
    expect(element.querySelector("[aria-current] .run-history-status")?.textContent).toContain(
      "1.0 s segment",
    );
    await render("original");
    expect(element.querySelector<HTMLDetailsElement>(".history-group")?.open).toBe(true);
    const active = element.querySelector<HTMLButtonElement>("[aria-current]");
    expect(active?.textContent).toContain("Initial run");
    expect(active?.textContent).toContain("Waiting to resume");
    await act(async () => active?.click());
    expect(onSelect).toHaveBeenCalledWith(earlier);
    await act(async () =>
      element.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click(),
    );
    expect(element.querySelectorAll(".history-entry > .trace-item")).toHaveLength(3);
    expect(element.querySelector(".history-group")).toBeNull();
    await render("pinned");
    expect(element.querySelector(".pinned-runs strong")?.textContent).toBe("Declined invoice");
    expect(element.querySelectorAll(".trace-item")).toHaveLength(3);
    expect(element.querySelectorAll(".run-history-time")).toHaveLength(3);
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
