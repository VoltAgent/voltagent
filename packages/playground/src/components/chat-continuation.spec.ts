// @vitest-environment jsdom
import { safeStringify } from "@voltagent/internal";
import { type UIMessageChunk, createUIMessageStreamResponse } from "ai";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { RunDraft } from "../lib/test-cases";
import { Chat } from "./chat";
import { initialSettings } from "./settings";

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function response(chunks: UIMessageChunk[]) {
  return createUIMessageStreamResponse({
    stream: new ReadableStream<UIMessageChunk>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }),
  });
}

function toolsOnly(messageId: string): UIMessageChunk[] {
  return [
    { type: "start", messageId },
    ...[1, 2].flatMap((step): UIMessageChunk[] => [
      { type: "start-step" },
      {
        type: "tool-input-available",
        toolCallId: `${messageId}-${step}`,
        toolName: "ping_demo",
        input: {},
      },
      { type: "tool-output-available", toolCallId: `${messageId}-${step}`, output: "pong" },
      { type: "finish-step" },
    ]),
    { type: "finish", finishReason: "tool-calls" },
  ];
}

async function mountChat(draft?: RunDraft) {
  const onPendingAction = vi.fn();
  const onRun = vi.fn();
  const element = document.createElement("div");
  const root = createRoot(element);
  await act(async () => {
    root.render(
      createElement(Chat, {
        entity: {
          id: "step-limit",
          name: "Step limit",
          memory: draft ? { available: true } : undefined,
        },
        draft,
        onRunning: () => {},
        onRun,
        onPendingAction,
      }),
    );
  });
  const send = async (text: string) => {
    await act(async () => {
      const input = element.querySelector('textarea[aria-label="Message"]');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(
        input,
        text,
      );
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      element
        .querySelector("form")
        ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  };
  return { element, send, onPendingAction, onRun, unmount: () => act(async () => root.unmount()) };
}

it("ends a tools-only response after one request, including a follow-up turn", async () => {
  const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    // A broken auto-continuation must fail the assertion rather than hang this test forever.
    if (fetch.mock.calls.length > 2) return response([{ type: "finish", finishReason: "stop" }]);
    return response(toolsOnly(`assistant-${fetch.mock.calls.length}`));
  });
  vi.stubGlobal("fetch", fetch);
  const chat = await mountChat();
  try {
    await chat.send("First turn");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(chat.onPendingAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ pending: undefined }),
    );
    expect(chat.element.querySelectorAll(".tool-card")).toHaveLength(2);
    expect(chat.element.textContent).toContain("Run ended after tool calls");
    expect(chat.element.querySelector('[aria-label="Stop response"]')).toBeNull();

    await chat.send("Follow-up turn");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(chat.element.querySelectorAll(".tool-card")).toHaveLength(4);
    expect(chat.element.querySelector('[aria-label="Stop response"]')).toBeNull();
  } finally {
    await chat.unmount();
  }
});

it.each(["Approve", "Deny", "Submit result", "Decline"])(
  "%s allows one explicit continuation, then stops on server tool results",
  async (action) => {
    const approval = action === "Approve" || action === "Deny";
    const fetch = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
        if (fetch.mock.calls.length === 1)
          return response([
            { type: "start", messageId: "assistant" },
            { type: "start-step" },
            {
              type: "tool-input-available",
              toolCallId: "client-call",
              toolName: "client",
              input: {},
            },
            ...(approval
              ? [
                  {
                    type: "tool-approval-request" as const,
                    toolCallId: "client-call",
                    approvalId: "approval",
                  },
                ]
              : []),
            { type: "finish-step" },
            { type: "finish", finishReason: "tool-calls" },
          ]);
        if (fetch.mock.calls.length === 2) return response(toolsOnly("assistant"));
        return response([{ type: "finish", finishReason: "stop" }]);
      },
    );
    vi.stubGlobal("fetch", fetch);
    const chat = await mountChat();
    try {
      await chat.send("Request a tool");
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(chat.onPendingAction).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pending: approval
            ? { approval: ["client"], client: [] }
            : { approval: [], client: ["client"] },
        }),
      );
      expect(
        chat.element.querySelector('button[aria-label="Send message"]')?.hasAttribute("disabled"),
      ).toBe(true);
      const button = [...chat.element.querySelectorAll("button")].find(
        (element) => element.textContent === action,
      );
      expect(button).toBeDefined();
      await act(async () => button?.click());
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(chat.onRun).toHaveBeenCalledTimes(2);
      expect(chat.onPendingAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ pending: undefined }),
      );
      const body = JSON.parse(String(fetch.mock.calls[1][1]?.body));
      expect(safeStringify(body)).toContain(
        approval
          ? '"approval-responded"'
          : action === "Decline"
            ? '"output-error"'
            : '"output-available"',
      );
      expect(chat.element.querySelector('[aria-label="Stop response"]')).toBeNull();
    } finally {
      await chat.unmount();
    }
  },
);

vi.mock("./voice", () => ({ VoiceControls: () => null }));

it("sends an entire saved test request once, preserving context and overrides even with server memory", async () => {
  const fetch = vi.fn(async () =>
    response([
      { type: "start", messageId: crypto.randomUUID() },
      { type: "finish", finishReason: "stop" },
    ]),
  );
  vi.stubGlobal("fetch", fetch);
  const draft: RunDraft = {
    input: [
      { role: "user", content: "First" },
      { role: "assistant", content: "Reply" },
      { role: "user", content: "Second" },
    ],
    settings: {
      ...initialSettings(),
      userId: "isolated-user",
      conversationId: "isolated-case",
      context: '{"language":"tr"}',
      temperature: "0",
    },
    source: "request",
  };
  const chat = await mountChat(draft);
  try {
    expect(fetch).not.toHaveBeenCalled();
    const button = [...chat.element.querySelectorAll("button")].find(
      (item) => item.textContent === "Run test case",
    );
    expect(button).toBeDefined();
    await act(async () => button?.click());
    expect(fetch).toHaveBeenCalledTimes(1);
    const request = chat.onRun.mock.calls[0]?.[1];
    expect(request.input).toEqual(draft.input);
    expect(request.settings).toEqual(draft.settings);
    expect(chat.element.querySelector<HTMLFormElement>("form.composer")?.hidden).toBe(false);
    await chat.send("Follow up");
    expect(chat.onRun.mock.calls[1]?.[1].input).not.toEqual(draft.input);
    expect(chat.onRun.mock.calls[1]?.[1].input).toHaveLength(1);
  } finally {
    await chat.unmount();
  }
});

it("retries a failed saved request with its original input, not the visible case marker", async () => {
  const fetch = vi.fn(async () =>
    response([
      { type: "start", messageId: crypto.randomUUID() },
      { type: "error", errorText: "Provider unavailable" },
    ]),
  );
  vi.stubGlobal("fetch", fetch);
  const draft: RunDraft = {
    input: [{ role: "user", content: "Original request" }],
    settings: initialSettings(),
    source: "request",
  };
  const chat = await mountChat(draft);
  try {
    const find = (label: string) =>
      [...chat.element.querySelectorAll("button")].find((item) => item.textContent === label);
    await act(async () => find("Run test case")?.click());
    expect(find("Retry last message")).toBeDefined();
    await act(async () => find("Retry last message")?.click());
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(chat.onRun.mock.calls.map((call) => call[1].input)).toEqual([draft.input, draft.input]);
  } finally {
    await chat.unmount();
  }
});
