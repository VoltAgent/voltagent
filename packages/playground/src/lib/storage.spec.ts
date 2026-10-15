// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { initialSettings } from "../components/settings";
import { useStoredState } from "./storage";

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("keeps the generated conversation ID across remounts without editing settings", async () => {
  const ids: string[] = [];
  function Conversation() {
    const [settings] = useStoredState("conversation-test", initialSettings());
    ids.push(settings.conversationId);
    return null;
  }
  for (let mount = 0; mount < 2; mount++) {
    const root = createRoot(document.createElement("div"));
    await act(async () => {
      root.render(createElement(Conversation));
    });
    await act(async () => {
      root.unmount();
    });
  }
  expect(ids).toHaveLength(2);
  expect(ids[1]).toBe(ids[0]);
});

it("keeps settings usable when browser storage is unavailable", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Quota exceeded");
  });
  let change: (value: string) => void = () => {};
  let current = "";
  function Settings() {
    const [value, update] = useStoredState("unavailable-test", "initial");
    current = value;
    change = update;
    return null;
  }
  const root = createRoot(document.createElement("div"));
  await act(async () => {
    root.render(createElement(Settings));
  });
  await act(async () => {
    change("updated");
  });
  expect(current).toBe("updated");
  await act(async () => {
    root.unmount();
  });
});
