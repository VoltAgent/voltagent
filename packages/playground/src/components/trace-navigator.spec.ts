// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import type { Trace } from "../lib/api";
import { TraceNavigator } from "./trace-navigator";

it("selects an internal span from the single Steps list and closes it", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const trace: Trace = {
    traceId: "run",
    spanCount: 2,
    spans: [
      {
        spanId: "root",
        traceId: "run",
        name: "agent.run",
        startTime: "2026-10-14T00:00:00Z",
        endTime: "2026-10-14T00:00:01Z",
        status: { code: 1 },
        attributes: { "entity.type": "agent" },
      },
      {
        spanId: "memory",
        parentSpanId: "root",
        traceId: "run",
        name: "memory.getMessages",
        startTime: "2026-10-14T00:00:00Z",
        endTime: "2026-10-14T00:00:00.100Z",
        status: { code: 1 },
        attributes: { "span.type": "memory" },
      },
    ],
  };
  const element = document.createElement("div");
  const root = createRoot(element);
  const onSelect = vi.fn();
  const onClose = vi.fn();
  try {
    await act(async () => root.render(createElement(TraceNavigator, { trace, onSelect, onClose })));
    await act(async () =>
      element.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click(),
    );
    const items = element.querySelectorAll<HTMLButtonElement>(".step-browser-list button");
    expect(items).toHaveLength(2);
    await act(async () => items[1].click());
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(trace.spans[1]);
    expect(onClose).toHaveBeenCalledOnce();
    await act(async () =>
      element
        .querySelector("nav")
        ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
    );
    expect(onClose).toHaveBeenCalledTimes(2);
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
