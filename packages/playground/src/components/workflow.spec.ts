// @vitest-environment jsdom
import { safeStringify } from "@voltagent/internal";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { RunTarget, WorkflowState } from "../lib/api";
import type { RunDraft } from "../lib/test-cases";
import { initialSettings } from "./settings";
import { WorkflowRunner } from "./workflow";

vi.mock("./monaco-json", () => ({
  default: ({
    value,
    onChange,
    label,
  }: { value: string; onChange: (value: string) => void; label: string }) =>
    createElement("textarea", {
      "aria-label": label,
      className: label === "Input · JSON" ? "json-input" : "",
      value,
      onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    }),
}));

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mountRunner(
  snapshot: WorkflowState,
  draft?: RunDraft,
  options: {
    restoreSaved?: boolean;
    stepId?: string;
    restore?: () => Promise<Response>;
    onExecution?: (identity: RunTarget) => void;
  } = {},
) {
  const onRun = vi.fn();
  const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      return new Response(
        `data: ${safeStringify({ type: "workflow-result", result: false, status: "completed" })}\n\n`,
        { headers: { "Content-Type": "text/event-stream" } },
      );
    }
    if (_url.endsWith("/stream"))
      return new Response("", { headers: { "Content-Type": "text/event-stream" } });
    if (options.restore) return options.restore();
    return new Response(safeStringify({ data: snapshot }));
  });
  vi.stubGlobal("fetch", fetch);
  const element = document.createElement("div");
  const root = createRoot(element);
  await act(async () =>
    root.render(
      createElement(WorkflowRunner, {
        entity: {
          id: "workflow",
          name: "Workflow",
          steps: options.stepId ? [{ id: options.stepId, name: "Review", type: "func" }] : [],
          inputSchema: { type: "object" },
        },
        target: options.restoreSaved
          ? undefined
          : draft
            ? {}
            : { executionId: "previous-run", stepId: options.stepId },
        draft,
        onRun,
        onRunning: () => {},
        onExecution: options.onExecution,
      }),
    ),
  );
  const click = async (label: string) => {
    const button = [...element.querySelectorAll("button")].find(
      (item) => item.textContent?.trim() === label,
    );
    expect(button, label).toBeDefined();
    await act(async () => button?.click());
  };
  const edit = async (value: string) => {
    const input = element.querySelector("textarea.json-input");
    expect(input).not.toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(
        input,
        value,
      );
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  return { element, fetch, onRun, click, edit, unmount: () => act(async () => root.unmount()) };
}

it("keeps the previous result and recorded input separate from a new draft until Run is pressed", async () => {
  const ui = await mountRunner({ status: "completed", input: { city: "Istanbul" }, output: 0 });
  try {
    expect(ui.element.querySelector(".workflow-result")?.textContent).toContain("0");
    expect(ui.element.querySelector("textarea.json-input")).toBeNull();
    const requests = ui.fetch.mock.calls.length;
    await ui.click("New run");
    await ui.edit('{"city":"Ankara"}');
    expect(ui.element.querySelector(".workflow-result")).toBeNull();
    expect(ui.onRun).not.toHaveBeenCalled();
    expect(ui.fetch).toHaveBeenCalledTimes(requests);
    await ui.click("Back to result");
    expect(ui.element.querySelector(".run-input")?.textContent).toContain("Istanbul");
    expect(ui.element.querySelector(".run-input")?.textContent).not.toContain("Ankara");
    await ui.click("New run");
    expect(ui.element.querySelector<HTMLTextAreaElement>("textarea.json-input")?.value).toContain(
      "Ankara",
    );
    await ui.click("Run workflow");
    expect(ui.onRun).toHaveBeenCalledTimes(1);
    const post = ui.fetch.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body)).input).toEqual({ city: "Ankara" });
    expect(ui.element.querySelector("textarea.json-input")).toBeNull();
    expect(ui.element.querySelector(".workflow-result")?.textContent).toContain("false");
    expect(ui.element.querySelector(".run-input")?.textContent).toContain("Ankara");
  } finally {
    await ui.unmount();
  }
});

it("discards a missing automatically restored execution and does not retry it on remount", async () => {
  localStorage.setItem("voltagent.playground.execution.workflow", '"expired-run"');
  const restore = vi.fn(
    async () =>
      new Response(safeStringify({ success: false, error: "Execution not found" }), {
        status: 404,
      }),
  );
  const options = { restoreSaved: true, restore };
  const ui = await mountRunner({ status: "completed" }, undefined, options);
  try {
    expect(ui.element.querySelector('[role="alert"]')).toBeNull();
    expect(ui.element.querySelector("textarea.json-input")).not.toBeNull();
    expect(localStorage.getItem("voltagent.playground.execution.workflow")).toBe('""');
  } finally {
    await ui.unmount();
  }
  const reopened = await mountRunner({ status: "completed" }, undefined, options);
  try {
    expect(reopened.fetch).not.toHaveBeenCalled();
  } finally {
    await reopened.unmount();
  }
});

it.each([503, "offline"] as const)(
  "keeps the saved execution and reports a temporary restoration failure (%s)",
  async (failure) => {
    localStorage.setItem("voltagent.playground.execution.workflow", '"saved-run"');
    const ui = await mountRunner({ status: "completed" }, undefined, {
      restoreSaved: true,
      restore: async () => {
        if (failure === "offline") throw new TypeError("Failed to fetch");
        return new Response(safeStringify({ error: "API unavailable" }), { status: failure });
      },
    });
    try {
      expect(ui.element.querySelector('[role="alert"]')?.textContent).toContain(
        "Previous execution unavailable",
      );
      expect(localStorage.getItem("voltagent.playground.execution.workflow")).toBe('"saved-run"');
    } finally {
      await ui.unmount();
    }
  },
);

it("still explains a missing execution explicitly selected from recent runs", async () => {
  localStorage.setItem("voltagent.playground.execution.workflow", '"other-saved-run"');
  const ui = await mountRunner({ status: "completed" }, undefined, {
    restore: async () =>
      new Response(safeStringify({ error: "Execution not found" }), { status: 404 }),
  });
  try {
    expect(ui.element.querySelector('[role="alert"]')?.textContent).toContain(
      "Execution not found",
    );
    expect(localStorage.getItem("voltagent.playground.execution.workflow")).toBe(
      '"other-saved-run"',
    );
  } finally {
    await ui.unmount();
  }
});

it("restores an available saved execution on page reload", async () => {
  localStorage.setItem("voltagent.playground.execution.workflow", '"saved-run"');
  const onExecution = vi.fn();
  const ui = await mountRunner(
    { status: "completed", input: { city: "Istanbul" }, output: "Saved result" },
    undefined,
    { restoreSaved: true, onExecution },
  );
  try {
    expect(ui.element.querySelector(".workflow-result")?.textContent).toContain("Saved result");
    expect(onExecution).toHaveBeenCalledWith({ executionId: "saved-run" });
  } finally {
    await ui.unmount();
  }
});

it("ignores a restoration response arriving after leaving the workflow", async () => {
  let finish: (response: Response) => void = () => {};
  const response = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  const onExecution = vi.fn();
  const ui = await mountRunner({ status: "completed" }, undefined, {
    restore: () => response,
    onExecution,
  });
  await ui.unmount();
  await act(async () => finish(new Response(safeStringify({ data: { status: "completed" } }))));
  expect(onExecution).not.toHaveBeenCalled();
});

it("keeps an invalid new input editable without replacing the prior execution", async () => {
  const ui = await mountRunner({ status: "completed", input: { city: "Istanbul" }, output: null });
  try {
    await ui.click("New run");
    await ui.edit("{");
    await ui.click("Run workflow");
    expect(ui.onRun).not.toHaveBeenCalled();
    expect(ui.element.querySelector("textarea.json-input")).not.toBeNull();
    expect(ui.element.querySelector('[role="alert"]')).not.toBeNull();
    await ui.click("Back to result");
    expect(ui.element.querySelector(".run-input")?.textContent).toContain("Istanbul");
    expect(ui.element.querySelector(".workflow-result")?.textContent).toContain("null");
  } finally {
    await ui.unmount();
  }
});

it("can prepare another run while preserving a suspended execution and its resume controls", async () => {
  const ui = await mountRunner({ status: "suspended", input: { city: "Istanbul" }, events: [] });
  try {
    await ui.click("New run");
    expect(ui.element.querySelector("textarea.json-input")).not.toBeNull();
    await ui.click("Back to result");
    expect(ui.element.textContent).toContain("Waiting to resume");
    const resume = [...ui.element.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "Resume",
    );
    expect(resume?.disabled).toBe(false);
    expect(ui.fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
    await ui.click("New run");
    await ui.click("Run workflow");
    const posts = ui.fetch.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(posts[0][0]).toBe("/api/workflows/workflow/stream");
  } finally {
    await ui.unmount();
  }
});

it("prepares a saved workflow case without restoring an old execution or making a request until Run", async () => {
  localStorage.setItem("voltagent.playground.input.workflow", '"stale input"');
  const draft: RunDraft = {
    input: false,
    settings: {
      ...initialSettings(),
      userId: "test-user",
      conversationId: "test-conversation",
      context: '{"test":true}',
    },
    source: "request",
  };
  const ui = await mountRunner({ status: "completed" }, draft);
  try {
    expect(ui.fetch).not.toHaveBeenCalled();
    expect(ui.element.querySelector<HTMLTextAreaElement>("textarea.json-input")?.value).toBe(
      "false",
    );
    await ui.click("Run workflow");
    expect(ui.fetch).toHaveBeenCalledTimes(1);
    const post = ui.fetch.mock.calls[0];
    expect(JSON.parse(String(post[1]?.body))).toEqual({
      input: false,
      options: {
        userId: "test-user",
        conversationId: "test-conversation",
        context: { test: true },
      },
    });
    expect(ui.onRun).toHaveBeenCalledWith(undefined, draft);
  } finally {
    await ui.unmount();
  }
});

it("opens the selected step's replay form without starting another execution", async () => {
  const ui = await mountRunner(
    { status: "completed", input: { message: "Review ticket" } },
    undefined,
    { stepId: "review" },
  );
  try {
    const replay = ui.element.querySelector<HTMLDetailsElement>(".replay-form");
    expect(replay?.open).toBe(true);
    expect(replay?.parentElement?.closest("details")?.open).toBe(true);
    expect(replay?.querySelector("select")?.value).toBe("review");
    expect(ui.fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  } finally {
    await ui.unmount();
  }
});
