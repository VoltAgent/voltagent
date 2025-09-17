import { QdrantClient } from "@qdrant/js-client-rest";
import {
  type BaseMessage,
  BaseRetriever,
  type RetrieveOptions,
  createRetrieverTool,
} from "@voltagent/core";

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY,
});

const collectionName = "voltagent-knowledge-base";

// Sample documents to populate the collection
const sampleRecords = [
  {
    id: 1,
    payload: {
      text: "VoltAgent is a TypeScript framework for building AI agents with modular components.",
      category: "frameworks",
      topic: "voltagent",
    },
  },
  {
    id: 2,
    payload: {
      text: "Qdrant is a vector database built for machine learning applications that require fast, accurate vector search.",
      category: "databases",
      topic: "qdrant",
    },
  },
  {
    id: 3,
    payload: {
      text: "Vector databases store high-dimensional vectors and enable semantic search capabilities for AI applications.",
      category: "databases",
      topic: "vector-search",
    },
  },
  {
    id: 4,
    payload: {
      text: "Retrieval-Augmented Generation (RAG) combines information retrieval with language generation for better AI responses.",
      category: "techniques",
      topic: "rag",
    },
  },
  {
    id: 5,
    payload: {
      text: "TypeScript provides static typing for JavaScript, making code more reliable and maintainable for large applications.",
      category: "programming",
      topic: "typescript",
    },
  },
];

// Initialize collection with sample data
async function initializeCollection() {
  try {
    // Check if collection exists
    let exists = false;
    try {
      await qdrant.getCollection(collectionName);
      exists = true;
      console.log(`📋 Collection "${collectionName}" already exists`);
    } catch (_error) {
      console.log(`📋 Creating new collection "${collectionName}"...`);
    }

    // Create collection if it doesn't exist
    if (!exists) {
      await qdrant.createCollection(collectionName, {
        vectors: { size: 1536, distance: "Cosine" },
      });
      console.log(`✅ Collection "${collectionName}" created successfully`);
    }

    // Check if we need to populate with sample data
    const stats = await qdrant.count(collectionName);
    if (stats.count === 0) {
      console.log("📚 Populating collection with sample documents...");
      // Generate embeddings for sample documents using OpenAI
      const OpenAI = await import("openai");
      const openai = new OpenAI.default({
        apiKey: process.env.OPENAI_API_KEY || "",
      });
      const points = [];
      for (const record of sampleRecords) {
        try {
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: record.payload.text,
          });
          points.push({
            id: record.id,
            vector: embeddingResponse.data[0].embedding,
            payload: record.payload,
          });
        } catch (error) {
          console.error(`Error generating embedding for ${record.id}:`, error);
        }
      }
      if (points.length > 0) {
        await qdrant.upsert(collectionName, { points });
        console.log(`✅ Successfully upserted ${points.length} documents to collection`);
      }
    } else {
      console.log(`📊 Collection already contains ${stats.count} documents`);
    }
  } catch (error) {
    console.error("Error initializing Qdrant collection:", error);
  }
}

// Call initialization
initializeCollection();

// Retriever function
async function retrieveDocuments(query: string, topK = 3) {
  try {
    // Generate embedding for the query
    const OpenAI = await import("openai");
    const openai = new OpenAI.default({
      apiKey: process.env.OPENAI_API_KEY || "",
    });
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryVector = embeddingResponse.data[0].embedding;
    // Perform search in Qdrant
    const searchResults = (
      await qdrant.query(collectionName, {
        query: queryVector,
        limit: topK,
        with_payload: true,
      })
    ).points;
    // Format results
    return (
      searchResults.map((match: any) => ({
        content: match.payload?.text || "",
        metadata: match.payload || {},
        score: match.score || 0,
        id: match.id,
      })) || []
    );
  } catch (error) {
    console.error("Error retrieving documents from Qdrant:", error);
    return [];
  }
}

/**
 * Qdrant-based retriever implementation for VoltAgent
 */
export class QdrantRetriever extends BaseRetriever {
  /**
   * Retrieve documents from Qdrant based on semantic similarity
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
      if (Array.isArray(lastMessage.content)) {
        const textParts = lastMessage.content
          .filter((part: any) => part.type === "text")
          .map((part: any) => part.text);
        searchText = textParts.join(" ");
      } else {
        searchText = lastMessage.content as string;
      }
    }
    // Perform semantic search using Qdrant
    const results = await retrieveDocuments(searchText, 3);
    // Add references to context if available
    if (options.context && results.length > 0) {
      const references = results.map((doc: any, index: number) => ({
        id: doc.id,
        title: doc.metadata.topic || `Document ${index + 1}`,
        source: "Qdrant Knowledge Base",
        score: doc.score,
        category: doc.metadata.category,
      }));
      options.context.set("references", references);
    }
    // Return the concatenated content for the LLM
    if (results.length === 0) {
      return "No relevant documents found in the knowledge base.";
    }
    return results
      .map(
        (doc: any, index: number) =>
          `Document ${index + 1} (ID: ${doc.id}, Score: ${doc.score.toFixed(4)}, Category: ${doc.metadata.category}):\n${doc.content}`,
      )
      .join("\n\n---\n\n");
  }
}

// Create retriever instance
export const retriever = new QdrantRetriever();
