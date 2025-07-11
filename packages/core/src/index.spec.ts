import { describe, it } from "vitest";
import { Agent as InternalAgent } from "./agent";
import { VoltAgent as InternalVoltAgent } from "./voltagent";

describe("exports", () => {
  it.todo("should have expected exports for all types", () => {
    // TODO: Add tests to make sure our main exports are ALWAYS available, and that we don't break them
  });

  it("should export the VoltAgent class as default", async () => {
    const defaultExport = await import("./index");
    expect(defaultExport.default).toBeDefined();
    expect(defaultExport.default).toBe(InternalVoltAgent);
  });

  it("should export the VoltAgent class", async () => {
    const { VoltAgent } = await import("./index");
    expect(VoltAgent).toBeDefined();
    expect(VoltAgent).toBe(InternalVoltAgent);
  });

  it("should export the Agent class", async () => {
    const { Agent } = await import("./index");
    expect(Agent).toBeDefined();
    expect(Agent).toBe(InternalAgent);
  });
});
