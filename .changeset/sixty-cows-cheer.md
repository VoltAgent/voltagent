---
"@voltagent/core": patch
---

Add userContext support to retrievers for tracking references and metadata

Retrievers can now store additional information (like references, sources, citations) in userContext that can be accessed from agent responses. This enables tracking which documents were used to generate responses, perfect for citation systems and audit trails.

```ts
class MyRetriever extends BaseRetriever {
  async retrieve(input: string, options: RetrieveOptions): Promise<string> {
    // Find relevant documents
    const docs = this.findRelevantDocs(input);

    // Store references in userContext
    if (options.userContext) {
      const references = docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        source: doc.source,
      }));
      options.userContext.set("references", references);
    }

    return docs.map((doc) => doc.content).join("\n");
  }
}

// Access references from response
const response = await agent.generateText("What is VoltAgent?");
const references = response.userContext?.get("references");
```
