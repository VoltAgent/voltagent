import { fileURLToPath } from "node:url";
import {
  Agent,
  type BaseMessage,
  BaseRetriever,
  Memory,
  type RetrieveOptions,
  VoltAgent,
} from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { searchMarkdown } from "./markdown-search.js";

const documentsDirectory = fileURLToPath(new URL("../documents/", import.meta.url));

class KnowledgeBaseRetriever extends BaseRetriever {
  async retrieve(input: string | BaseMessage[], options: RetrieveOptions): Promise<string> {
    const message = typeof input === "string" ? input : input.at(-1)?.content;
    const query = typeof message === "string" ? message : "";
    const matches = searchMarkdown(documentsDirectory, query);

    options.context?.set(
      "references",
      matches.map(({ source, section }) => ({ source, section })),
    );

    if (matches.length === 0) return "No relevant information found in the documents.";

    return matches
      .map(({ source, section, content }) => `Source: ${source} > ${section}\n${content}`)
      .join("\n\n");
  }
}

const logger = createPinoLogger({ name: "with-rag-chatbot", level: "info" });

const ragAgent = new Agent({
  name: "RAG Chatbot",
  instructions:
    "Answer using the retrieved documents. Cite the source file and section for factual claims. If no relevant information is found, say the documents do not answer the question.",
  model: "openai/gpt-4o-mini",
  retriever: new KnowledgeBaseRetriever(),
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  }),
});

new VoltAgent({ agents: { ragAgent }, logger, server: honoServer({ port: 3141 }) });
