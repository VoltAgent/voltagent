import { type BaseMessage, BaseRetriever, type RetrieveOptions } from "@voltagent/core";
import { documents } from "../data/documents.js";

/**
 * A simple retriever implementation for document retrieval.
 * This retriever works with a predefined set of documents and performs
 * basic keyword matching for retrieval.
 */
export class SimpleRetriever extends BaseRetriever {
  /**
   * Pre-defined documents to search through
   */
  private documents: Array<{
    content: string;
    title: string;
    source: string;
  }>;

  /**
   * Constructor for the SimpleRetriever
   * @param options - Configuration options for the retriever
   */
  constructor(docs: typeof documents) {
    super({});
    this.documents = docs.map((doc) => ({
      content: doc.content,
      title: doc.title,
      source: doc.source,
    }));
  }

  /**
   * Retrieve documents based on keyword matching with the input
   * @param input - The input to use for retrieval (string or BaseMessage[])
   * @param options - Configuration and context for the retrieval
   * @returns Promise resolving to a formatted context string
   */
  async retrieve(input: string | BaseMessage[], options: RetrieveOptions): Promise<string> {
    // Convert input to searchable string
    let searchText = "";

    options.logger?.debug("selam");

    if (typeof input === "string") {
      searchText = input;
    } else if (Array.isArray(input) && input.length > 0) {
      const lastMessage = input[input.length - 1];

      // Handle content as array of content parts with text type
      if (Array.isArray(lastMessage.content)) {
        const textParts = lastMessage.content
          .filter((part: any) => part.type === "text")
          .map((part: any) => part.text);

        searchText = textParts.join(" ");
      } else {
        // Fallback to string content
        searchText = lastMessage.content as string;
      }
    }

    // Simple keyword-based search
    const searchTerms = searchText.toLowerCase().split(/\s+/);
    const matchedDocs = this.documents.filter((doc) => {
      const content = doc.content.toLowerCase();
      return searchTerms.some((term) => content.includes(term));
    });

    // Add references to userContext if available
    if (options.userContext) {
      const references = [
        {
          id: "doc-1",
          title: "VoltAgent Usage Guide",
          source: "Official Documentation",
        },
        {
          id: "doc-2",
          title: "API Reference",
          source: "Technical Documentation",
        },
        {
          id: "doc-3",
          title: "Example Projects",
          source: "GitHub Repository",
        },
      ];

      options.userContext.set("references", references);
    }

    // Return the concatenated content for the LLM
    if (matchedDocs.length === 0) {
      return "No relevant documents found for the query.";
    }

    return matchedDocs.map((doc) => `Title: ${doc.title}\nContent: ${doc.content}`).join("\n\n");
  }
}

// Create retriever instance
export const retriever = new SimpleRetriever(documents);
