// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import { MemoryExplorer } from "./memory";
vi.mock("../lib/api", async (original) => ({
  ...(await original<typeof import("../lib/api")>()),
  api: vi.fn(),
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("opens server memory by user and conversation, then continues that identity in chat", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.mocked(api).mockImplementation(async (path) => {
    if (path.includes("/users?"))
      return { users: [{ userId: "user/1", conversationCount: 1 }], total: 1 };
    if (path.includes("/conversations?"))
      return {
        conversations: [
          { id: "chat/1", userId: "user/1", title: "Saved chat", updatedAt: "2026-01-01" },
        ],
        total: 1,
      };
    if (path.includes("/messages?"))
      return {
        messages: [
          { id: "m", role: "assistant", parts: [{ type: "text", text: "Remembered tea" }] },
        ],
      };
    if (path.includes("/working-memory?")) return { content: "Preference: tea", format: "text" };
    return { steps: [] };
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const element = document.createElement("div");
  const root = createRoot(element);
  const continueChat = vi.fn();
  const settle = async () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  const click = async (label: string) => {
    const button = [...element.querySelectorAll("button")].find((item) =>
      item.textContent?.includes(label),
    );
    expect(button).toBeTruthy();
    await act(async () => button?.click());
    await settle();
  };
  await act(async () =>
    root.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(MemoryExplorer, {
          entity: { id: "agent", name: "Agent" },
          onConversation: continueChat,
        }),
      ),
    ),
  );
  await settle();
  await click("user/1");
  await click("Saved chat");
  expect(element.textContent).toContain("Remembered tea");
  expect(
    vi
      .mocked(api)
      .mock.calls.some(
        ([path]) => path.includes("chat%2F1/messages") && path.includes("userId=user%2F1"),
      ),
  ).toBe(true);
  await click("working memory");
  expect(element.textContent).toContain("Preference: tea");
  await click("Continue in chat");
  expect(continueChat).toHaveBeenCalledWith({ userId: "user/1", conversationId: "chat/1" });
  await act(async () => root.unmount());
  client.clear();
});
