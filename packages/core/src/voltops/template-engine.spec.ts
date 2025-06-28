import { vi, describe, expect, it, beforeEach } from "vitest";
import { createSimpleTemplateEngine, type TemplateEngine } from "./template-engine";

describe("Template Engine", () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = createSimpleTemplateEngine();
  });

  describe("createSimpleTemplateEngine", () => {
    it("should create template engine with correct name", () => {
      expect(engine.name).toBe("simple");
    });

    it("should have process method", () => {
      expect(typeof engine.process).toBe("function");
    });
  });

  describe("process method", () => {
    it("should replace single variable", () => {
      const content = "Hello {{name}}!";
      const variables = { name: "John" };
      const result = engine.process(content, variables);

      expect(result).toBe("Hello John!");
    });

    it("should replace multiple variables", () => {
      const content = "Hello {{name}}, welcome to {{company}}!";
      const variables = { name: "John", company: "Acme Corp" };
      const result = engine.process(content, variables);

      expect(result).toBe("Hello John, welcome to Acme Corp!");
    });

    it("should handle variables with whitespace", () => {
      const content = "Hello {{ name }}, welcome to {{  company  }}!";
      const variables = { name: "John", company: "Acme Corp" };
      const result = engine.process(content, variables);

      expect(result).toBe("Hello John, welcome to Acme Corp!");
    });

    it("should handle missing variables by leaving placeholder", () => {
      const content = "Hello {{name}}, welcome to {{missing}}!";
      const variables = { name: "John" };
      const result = engine.process(content, variables);

      expect(result).toBe("Hello John, welcome to {{missing}}!");
    });

    it("should handle empty variables object", () => {
      const content = "Hello {{name}}!";
      const variables = {};
      const result = engine.process(content, variables);

      expect(result).toBe("Hello {{name}}!");
    });

    it("should handle content without variables", () => {
      const content = "Hello world!";
      const variables = { name: "John" };
      const result = engine.process(content, variables);

      expect(result).toBe("Hello world!");
    });

    it("should convert non-string values to strings", () => {
      const content = "Count: {{count}}, Active: {{active}}";
      const variables = { count: 42, active: true };
      const result = engine.process(content, variables);

      expect(result).toBe("Count: 42, Active: true");
    });

    it("should handle nested object values", () => {
      const content = "User: {{user}}, Config: {{config}}";
      const variables = {
        user: { name: "John", age: 30 },
        config: { theme: "dark" },
      };
      const result = engine.process(content, variables);

      expect(result).toBe("User: [object Object], Config: [object Object]");
    });

    it("should handle multiple occurrences of same variable", () => {
      const content = "{{name}} said hello. {{name}} is happy.";
      const variables = { name: "John" };
      const result = engine.process(content, variables);

      expect(result).toBe("John said hello. John is happy.");
    });

    it("should handle special regex characters in variable values", () => {
      const content = "Pattern: {{pattern}}";
      const variables = { pattern: "$1.50 (special)" };
      const result = engine.process(content, variables);

      expect(result).toBe("Pattern: $1.50 (special)");
    });
  });
});
