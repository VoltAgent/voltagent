import type { BaseMessage } from "../agent/providers/base/types";
import { BaseRetriever } from "./retriever";
import * as toolsModule from "./tools";
import type { RetrieverOptions } from "./types";

// Mock the createRetrieverTool function
jest.mock("./tools", () => ({
  createRetrieverTool: jest.fn().mockReturnValue({
    name: "mock_tool",
    description: "Mock tool description",
    execute: jest.fn(),
  }),
}));

// Create a concrete implementation of the abstract BaseRetriever class for testing
class TestRetriever extends BaseRetriever {
  public testResults = "test content";

  async retrieve(_text: string | BaseMessage[]): Promise<string> {
    // Simple implementation that returns predefined results
    return this.testResults;
  }

  // Expose protected options for testing
  getOptions(): RetrieverOptions {
    return this.options;
  }
}

describe("BaseRetriever", () => {
  let retriever: TestRetriever;
  const defaultOptions: RetrieverOptions = {};
  const customOptions: RetrieverOptions = {
    toolName: "custom_search",
    toolDescription: "Custom search description",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with default options", () => {
    retriever = new TestRetriever();
    expect(retriever.getOptions()).toEqual(defaultOptions);
    expect(toolsModule.createRetrieverTool).toHaveBeenCalledWith(expect.any(TestRetriever), {
      name: "search_knowledge",
      description: "Searches for relevant information in the knowledge base based on the query.",
    });
  });

  it("should initialize with custom options", () => {
    retriever = new TestRetriever(customOptions);
    expect(retriever.getOptions()).toEqual(customOptions);
    expect(toolsModule.createRetrieverTool).toHaveBeenCalledWith(expect.any(TestRetriever), {
      name: "custom_search",
      description: "Custom search description",
    });
  });

  it("should expose a tool property", () => {
    retriever = new TestRetriever();
    expect(retriever.tool).toBeDefined();
    // The actual tool value is mocked by jest.mock above
  });

  it("should maintain binding when retrieve is called via destructuring", async () => {
    retriever = new TestRetriever();

    // Destructure the retrieve method
    const { retrieve } = retriever;

    // Call the destructured method
    const results = await retrieve("test query");

    // Verify it returns the expected results
    expect(results).toEqual(retriever.testResults);
  });

  it("should call original retrieve method with correct context", async () => {
    retriever = new TestRetriever();

    // Spy on the retrieve method
    const retrieveSpy = jest.spyOn(retriever, "retrieve");

    // Call retrieve
    await retriever.retrieve("test query");

    // Verify the spy was called with the correct arguments
    expect(retrieveSpy).toHaveBeenCalledWith("test query");
  });
});
