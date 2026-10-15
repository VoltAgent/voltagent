// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { BuildUpdate } from "./build-update";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("offers a manual reload only for a changed build, disabled during execution", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("__PLAYGROUND_BUILD_ID__", "loaded");
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "loaded" }) });
  vi.stubGlobal("fetch", fetch);
  const element = document.createElement("div");
  const root = createRoot(element);
  try {
    await act(async () => root.render(createElement(BuildUpdate, { running: true })));
    expect(element.textContent).toBe("");
    fetch.mockResolvedValue({ ok: true, json: async () => ({ id: "new" }) });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(element.textContent).toContain("A new playground version");
    expect(element.querySelector("button")?.disabled).toBe(true);
    expect(fetch).toHaveBeenLastCalledWith(
      "/build.json",
      expect.objectContaining({ cache: "no-store" }),
    );
    await act(async () => root.render(createElement(BuildUpdate, { running: false })));
    expect(element.querySelector("button")?.disabled).toBe(false);
  } finally {
    await act(async () => root.unmount());
  }
});
