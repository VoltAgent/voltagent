import { VoltAgentRagRetriever } from "@voltagent/core";

export const retriever = new VoltAgentRagRetriever({
  knowledgeBaseName: "test",
  topK: 4,
  includeSources: true,
  includeSimilarity: true,
});
