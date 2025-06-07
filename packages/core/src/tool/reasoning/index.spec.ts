import { DEFAULT_INSTRUCTIONS, FEW_SHOT_EXAMPLES, createReasoningTools } from "./index";
// No need to import from 'jest' directly; it's usually globally available

// Mock the base tools using jest.mock
// Place mocks at the top level before imports if they mock modules used by the tested module itself,
// but here './index' doesn't directly use the mocked './tools' exports in its top-level code,
// so placing it before the describe block is fine.
jest.mock("./tools", () => ({
  thinkTool: { name: "think", description: "Think tool mock", parameters: {}, execute: jest.fn() },
  analyzeTool: {
    name: "analyze",
    description: "Analyze tool mock",
    parameters: {},
    execute: jest.fn(),
  },
}));

describe("createReasoningTools", () => {
  // Optional: Clear mocks before each test if needed, though not strictly necessary here
  // beforeEach(() => {
  //   jest.clearAllMocks();
  // });

  it("should create a toolkit with default options", () => {
    const toolkit = createReasoningTools();

    expect(toolkit.name).toBe("reasoning_tools");
    expect(toolkit.tools).toHaveLength(2);
    // Check if both tools are present (order doesn't matter)
    expect(toolkit.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "think" }),
        expect.objectContaining({ name: "analyze" }),
      ]),
    );
    expect(toolkit.addInstructions).toBe(true);
    expect(toolkit.instructions).toContain(DEFAULT_INSTRUCTIONS);
    expect(toolkit.instructions).toContain(FEW_SHOT_EXAMPLES);
    expect(toolkit.instructions?.startsWith("<reasoning_instructions>")).toBe(true);
    expect(toolkit.instructions?.endsWith("</reasoning_instructions>")).toBe(true);
  });

  it("should create a toolkit without instructions", () => {
    const toolkit = createReasoningTools({ addInstructions: false });

    expect(toolkit.tools).toHaveLength(2); // Still includes tools by default
    expect(toolkit.addInstructions).toBe(false);
    expect(toolkit.instructions).toBeUndefined();
  });

  it("should create a toolkit without the think tool", () => {
    const toolkit = createReasoningTools({ think: false });

    expect(toolkit.tools).toHaveLength(1);
    expect(toolkit.tools).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "analyze" })]),
    );
    // Ensure 'think' tool is NOT present
    expect(toolkit.tools).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "think" })]),
    );
    expect(toolkit.instructions).toBeDefined(); // Instructions are still added by default
  });

  it("should create a toolkit without the analyze tool", () => {
    const toolkit = createReasoningTools({ analyze: false });

    expect(toolkit.tools).toHaveLength(1);
    expect(toolkit.tools).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "think" })]),
    );
    // Ensure 'analyze' tool is NOT present
    expect(toolkit.tools).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "analyze" })]),
    );
    expect(toolkit.instructions).toBeDefined(); // Instructions are still added by default
  });

  it("should create a toolkit without few-shot examples", () => {
    const toolkit = createReasoningTools({ addFewShot: false });

    expect(toolkit.tools).toHaveLength(2);
    expect(toolkit.addInstructions).toBe(true);
    expect(toolkit.instructions).toBeDefined();
    expect(toolkit.instructions).toContain(DEFAULT_INSTRUCTIONS);
    expect(toolkit.instructions).not.toContain(FEW_SHOT_EXAMPLES);
    expect(toolkit.instructions?.startsWith("<reasoning_instructions>")).toBe(true);
    expect(toolkit.instructions?.endsWith("</reasoning_instructions>")).toBe(true);
  });

  it("should create a toolkit with custom few-shot examples", () => {
    const customExamples = "## Custom Example\n*Example content*";
    const toolkit = createReasoningTools({ fewShotExamples: customExamples });

    expect(toolkit.tools).toHaveLength(2);
    expect(toolkit.addInstructions).toBe(true);
    expect(toolkit.instructions).toBeDefined();
    expect(toolkit.instructions).toContain(DEFAULT_INSTRUCTIONS);
    expect(toolkit.instructions).toContain(customExamples);
    expect(toolkit.instructions).not.toContain(FEW_SHOT_EXAMPLES);
    expect(toolkit.instructions?.startsWith("<reasoning_instructions>")).toBe(true);
    expect(toolkit.instructions?.endsWith("</reasoning_instructions>")).toBe(true);
  });

  it("should create an empty toolkit when all creation options are false", () => {
    const toolkit = createReasoningTools({
      addInstructions: false,
      think: false,
      analyze: false,
      // addFewShot: false, // This won't have an effect if addInstructions is false
    });

    expect(toolkit.name).toBe("reasoning_tools");
    expect(toolkit.tools).toHaveLength(0);
    expect(toolkit.addInstructions).toBe(false);
    expect(toolkit.instructions).toBeUndefined();
  });

  it("should create toolkit without few-shot examples if addInstructions is false, even if addFewShot is true", () => {
    const toolkit = createReasoningTools({
      addInstructions: false,
      addFewShot: true, // Should be ignored because addInstructions is false
    });

    expect(toolkit.tools).toHaveLength(2); // Tools are still added
    expect(toolkit.addInstructions).toBe(false);
    expect(toolkit.instructions).toBeUndefined();
  });
});
