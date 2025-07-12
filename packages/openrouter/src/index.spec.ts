import { describe, expect, it } from "vitest";
import { OpenRouterProvider } from "./index";

describe("OpenRouterProvider", () => {
  it("should initialize with default options", () => {
    const provider = new OpenRouterProvider();
    expect(provider).toBeInstanceOf(OpenRouterProvider);
  });

  it("should initialize with custom options", () => {
    const options = {
      apiKey: "test-key",
      baseURL: "https://custom.openrouter.ai/api/v1",
      httpReferer: "https://example.com",
      xTitle: "Test App",
    };

    const provider = new OpenRouterProvider(options);
    expect(provider).toBeInstanceOf(OpenRouterProvider);
  });

  it("should implement getModelIdentifier", () => {
    const provider = new OpenRouterProvider();
    const model = "openai/gpt-4o-mini";
    expect(provider.getModelIdentifier(model)).toBe(model);
  });
});
