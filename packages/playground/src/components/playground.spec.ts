// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { safeStringify } from "@voltagent/internal";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Trace } from "../lib/api";
import { Playground } from "./playground";

vi.mock("../lib/use-live-observability", () => ({
  useLiveObservability: () => ({ connected: true, spans: [], logs: [] }),
}));
vi.mock("./graph", () => ({ ExecutionGraph: () => null }));
vi.mock("./build-update", () => ({ BuildUpdate: () => null }));
vi.mock("./chat", () => ({ Chat: () => null }));
vi.mock("./monaco-json", () => ({
  default: ({ value, label }: { value: string; label: string }) =>
    createElement("textarea", { "aria-label": label, value, readOnly: true }),
}));

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  window.history.replaceState(null, "", "/?kind=workflow&entity=first");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each(["recent runs", "trace link"])(
  "opens a fresh workflow after %s, including switching through agents",
  async (source) => {
    if (source === "trace link") {
      window.history.replaceState(null, "", "/?kind=workflow&entity=first&trace=first-trace");
      localStorage.setItem("voltagent.playground.execution.first", '"expired-first-run"');
    }
    const queries = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
    });
    const workflows = [
      { id: "first", name: "First workflow", steps: [], inputSchema: { type: "object" } },
      { id: "second", name: "Second workflow", steps: [], inputSchema: { type: "object" } },
    ];
    const agent = { id: "agent", name: "Agent" };
    const trace: Trace = {
      traceId: "first-trace",
      spanCount: 1,
      spans: [
        {
          traceId: "first-trace",
          spanId: "root",
          name: "First workflow",
          startTime: "2026-10-14T00:00:00Z",
          endTime: "2026-10-14T00:00:01Z",
          attributes: {
            "entity.id": "first",
            "entity.type": "workflow",
            "workflow.execution.id": "first-run",
            input: { value: 0 },
            output: "First result",
          },
          status: { code: 1 },
        },
      ],
    };
    queries.setQueryData(["config"], { apiUrl: "http://localhost:3141" });
    queries.setQueryData(["agents"], [agent]);
    queries.setQueryData(["agent", agent.id], agent);
    queries.setQueryData(["traces", "agent", agent.id], { traces: [] });
    queries.setQueryData(["workflows"], workflows);
    for (const workflow of workflows) {
      queries.setQueryData(["workflow", workflow.id], workflow);
      queries.setQueryData(["traces", "workflow", workflow.id], {
        traces: workflow.id === "first" ? [trace] : [],
      });
      queries.setQueryData(["workflow-cancellations", workflow.id], []);
    }
    localStorage.setItem("voltagent.playground.execution.second", '"expired-second-run"');
    const fetch = vi.fn(async (url: string) => {
      if (url.includes("/first/executions/first-run/state"))
        return new Response(
          safeStringify({ data: { status: "completed", input: {}, output: "First result" } }),
        );
      return new Response(safeStringify({ error: "Execution not found" }), { status: 404 });
    });
    vi.stubGlobal("fetch", fetch);
    const element = document.createElement("div");
    const root = createRoot(element);
    const click = async (label: string) => {
      const button = [...element.querySelectorAll("button")].find(
        (item) => item.textContent?.trim() === label,
      );
      expect(button, label).toBeDefined();
      await act(async () => button?.click());
    };
    try {
      await act(async () =>
        root.render(
          createElement(QueryClientProvider, { client: queries }, createElement(Playground)),
        ),
      );
      const recent = element.querySelector<HTMLButtonElement>(".trace-item");
      expect(recent).not.toBeNull();
      if (source === "recent runs") await act(async () => recent?.click());
      expect(element.querySelector(".run-review")?.textContent).toContain("First result");
      expect(element.querySelector(".workflow-result")?.textContent).toContain("First result");
      expect(element.querySelector(".trace-item[aria-current=true]")).not.toBeNull();
      expect(
        fetch.mock.calls.every(([url]) => url.includes("/first/executions/first-run/state")),
      ).toBe(true);
      const requests = fetch.mock.calls.length;

      await click("Structure");
      expect(element.querySelector(".run-review")?.textContent).toContain("First result");
      await click("Execution");
      await click("Compare runs");
      expect(element.querySelector(".run-debug.embedded")).not.toBeNull();
      await click("Result");
      await click("Run again");
      expect(element.querySelector(".case-run-notice")?.textContent).toContain(
        "comparison baseline",
      );
      expect(element.querySelector(".runner-container[hidden]")).toBeNull();
      expect(element.querySelector("textarea")?.value).toContain('"value": 0');
      expect(fetch).toHaveBeenCalledTimes(requests);

      await click("Second workflow");
      expect(fetch).toHaveBeenCalledTimes(requests);
      expect(element.querySelector("h2")?.textContent).toBe("New run");
      expect(element.querySelector("[role=alert]")).toBeNull();
      expect(element.querySelector(".trace-item[aria-current=true]")).toBeNull();
      expect(window.location.search).toBe("?kind=workflow&entity=second");

      await click("Agents 1");
      await click("Workflows 2");
      await click("Second workflow");
      expect(fetch).toHaveBeenCalledTimes(requests);
      expect(element.querySelector("h2")?.textContent).toBe("New run");
      // Switching only prepares a draft; it must not discard resumable saved executions.
      expect(localStorage.getItem("voltagent.playground.execution.second")).toBe(
        '"expired-second-run"',
      );
    } finally {
      await act(async () => root.unmount());
      queries.clear();
    }
  },
);
