import { describe, expect, it, vi } from "vitest";

vi.mock("@tenkicloud/sandbox", () => ({
  TenkiSandbox: class {},
  CommandTimeoutError: class extends Error {},
}));

import * as api from "./index";

describe("public API", () => {
  it("re-exports the adapter and toolkit factory", () => {
    expect(typeof api.TenkiSandbox).toBe("function");
    expect(typeof api.createTenkiToolkit).toBe("function");
  });
});
