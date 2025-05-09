---
title: Retriever
slug: /agents/retriever
---

# Retriever

Retrievers are components that enable your agents to access and use external knowledge, forming the foundation of **Retrieval-Augmented Generation (RAG)** systems. RAG enhances LLM responses by combining the model's generative abilities with relevant, up-to-date information fetched from external sources.

A retriever connects your agent to data sources like documents, databases, or APIs. When processing a user query, the retriever searches for relevant information. This retrieved context is then provided to the LLM alongside the original prompt, allowing the agent to generate more accurate, detailed, and contextually grounded responses based on data beyond its training set.

## Creating a Custom Retriever

To create a custom retriever in VoltAgent, you **extend the `BaseRetriever` class** and **implement the abstract `retrieve` method**. This method contains the logic for fetching data from your specific source.

```ts
import { BaseRetriever, type BaseMessage } from "@voltagent/core";

// Example: Simple retriever fetching from a predefined document list
class MySimpleRetriever extends BaseRetriever {
  // In a real scenario, this could be a connection to a vector DB, API, etc.
  private documents = [
    { id: "doc1", content: "VoltAgent is a framework for building AI agents using TypeScript." },
    { id: "doc2", content: "Retrievers enhance LLMs with external, real-time data for RAG." },
    { id: "doc3", content: "VoltAgent supports tools, memory, sub-agents, and retrievers." },
  ];

  // You MUST implement this method
  async retrieve(input: string | BaseMessage[]): Promise<string> {
    // Determine the actual query string from the input
    const query = typeof input === "string" ? input : (input[input.length - 1].content as string);
    console.log(`MySimpleRetriever: Searching for context related to "${query}"`);

    // Implement your retrieval logic here (e.g., keyword search, vector similarity)
    const relevantDocs = this.documents.filter((doc) =>
      doc.content.toLowerCase().includes(query.toLowerCase())
    );

    // Format the retrieved information as a string for the LLM
    if (relevantDocs.length > 0) {
      const contextString = relevantDocs
        .map((doc) => `[Document ${doc.id}] ${doc.content}`)
        .join("\n\n");
      return contextString;
    } else {
      // Return an empty string or a specific message if no context is found
      return "No relevant information found in the document knowledge base.";
    }
  }
}

// You can optionally provide toolName and toolDescription if you plan
// to use this retriever AS A TOOL.
const retrieverWithOptions = new MySimpleRetriever({
  toolName: "search_docs",
  toolDescription: "Searches the internal document knowledge base.",
});

// Or create it without tool options if only using direct attachment
const retrieverBasic = new MySimpleRetriever();
```

## Using Retrievers with Agents

VoltAgent offers two primary ways to integrate your custom retriever with an `Agent`:

### 1. Direct Attachment (`agent.retriever`)

Attach an instance of your retriever directly to the `retriever` property in the `Agent` configuration. In this mode, the retriever's `retrieve` method is **automatically executed _before_ every LLM call** for that agent. The retrieved context is then implicitly added to the information (usually the system prompt) sent to the LLM.

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
// Assuming MySimpleRetriever is defined as above

// Create an instance of your retriever (tool options are ignored here)
const retrieverInstance = new MySimpleRetriever();

// Define a placeholder provider for the example
const provider = new VercelAIProvider();

// Create an agent and attach the retriever directly
const agent = new Agent({
  name: "RAG Assistant",
  instructions: "A helpful assistant with access to document knowledge",
  llm: provider,
  model: openai("gpt-4o"),
  // Attach the retriever instance directly
  // highlight-next-line
  retriever: retrieverInstance,
});

// Example Usage:
// When generateText is called, MySimpleRetriever.retrieve() runs first automatically.
// The returned context string is added to the prompt sent to the LLM.
// const response = await agent.generateText("What features does VoltAgent support?");
// console.log(response.text); // Response should incorporate info from doc3
```

**Advantages:**

- Simple setup.
- Ensures context is always considered by the LLM.

**Disadvantages:**

- Less efficient: Retrieval runs on every interaction, even if not strictly needed.
- Less agent autonomy: Agent doesn't decide _when_ to retrieve.

### 2. Using a Retriever as a Tool (`agent.tools`)

Alternatively, treat your retriever like any other `AgentTool`. Add the `retriever.tool` property (automatically created by `BaseRetriever`) to the agent's `tools` array. In this mode, the **LLM decides** whether to call the retriever tool during the generation process based on the prompt and the tool's name/description.

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
// Assuming MySimpleRetriever is defined as above

// Create a retriever instance, providing toolName and toolDescription
// These are crucial for the LLM to understand when to use this tool
const retrieverAsTool = new MySimpleRetriever({
  // highlight-start
  toolName: "search_internal_docs",
  toolDescription:
    "Searches the internal knowledge base for specific information about VoltAgent features or concepts. Use this when the user asks about VoltAgent specifics.",
  // highlight-end
});

// Define a placeholder provider for the example
const provider = new VercelAIProvider();

// Create an agent and add the retriever as a tool
const agent = new Agent({
  name: "Selective Assistant",
  instructions: "A helpful assistant that can search internal docs when needed",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  // Add the retriever's tool interface to the tools array
  // highlight-next-line
  tools: [retrieverAsTool.tool],
});

// Example Usage:
// When generateText is called, the LLM decides if tool use is needed.
// If it calls "search_internal_docs", retrieverAsTool.retrieve() runs.
// The result is sent back to the LLM to formulate the final response.
// const response = await agent.streamText("What is RAG in VoltAgent?");
// The stream would show a tool_call for "search_internal_docs"
// followed by a tool_result, and then the final text.
```

**Advantages:**

- More efficient: Retrieval only happens when the LLM deems it necessary.
- More flexible: Agent can choose from multiple tools, including different retrievers.
- More agent autonomy.

**Disadvantages:**

- Relies on the LLM's ability to correctly identify when to use the retriever tool.
- Requires careful crafting of `toolName` and `toolDescription`.

## Choosing the Right Method

| Feature         | Direct Attachment (`agent.retriever`)   | Tool Usage (`agent.tools`)                   |
| --------------- | --------------------------------------- | -------------------------------------------- |
| **Invocation**  | Automatic, before every LLM call        | Selective, LLM decides during generation     |
| **Efficiency**  | Lower (runs every time)                 | Higher (runs only when needed)               |
| **Flexibility** | Lower (one retriever per agent)         | Higher (can mix with other tools/retrievers) |
| **Setup**       | Simpler                                 | Requires tool name/description configuration |
| **Use Case**    | Always-on knowledge (e.g., support bot) | Need-based knowledge retrieval               |

## Best Practices & Considerations

- **Context Formatting:** The string returned by your `retrieve` method is critical. Format it clearly (e.g., using separators, document IDs) so the LLM can easily parse and use the information.
- **Retrieval Quality:** The performance of your RAG system heavily depends on the relevance and accuracy of the information returned by your retriever. Invest in robust retrieval logic (e.g., vector search with embeddings, keyword search, hybrid approaches).
- **Latency:** Retrieval adds an extra step before the LLM can generate a response. Optimize your `retrieve` method for speed to minimize perceived latency.
- **Error Handling:** Implement `try...catch` blocks within your `retrieve` method to handle potential errors during data fetching (e.g., database connection issues, API failures) and return appropriate messages or fallback states.
- **No Context Found:** Decide how your `retrieve` method should behave when no relevant information is found. Returning an empty string or a specific message like "No relevant context found" are common patterns.
