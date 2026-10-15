// @vitest-environment jsdom
import { safeStringify } from "@voltagent/internal";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Chat } from "../components/chat";
import { initialSettings } from "../components/settings";
import { WorkflowRunner } from "../components/workflow";
import { writeStoredState } from "./storage";

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("reconnects a configured chat without memory and tolerates the API's no-active-stream response", async () => {
  writeStoredState("settings.agent.agent", {
    ...initialSettings(),
    userId: "user",
    conversationId: "conversation",
    resumableStream: "on",
  });
  const fetch = vi.fn().mockImplementation(async () => new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  const root = createRoot(document.createElement("div"));
  await act(async () => {
    root.render(
      createElement(Chat, {
        entity: { id: "agent", name: "Agent" },
        onRunning: () => {},
        onRun: () => {},
      }),
    );
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(String(fetch.mock.calls[0][0])).toBe(
    "/api/agents/agent/chat/conversation/stream?userId=user",
  );
  await act(async () => root.unmount());
});

it("loads selected chat history and does not switch back to the last saved conversation", async () => {
  writeStoredState("settings.agent.agent", {
    ...initialSettings(),
    userId: "latest-user",
    conversationId: "latest",
  });
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      safeStringify({
        success: true,
        data: {
          messages: [
            {
              id: "message",
              role: "user",
              parts: [{ type: "text", text: "Historical message" }],
            },
          ],
        },
      }),
      { headers: { "content-type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fetch);
  const element = document.createElement("div");
  const root = createRoot(element);
  await act(async () => {
    root.render(
      createElement(Chat, {
        entity: { id: "agent", name: "Agent", memory: { available: true } },
        target: { conversationId: "selected", userId: "selected-user" },
        onRunning: () => {},
        onRun: () => {},
      }),
    );
  });
  expect(element.textContent).toContain("Historical message");
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(String(fetch.mock.calls[0][0])).toContain(
    "/conversations/selected/messages?userId=selected-user&agentId=agent",
  );
  expect(localStorage.getItem("voltagent.playground.settings.agent.agent")).toContain(
    '"conversationId":"selected"',
  );
  await act(async () => root.unmount());
});

it("restores the explicitly selected workflow execution instead of the last one in storage", async () => {
  writeStoredState("execution.workflow", "latest-execution");
  const fetch = vi.fn().mockImplementation(
    async () =>
      new Response(
        safeStringify({
          success: true,
          data: {
            status: "completed",
            input: { city: "Historical city" },
            events: [{ type: "step-start", from: "step", input: { selected: true } }],
          },
        }),
        { headers: { "content-type": "application/json" } },
      ),
  );
  vi.stubGlobal("fetch", fetch);
  const element = document.createElement("div");
  const root = createRoot(element);
  await act(async () => {
    root.render(
      createElement(WorkflowRunner, {
        entity: { id: "workflow", name: "Workflow", steps: [{ id: "step", type: "func" }] },
        target: { executionId: "selected-execution", stepId: "step" },
        onRunning: () => {},
        onRun: () => {},
      }),
    );
  });
  expect(
    fetch.mock.calls.every(([url]) => String(url).includes("/executions/selected-execution/state")),
  ).toBe(true);
  expect(element.textContent).toContain("selected-execution");
  expect(element.querySelector(".run-input")?.textContent).toContain("Historical city");
  expect(element.querySelector('textarea[aria-label="Input · JSON"]')).toBeNull();
  await act(async () => root.unmount());
});

vi.mock("../components/voice", () => ({ VoiceControls: () => null }));
