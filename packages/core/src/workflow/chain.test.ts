import { z } from "zod";
import { createWorkflowChain } from "./chain";

// Test schemas
const InputSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const ResultSchema = z.object({
  greeting: z.string(),
  isAdult: z.boolean(),
});

// Mock agent for testing
const mockAgent = {
  generateObject: async (_prompt: string, _schema: z.ZodTypeAny) => {
    return { object: { greeting: "Hello Test", isAdult: true } };
  },
} as any;

describe("WorkflowChain", () => {
  it("should create a chain with proper types", () => {
    const chain = createWorkflowChain({
      id: "test-workflow",
      name: "Test Workflow",
      purpose: "Test the chaining API",
      input: InputSchema,
      result: ResultSchema,
    });

    expect(chain).toBeDefined();
    expect(typeof chain.andAgent).toBe("function");
    expect(typeof chain.andThen).toBe("function");
    expect(typeof chain.andWhen).toBe("function");
    expect(typeof chain.andAll).toBe("function");
    expect(typeof chain.andRace).toBe("function");
    expect(typeof chain.run).toBe("function");
  });

  it("should chain steps with proper type inference", async () => {
    const chain = createWorkflowChain({
      id: "test-workflow",
      name: "Test Workflow",
      purpose: "Test the chaining API",
      input: InputSchema,
      result: ResultSchema,
    });

    const result = await chain
      .andAgent("Generate greeting", mockAgent, { schema: z.object({ greeting: z.string() }) })
      .andThen(async (data: any) => ({ ...data, isAdult: true }))
      .run({ name: "John", age: 25 });

    expect(result).toBeDefined();
    expect(result.status).toBe("completed");
  });

  it("should execute a simple chain", async () => {
    const chain = createWorkflowChain({
      id: "test-workflow",
      name: "Test Workflow",
      purpose: "Test the chaining API",
      input: InputSchema,
      result: ResultSchema,
    });

    const result = await chain
      .andThen(async (data: any) => ({ greeting: `Hello ${data.name}`, isAdult: data.age >= 18 }))
      .run({ name: "John", age: 25 });

    expect(result.status).toBe("completed");
    expect(result.result).toEqual({ greeting: "Hello John", isAdult: true });
  });
});
