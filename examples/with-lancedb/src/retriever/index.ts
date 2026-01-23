import fs from "node:fs/promises";
import path from "node:path";
import { type Connection, type Table, connect } from "@lancedb/lancedb";
import { type BaseMessage, BaseRetriever, type RetrieveOptions } from "@voltagent/core";
import { embed } from "ai";

const tableName = "voltagent-knowledge-base";
const dbUri = process.env.LANCEDB_URI || path.resolve(process.cwd(), ".voltagent/lancedb");

const sampleDocuments = [
  {
    text: "LanceDB is a developer-friendly, serverless vector database for AI applications.",
    metadata: {
      category: "database",
      source: "documentation",
      title: "What is LanceDB",
    },
  },
  {
    text: "VoltAgent is an open-source TypeScript framework for building AI agents.",
    metadata: {
      category: "framework",
      source: "documentation",
      title: "What is VoltAgent",
    },
  },
  {
    text: "Vector embeddings capture semantic meaning in high-dimensional space.",
    metadata: {
      category: "concept",
      source: "documentation",
      title: "Vector Embeddings",
    },
  },
];

let db: Connection | null = null;
let table: Table | null = null;

async function getEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: "openai/text-embedding-3-small",
    value: text,
  });
  return embedding;
}

// Ensure directory exists for safety (only if local path)
async function ensureDbDir() {
  try {
    if (!dbUri.startsWith("lancedb+")) {
      await fs.mkdir(path.dirname(dbUri), { recursive: true });
    }
  } catch (_e) {
    // Ignore if exists
  }
}

async function initializeIndex() {
  try {
    await ensureDbDir();

    db = await connect(dbUri);
    console.log(`Connected to LanceDB at ${dbUri}`);

    const tableNames = await db.tableNames();

    if (tableNames.includes(tableName)) {
      table = await db.openTable(tableName);
      const count = await table.countRows();
      console.log(`📋 Table "${tableName}" exists with ${count} records`);
    } else {
      console.log(`📋 Creating new table "${tableName}"...`);
      console.log("📚 Generating embeddings for sample documents...");

      const recordsWithEmbeddings = [];

      for (const doc of sampleDocuments) {
        try {
          const vector = await getEmbedding(doc.text);
          recordsWithEmbeddings.push({
            text: doc.text,
            ...doc.metadata,
            vector,
          });
        } catch (error) {
          console.error(`Error generating embedding for "${doc.metadata.title}":`, error);
        }
      }

      if (recordsWithEmbeddings.length > 0) {
        // Create table with sample data
        table = await db.createTable(tableName, recordsWithEmbeddings);
        console.log(`✅ Table "${tableName}" created with ${recordsWithEmbeddings.length} records`);
      } else {
        console.warn("⚠️ No embeddings generated. Table not created.");
      }
    }
  } catch (error) {
    console.error("Error initializing LanceDB:", error);
  }
}

// Start initialization
const initPromise = initializeIndex();

export class LanceDBRetriever extends BaseRetriever {
  /**
   * Retrieve documents from LanceDB based on semantic similarity
   */
  async retrieve(input: string | BaseMessage[], options: RetrieveOptions): Promise<string> {
    // Ensure initialized
    if (!table) {
      await initPromise;
      if (!table) return "Knowledge base is not initialized yet.";
    }

    // Determine search text
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

    try {
      const queryVector = await getEmbedding(searchText);

      // Perform vector search
      // Default metric is L2 (Euclidean). For normalized embeddings (like OpenAI),
      // L2 corresponds to Cosine distance.
      const results = await table.vectorSearch(queryVector).limit(3).toArray();

      // Track sources in context
      if (options.context && results.length > 0) {
        const references = results.map((doc: any, index: number) => ({
          id: `ref-${index}`,
          title: doc.title || `Document ${index + 1}`,
          source: "LanceDB",
          category: doc.category,
          score: doc._distance, // LanceDB returns distance
        }));
        options.context.set("references", references);
      }

      if (results.length === 0) {
        return "No relevant documents found.";
      }

      // Format results for the LLM
      return results
        .map(
          (doc: any, index: number) =>
            `Document ${index + 1} (Title: ${doc.title}, Category: ${doc.category}):\n${doc.text}`,
        )
        .join("\n\n---\n\n");
    } catch (error) {
      console.error("Error retrieving documents from LanceDB:", error);
      return "Error retrieving documents.";
    }
  }
}

export const retriever = new LanceDBRetriever();
