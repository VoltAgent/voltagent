// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import type { Trace } from "../lib/api";
import { RunReview } from "./run-review";

const trace: Trace = {
  traceId: "run",
  spanCount: 1,
  spans: [
    {
      traceId: "run",
      spanId: "root",
      name: "workflow",
      startTime: "2026-10-14T00:00:00Z",
      endTime: "2026-10-14T00:00:01Z",
      status: { code: 1 },
      attributes: { input: { question: "test" }, output: 0 },
    },
  ],
};
afterEach(() => vi.unstubAllGlobals());

it("prioritizes recorded output and keeps compare and save accessible without empty diagnostic sections", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const element = document.createElement("div");
  const root = createRoot(element);
  const onRepeat = vi.fn();
  const onCompare = vi.fn();
  const onSave = vi.fn();
  try {
    await act(async () =>
      root.render(
        createElement(RunReview, {
          trace,
          running: false,
          onRepeat,
          onCompare,
          onSave,
          onRunner: vi.fn(),
          onInspect: vi.fn(),
        }),
      ),
    );
    expect(element.querySelector(".review-section")?.textContent).toContain("0");
    expect(element.textContent).not.toContain("No output was recorded");
    expect(element.textContent).not.toContain("No runtime issues");
    expect(element.textContent).not.toContain("No test checks");
    expect(element.querySelector(".run-findings")).toBeNull();
    const click = async (label: string) =>
      act(async () => {
        const button = [...element.querySelectorAll("button")].find(
          (item) => item.textContent?.trim() === label,
        );
        expect(button).toBeDefined();
        button?.click();
      });
    await click("Run again");
    await click("Compare runs");
    await click("Save test");
    expect(onRepeat).toHaveBeenCalledOnce();
    expect(onCompare).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount());
  }
});

it("offers resume instead of a new run at a suspended checkpoint and keeps pending checks expanded", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const element = document.createElement("div");
  const root = createRoot(element);
  const onRunner = vi.fn();
  try {
    await act(async () =>
      root.render(
        createElement(RunReview, {
          trace: {
            ...trace,
            spans: [
              {
                ...trace.spans[0],
                attributes: { ...trace.spans[0].attributes, "workflow.state": "suspended" },
              },
            ],
          },
          baseline: {
            name: "Expected output",
            traceId: "old",
            result: {
              status: "Completed",
              input: {},
              output: 0,
              duration: 10,
              tokens: undefined,
              tools: 0,
              settings: { root: {}, modelCalls: [] },
            },
            expectations: { outputIncludes: "answer" },
          },
          running: false,
          onRepeat: vi.fn(),
          onCompare: vi.fn(),
          onSave: vi.fn(),
          onRunner,
          onInspect: vi.fn(),
        }),
      ),
    );
    expect(element.querySelector(".review-primary")?.textContent).toBe("Resume workflow");
    expect(element.textContent).not.toContain("Run again");
    expect(element.querySelector<HTMLDetailsElement>(".run-checks")?.open).toBe(true);
    expect(element.querySelector(".run-check")?.textContent).toContain("pending");
    await act(async () => element.querySelector<HTMLButtonElement>(".review-primary")?.click());
    expect(onRunner).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount());
  }
});
