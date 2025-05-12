import { BaseRetriever, type BaseMessage } from "@voltagent/core";
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
   * @returns Promise resolving to a formatted context string
   */
  async retrieve(input: string | BaseMessage[]): Promise<string> {
    let searchText = "";

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

    const keywords = searchText.toLowerCase().split(/\s+/);

    const results = this.documents
      .map((doc) => {
        const content = doc.content.toLowerCase();

        // Calculate a simple score based on keyword matches
        const matchCount = keywords.filter((keyword: string) =>
          content.includes(keyword.toLowerCase()),
        ).length;

        const score = matchCount / keywords.length;

        return {
          content: doc.content,
          title: doc.title,
          source: doc.source,
          score,
        };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);

    // Format results as a context string
    if (results.length === 0) {
      return "No relevant information found.";
    }

    return results
      .map((doc, i) => {
        return `[${i + 1}] ${doc.content}\nSource: ${doc.title} (${doc.source})`;
      })
      .join("\n\n");
  }
}

// Create retriever instance
export const retriever = new SimpleRetriever(documents);
