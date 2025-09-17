import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
import { type BaseMessage, BaseRetriever, type RetrieveOptions } from "@voltagent/core";
import { ChromaClient, CloudClient, type Metadata, type QueryRowResult } from "chromadb";

// Initialize Chroma client - supports both local and cloud
const chromaClient = process.env.CHROMA_API_KEY
  ? new CloudClient() // Uses CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE env vars
  : new ChromaClient({
      host: process.env.CHROMA_HOST || "localhost",
      port: Number.parseInt(process.env.CHROMA_PORT || "8000"),
    });

const embeddingFunction = new OpenAIEmbeddingFunction({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small",
});

const collectionName = "voltagent-knowledge-base";

// Initialize collection with some sample documents
async function initializeCollection() {
  try {
    const collection = await chromaClient.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: embeddingFunction,
    });

    // Add some sample documents to get started
    const sampleDocuments = [
      "VoltAgent is a TypeScript framework for building AI agents with modular components.",
      "Chroma is an AI-native open-source vector database that handles embeddings automatically.",
      "Vector databases store high-dimensional vectors and enable semantic search capabilities.",
      "Retrieval-Augmented Generation (RAG) combines information retrieval with language generation.",
      "TypeScript provides static typing for JavaScript, making code more reliable and maintainable.",
    ];

    const sampleIds = sampleDocuments.map((_, index) => `sample_${index + 1}`);

    // Use upsert to avoid duplicates
    await collection.upsert({
      documents: sampleDocuments,
      ids: sampleIds,
      metadatas: sampleDocuments.map((_, index) => ({
        type: "sample",
        index: index + 1,
        topic: index < 2 ? "frameworks" : index < 4 ? "databases" : "programming",
      })),
    });

    console.log("📚 Sample knowledge base initialized with", sampleDocuments.length, "documents");
  } catch (error) {
    console.error("Error initializing collection:", error);
  }
}

// Call initialization
initializeCollection();

// Retriever function
async function retrieveDocuments(query: string, nResults = 3) {
  try {
    const collection = await chromaClient.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: embeddingFunction,
    });

    const results = await collection.query({
      queryTexts: [query],
      nResults,
    });

    // Use the new .rows() method for cleaner data access
    const rows = results.rows();

    if (!rows || rows.length === 0 || !rows[0]) {
      return [];
    }

    // Format results - rows[0] contains the actual row data
    return rows[0].map((row: QueryRowResult<Metadata>, index: number) => ({
      content: row.document || "",
      metadata: row.metadata || {},
      distance: results.distances?.[0]?.[index] || 0, // Distance still comes from the original results
      id: row.id,
    }));
  } catch (error) {
    console.error("Error retrieving documents:", error);
    return [];
  }
}

/**
 * Chroma-based retriever implementation for VoltAgent
 */
export class ChromaRetriever extends BaseRetriever {
  /**
   * Retrieve documents from Chroma based on semantic similarity
   * @param input - The input to use for retrieval (string or BaseMessage[])
   * @param options - Configuration and context for the retrieval
   * @returns Promise resolving to a formatted context string
   */
  async retrieve(input: string | BaseMessage[], options: RetrieveOptions): Promise<string> {
    // Convert input to searchable string
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

    // Perform semantic search using Chroma
    const results = await retrieveDocuments(searchText, 3);

    // Add references to context if available
    if (options.context && results.length > 0) {
      const references = results.map((doc, index) => ({
        id: doc.id,
        title: doc.metadata.title || `Document ${index + 1}`,
        source: "Chroma Knowledge Base",
        distance: doc.distance,
      }));

      options.context.set("references", references);
    }

    // Return the concatenated content for the LLM
    if (results.length === 0) {
      return "No relevant documents found in the knowledge base.";
    }

    return results
      .map(
        (doc, index) =>
          `Document ${index + 1} (ID: ${doc.id}, Distance: ${doc.distance.toFixed(4)}):\n${doc.content}`,
      )
      .join("\n\n---\n\n");
  }
}

// Create retriever instance
export const retriever = new ChromaRetriever();
