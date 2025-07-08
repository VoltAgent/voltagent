import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { andAgent } from "./and-agent";

// Minimal mock Agent implementation
const createMockAgent = (returnValue: any) => ({
  id: "mock",
  name: "Mock Agent",
  description: "",
  instructions: "",
  llm: {} as any,
  model: "" as any,
  hooks: {} as any,
  memoryManager: {} as any,
  toolManager: {} as any,
  subAgentManager: {} as any,
  historyManager: {} as any,
  generateObject: vi.fn().mockResolvedValue({ object: returnValue }),
});

describe("andAgent", () => {
  it("should create an agent step with proper type", () => {
    const mockAgent = createMockAgent({ role: "user" });
    const schema = z.object({ role: z.string() });
    const step = andAgent(mockAgent, { schema });
    expect(step).toBeDefined();
    expect(step.type).toBe("agent");
    expect(typeof step.execute).toBe("function");
    expect(step.agent).toBe(mockAgent);
  });

  it("should execute the agent with input data", async () => {
    const mockAgent = createMockAgent({ role: "admin", permissions: ["read", "write"] });
    const schema = z.object({ role: z.string(), permissions: z.array(z.string()) });
    const step = andAgent(mockAgent, { schema });
    const result = await step.execute({ name: "John", age: 25 });
    expect(mockAgent.generateObject).toHaveBeenCalledWith(
      expect.stringContaining("# Input Data"),
      schema,
    );
    expect(result).toEqual({ role: "admin", permissions: ["read", "write"] });
  });

  it("should handle agent errors", async () => {
    const mockAgent = createMockAgent({});
    mockAgent.generateObject.mockRejectedValueOnce(new Error("Agent error"));
    const schema = z.object({ result: z.string() });
    const step = andAgent(mockAgent, { schema });
    await expect(step.execute({ test: "data" })).rejects.toThrow("Agent error");
  });
});
