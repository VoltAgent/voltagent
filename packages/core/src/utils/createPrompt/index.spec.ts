import { createPrompt } from "./index";

describe("createPrompt", () => {
  it("should create a prompt with default variables", () => {
    const prompt = createPrompt({
      template: "Hello, {{name}}! Your role is {{role}}.",
      variables: { name: "World", role: "tester" },
    });
    expect(prompt()).toBe("Hello, World! Your role is tester.");
  });

  it("should override default variables with custom variables", () => {
    const prompt = createPrompt({
      template: "Hello, {{name}}! Your role is {{role}}.",
      variables: { name: "World", role: "tester" },
    });
    const customVariables = { name: "Developer" };
    expect(prompt(customVariables)).toBe("Hello, Developer! Your role is tester.");
  });

  it("should handle custom variables when no defaults are provided", () => {
    const prompt = createPrompt({
      template: "Task: {{task}}, Status: {{status}}",
      variables: { task: "Coding", status: "In Progress" },
    });
    const customVariables = { task: "Coding", status: "In Progress" };
    expect(prompt(customVariables)).toBe("Task: Coding, Status: In Progress");
  });

  it("should handle missing variables by replacing with an empty string", () => {
    const prompt = createPrompt({
      template: "Hello, {{name}}! Age: {{age}}",
      variables: { name: "Test", age: "" },
    });
    expect(prompt()).toBe("Hello, Test! Age: ");
  });

  it("should handle variables of different types (number, boolean)", () => {
    const prompt = createPrompt({
      template: "Value: {{val}}, Active: {{isActive}}",
      variables: { val: 123, isActive: true },
    });
    const customVariables = { val: 123, isActive: true };
    expect(prompt(customVariables)).toBe("Value: 123, Active: true");
  });

  it("should return the template string if no variables are present", () => {
    const prompt = createPrompt({
      template: "This is a static template.",
    });
    expect(prompt()).toBe("This is a static template.");
  });

  it("should handle templates with no variables even if variables are provided", () => {
    const prompt = createPrompt({
      template: "Static text.",
      variables: { unused: "value" } as never,
    });
    expect(prompt({ another: "ignored" })).toBe("Static text.");
  });

  it("should handle empty template string", () => {
    const prompt = createPrompt({
      template: "",
      variables: { key: "value" } as never,
    });
    expect(prompt()).toBe("");
  });

  it("should handle multiple occurrences of the same variable", () => {
    const prompt = createPrompt({
      template: "{{thing}} is {{thing}}.",
      variables: { thing: "Good" },
    });
    expect(prompt()).toBe("Good is Good.");
  });

  it("should trim whitespace within variable placeholders", () => {
    const prompt = createPrompt({
      template: "Value is {{  myVar  }}.",
      variables: { myVar: "42" } as never,
    });
    expect(prompt()).toBe("Value is 42.");
  });

  it("should handle undefined and null values in variables gracefully (as empty strings)", () => {
    const prompt = createPrompt({
      template: "Name: {{name}}, Role: {{role}}",
      variables: { name: undefined, role: null },
    });
    expect(prompt()).toBe("Name: , Role: ");
  });
});
