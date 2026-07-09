import { describe, it } from "vitest";
import { Agent as InternalAgent } from "./agent";
import DefaultVoltAgent, { Agent, VoltAgent } from "./index";
import { VoltAgent as InternalVoltAgent } from "./voltagent";

describe("exports", () => {
  it.todo("should have expected exports for all types", () => {
    // TODO: Add tests to make sure our main exports are ALWAYS available, and that we don't break them
  });

  it("should export the VoltAgent class as default", () => {
    expect(DefaultVoltAgent).toBeDefined();
    expect(DefaultVoltAgent).toBe(InternalVoltAgent);
  });

  it("should export the VoltAgent class", () => {
    expect(VoltAgent).toBeDefined();
    expect(VoltAgent).toBe(InternalVoltAgent);
  });

  it("should export the Agent class", () => {
    expect(Agent).toBeDefined();
    expect(Agent).toBe(InternalAgent);
  });
});
