import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { andAgent } from "./and-agent";
import type { Agent } from "../../agent";
import type { DangerouslyAllowAny } from "@voltagent/internal/types";

// Type-safe mock Agent implementation
const createMockAgent = (returnValue: any): Agent<{ llm: DangerouslyAllowAny }> => {
  const mockGenerateObject = vi.fn().mockResolvedValue({ object: returnValue });
  return {
    generateObject: mockGenerateObject,
  } as Partial<Agent<{ llm: DangerouslyAllowAny }>> as Agent<{ llm: DangerouslyAllowAny }>;
};

describe("andAgent", () => {
  it("should create an agent step with proper type", () => {
    const mockAgent = createMockAgent({ role: "user" });
    const schema = z.object({ role: z.string() });
    const step = andAgent("Generate user role", mockAgent, { schema });
    expect(step).toBeDefined();
    expect(step.type).toBe("agent");
    expect(typeof step.execute).toBe("function");
    expect(step.agent).toBe(mockAgent);
  });

  it("should execute the agent with input data", async () => {
    const mockAgent = createMockAgent({ role: "admin", permissions: ["read", "write"] });
    const schema = z.object({ role: z.string(), permissions: z.array(z.string()) });
    const step = andAgent("Generate user permissions", mockAgent, { schema });
    const result = await step.execute({ name: "John", age: 25 });
    expect(mockAgent.generateObject).toHaveBeenCalledWith(
      "Generate user permissions",
      schema,
      expect.any(Object),
    );
    expect(result).toEqual({
      role: "admin",
      permissions: ["read", "write"],
      _input: { name: "John", age: 25 },
    });
  });

  it("should handle agent errors", async () => {
    const mockAgent = createMockAgent({});
    vi.mocked(mockAgent.generateObject).mockRejectedValueOnce(new Error("Agent error"));
    const schema = z.object({ result: z.string() });
    const step = andAgent("Generate result", mockAgent, { schema });
    await expect(step.execute({ test: "data" })).rejects.toThrow("Agent error");
  });
});
