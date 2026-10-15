// @vitest-environment jsdom
import { type ComponentProps, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { PresentationNode } from "./presentation-node";
import { SpanNodeContext } from "./span-node";
vi.mock("@xyflow/react", () => ({
  Handle: () => null,
  Position: { Left: "left", Right: "right" },
}));

it("opens the resume runner without bubbling into canvas selection", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const select = vi.fn();
  const resume = vi.fn();
  const element = document.createElement("div");
  const root = createRoot(element);
  const span = { spanId: "root" };
  await act(async () =>
    root.render(
      createElement(
        "div",
        { onClick: select },
        createElement(
          SpanNodeContext.Provider,
          { value: { onSelect: select, onWorkflowAction: resume } },
          createElement(PresentationNode, {
            data: {
              label: "Workflow paused",
              kind: "pause",
              status: "suspended",
              detail: { reason: "Review" },
              sourceSpan: span,
            },
          } as unknown as ComponentProps<typeof PresentationNode>),
        ),
      ),
    ),
  );
  const button = [...element.querySelectorAll("button")].find(
    (item) => item.textContent === "Resume workflow",
  );
  expect(button).toBeTruthy();
  await act(async () => button?.click());
  expect(resume).toHaveBeenCalledExactlyOnceWith(span);
  expect(select).not.toHaveBeenCalled();
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});
