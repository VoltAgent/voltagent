import { openai } from "@ai-sdk/openai";
import { Agent, AiSdkEmbeddingAdapter, Memory, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { ManagedMemoryAdapter, ManagedMemoryVectorAdapter } from "@voltagent/voltagent-memory";

/* const voltOpsClient = new VoltOpsClient({
  baseUrl: process.env.VOLTOPS_API_URL,
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});
 */
const managedMemory = new ManagedMemoryAdapter({
  databaseName: "us-test",
});

const managedVector = new ManagedMemoryVectorAdapter({
  databaseName: "us-test",
});

const agent = new Agent({
  name: "Managed Memory Agent",
  instructions:
    "A helpful assistant that stores conversations in VoltAgent Managed Memory via VoltOps.",
  model: "openai/gpt-4o-mini",
  memory: new Memory({
    storage: managedMemory,
    vector: managedVector,
    embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  }),
});

const logger = createPinoLogger({
  name: "with-voltagent-managed-memory",
  level: "info",
});

new VoltAgent({
  agents: {
    managed: agent,
  },
  logger,
  server: honoServer({ port: Number(process.env.PORT || 3141) }),
});

(async () => {
  const connection = await managedMemory.getConnectionInfo();
  logger.info("VoltAgent managed memory ready", { connection });
})();
