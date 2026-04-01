import { Agent, type BaseMessage, BaseRetriever, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

// --- Simple Knowledge Base Retriever ---

class KnowledgeBaseRetriever extends BaseRetriever {
  // Our tiny "knowledge base"
  private documents = [
    {
      id: "doc1",
      content: "What is VoltAgent? VoltAgent is a TypeScript framework for building AI agents.",
    },
    {
      id: "doc2",
      content:
        "What features does VoltAgent support? VoltAgent supports tools, memory, sub-agents, and retrievers for RAG.",
    },
    { id: "doc3", content: "What is RAG? RAG stands for Retrieval-Augmented Generation." },
    {
      id: "doc4",
      content:
        "How can I test my agent? You can test VoltAgent agents using the VoltOps LLM Observability Platform.",
    },
  ];

  // Reverting to simple retrieve logic
  async retrieve(input: string | BaseMessage[]): Promise<string> {
    const query = typeof input === "string" ? input : (input[input.length - 1].content as string);
    const queryLower = query.toLowerCase();
    console.log(`[KnowledgeBaseRetriever] Searching for context related to: "${query}"`);

    // Simple includes check
    const relevantDocs = this.documents.filter((doc) =>
      doc.content.toLowerCase().includes(queryLower),
    );

    if (relevantDocs.length > 0) {
      const contextString = relevantDocs.map((doc) => `- ${doc.content}`).join("\n");
      console.log(`[KnowledgeBaseRetriever] Found context:\n${contextString}`);
      return `Relevant Information Found:\n${contextString}`;
    }

    console.log("[KnowledgeBaseRetriever] No relevant context found.");
    return "No relevant information found in the knowledge base.";
  }
}

// --- Agent Definition ---

// Create logger
const logger = createPinoLogger({
  name: "with-rag-chatbot",
  level: "info",
});

// Instantiate the retriever
const knowledgeRetriever = new KnowledgeBaseRetriever();

// Define the agent that uses the retriever directly
const ragAgent = new Agent({
  name: "RAG Chatbot",
  instructions: "A chatbot that answers questions based on its internal knowledge base.",
  model: "openai/gpt-4o-mini", // Using OpenAI model via Vercel
  // Attach the retriever directly
  retriever: knowledgeRetriever,
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({
      url: "file:./.voltagent/memory.db",
    }),
  }),
});

// --- VoltAgent Initialization ---

new VoltAgent({
  agents: {
    // Make the agent available under the key 'ragAgent'
    ragAgent,
  },
  logger,
  server: honoServer({ port: 3141 }),
});
