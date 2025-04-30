---
title: Overview
slug: /agents/overview
---

# Agent Overview

The `Agent` class is the fundamental building block of VoltAgent. It acts as the central orchestrator, allowing you to create AI agents that interact with Large Language Models (LLMs), use tools to interact with the outside world, maintain conversational memory, and embody specific personalities or instructions.

## Creating an Agent

At its core, an agent needs a name, a description (which guides its behavior), an LLM Provider to handle communication with an AI model, and the specific model to use.

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai"; // Handles communication
import { openai } from "@ai-sdk/openai"; // Defines the specific model source

const agent = new Agent({
  name: "My Assistant",
  description: "A helpful and friendly assistant that can answer questions clearly and concisely.",
  // The LLM Provider acts as the bridge to the AI service
  llm: new VercelAIProvider(),
  // The model specifies which AI model to use (e.g., from OpenAI via Vercel AI SDK)
  model: openai("gpt-4o"),
});
```

## Core Interaction Methods

The primary ways to interact with an agent are through the `generate*` and `stream*` methods. These methods handle sending your input to the configured LLM, processing the response, and potentially orchestrating tool usage or memory retrieval based on the agent's configuration and the LLM's decisions.

### Text Generation (`generateText`/`streamText`)

Use these methods when you expect a primarily text-based response. The agent might still decide to use tools based on the prompt and its capabilities.

- `generateText`: Returns the complete text response after the LLM and any necessary tool calls are finished.
- `streamText`: Returns a stream that yields chunks of the response (text, tool calls, tool results) as they become available, providing a more interactive experience.

```ts
import { Agent, createTool } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Example Tool (see Tools section for details)
const weatherTool = createTool({
  name: "get_weather",
  description: "Get the current weather for a specific location",
  parameters: z.object({ location: z.string().describe("City and state") }),
  execute: async ({ location }) => {
    console.log(`Tool: Getting weather for ${location}`);
    // Call API... return mock data
    return { temperature: 72, conditions: "sunny" };
  },
});

const agent = new Agent({
  name: "Chat Assistant",
  description: "A helpful assistant that can check the weather.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  tools: [weatherTool],
});

// Example using streamText for a chat-like interaction
async function chat(input: string) {
  console.log(`User: ${input}`);
  // Use streamText for interactive responses
  const response = await agent.streamText(input);

  for await (const chunk of stream.textStream) {
    console.log(chunk);
  }
}

// Example usage that might trigger the weather tool
await chat("What's the weather like in London?");

// Example using generateText for a complete response
const completeResponse = await agent.generateText("Explain machine learning briefly.");
console.log("Complete Response:", completeResponse.text);
```

#### Markdown Formatting

**Why?** To have the agent automatically format its text responses using Markdown for better readability and presentation.

By setting the `markdown` property to `true` in the agent's configuration, you instruct the LLM to use Markdown syntax (like headings, lists, bold text, etc.) when generating text responses. VoltAgent adds a corresponding instruction to the system prompt automatically.

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Markdown Assistant",
  description: "A helpful assistant that formats answers clearly.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  markdown: true, // Enable automatic Markdown formatting
});

// Now, when you call generateText or streamText,
// the agent will attempt to format its response using Markdown.
const response = await agent.generateText("Explain the steps to make a cup of tea.");
console.log(response.text);
```

This is particularly useful when displaying agent responses in UIs that support Markdown rendering.

### Structured Data Generation (`generateObject`/`streamObject`)

Use these methods when you need the LLM to generate output conforming to a specific structure (defined by a Zod schema). This is ideal for data extraction, function calling based on schema, or generating predictable JSON.

- `generateObject`: Returns the complete structured object once generation is finished.
- `streamObject`: Returns a stream that yields partial updates to the object as it's being constructed by the LLM.

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const agent = new Agent({
  name: "Data Extractor",
  description: "Extracts structured data.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"), // Ensure model supports structured output/function calling
});

// Define a simple schema with Zod
const personSchema = z.object({
  name: z.string().describe("Full name"), // Descriptions help the LLM
  age: z.number(),
  occupation: z.string(),
  skills: z.array(z.string()),
});

// Example using generateObject
const objectResponse = await agent.generateObject(
  "Create a profile for a talented software developer named Alex.",
  personSchema
);
console.log("Complete object:", objectResponse.object);

// Example using streamObject
const streamObjectResponse = await agent.streamObject(
  "Generate details for a data scientist named Jamie.",
  personSchema
);

for await (const partial of streamObjectResponse.objectStream) {
  console.log("Received update:", partial); // Shows the object being built incrementally
}

const finalObject = await streamObjectResponse.object;
console.log("Final streamed object:", finalObject);
```

## Advanced Features

Enhance your agents with these powerful capabilities, which are integrated into the core `generate*`/`stream*` methods:

### Memory

**Why?** To give your agent context of past interactions, enabling more natural, coherent, and personalized conversations.

VoltAgent's memory management system allows agents to store and retrieve conversation history or state using configurable Memory Providers.

```typescript
// Example: Configuring memory (Provider details omitted for brevity)
import { Agent, LibSQLStorage } from "@voltagent/core";
// ... other imports

const memoryStorage = new LibSQLStorage({
  /* ... provider config ... */
});

const agent = new Agent({
  name: "Assistant with Memory",
  // ... other config ...
  memory: memoryStorage,
});
```

When memory is configured, the agent automatically retrieves relevant context before calling the LLM and saves new interactions afterwards.

**[Learn more about Memory Management & Providers](./memory/overview.md)**

### Tools

**Why?** To allow your agent to interact with the outside world, access real-time information, or perform actions via APIs, databases, or other systems.

When you call `generateText` or `streamText`, the LLM can decide to use one of the provided tools. VoltAgent handles the execution and feeds the result back to the LLM to continue generation.

```ts
import { Agent, createTool } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Create a weather tool using the helper function
const weatherTool = createTool({
  name: "get_weather",
  description: "Get the current weather for a specific location",
  parameters: z.object({
    location: z.string().describe("The city and state, e.g., San Francisco, CA"),
  }),
  // The function the agent executes when using the tool
  execute: async ({ location }) => {
    console.log(`Tool: Getting weather for ${location}`);
    // In a real scenario, call a weather API here
    // Returning mock data for demonstration
    if (location.toLowerCase().includes("london")) {
      return { temperature: 55, conditions: "cloudy" };
    }
    return { temperature: 72, conditions: "sunny" };
  },
});

const agent = new Agent({
  name: "Weather Assistant",
  description: "An assistant that can check the weather using available tools.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"), // Models supporting tool use are required
  tools: [weatherTool], // Provide the list of tools to the agent
});

// Example: Call streamText and the agent might use the tool
const response = await agent.generateText("What's the weather in London?");
console.log(response.text);
// The agent should call the 'get_weather' tool during the generation.
```

[Learn more about Tools](./tools.md)

### Sub-Agents

**Why?** To break down complex tasks into smaller, manageable parts handled by specialized agents, promoting modularity and focused expertise (similar to a team of specialists).

A coordinator agent uses a special `delegate_task` tool (added automatically when sub-agents are present) to pass control to a sub-agent during a `generate*`/`stream*` call.

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Assume researchAgent and writingAgent are configured Agents
const researchAgent = new Agent({ name: "Researcher" /* ... */ });
const writingAgent = new Agent({ name: "Writer" /* ... */ });

// Create a coordinator agent that uses the others
const mainAgent = new Agent({
  name: "Coordinator",
  description: "Coordinates research and writing tasks by delegating to specialized sub-agents.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  // List the agents this one can delegate tasks to
  subAgents: [researchAgent, writingAgent],
});

// Example: Call streamText on the main agent
const response = await mainAgent.generateText("Write a blog post about quantum computing.");
console.log(response.text);
// The Coordinator might decide to use the delegate_task tool to involve researchAgent and writingAgent.
```

[Learn more about Sub-Agents](./subagents.md)

### Hooks

**Why?** To observe and potentially intercept or modify the agent's behavior at various lifecycle stages (start, end, tool calls, etc.) for logging, debugging, or custom logic.

Hooks are triggered at specific points during the execution of `generate*`/`stream*` methods.

```ts
import { Agent, createHooks } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const hooks = createHooks({
  // Called when any agent interaction starts (generateText, streamText, etc.)
  onStart: async (agentInstance) => {
    console.log(`Agent ${agentInstance.name} starting interaction...`);
  },
  // Called when the interaction successfully finishes
  onEnd: async (agentInstance, result) => {
    // Result format depends on the method called (e.g., { text: ..., usage: ... } for generateText)
    console.log(
      `Agent ${agentInstance.name} finished. Final output:`,
      result.text || result.object
    );
  },
  // Called before a tool is executed
  onToolStart: async (agentInstance, toolCall) => {
    console.log(`Agent ${agentInstance.name} starting tool: ${toolCall.toolName}`);
  },
  // Called after a tool finishes execution
  onToolEnd: async (agentInstance, toolResult) => {
    console.log(
      `Agent ${agentInstance.name} finished tool: ${toolResult.toolName}, Result:`,
      toolResult.result
    );
  },
  // Called if an error occurs during the interaction
  onError: async (agentInstance, error) => {
    console.error(`Agent ${agentInstance.name} encountered an error:`, error);
  },
});

const agent = new Agent({
  name: "Observable Agent",
  description: "An agent with logging hooks.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  hooks, // Attach the defined hooks
});
```

[Learn more about Hooks](./hooks.md)

### Operation Context (`userContext`)

**Why?** To pass custom, request-specific data between different parts of an agent's execution flow (like hooks and tools) for a single operation, without affecting other concurrent or subsequent operations. Useful for tracing, logging, metrics, or passing temporary configuration.

`userContext` is a `Map` accessible via the `OperationContext` object, which is passed to hooks and available in tool execution contexts. This context is isolated to each individual operation (`generateText`, `streamObject`, etc.).

```ts
import {
  Agent,
  createHooks,
  createTool,
  type OperationContext,
  type ToolExecutionContext,
} from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const hooks = createHooks({
  onStart: async (agent: Agent<any>, context: OperationContext) => {
    const requestId = `req-${Date.now()}`;
    context.userContext.set("requestId", requestId); // Set data in context
    console.log(`[${agent.name}] Operation started. RequestID: ${requestId}`);
  },
  onEnd: async (agent: Agent<any>, result: any, context: OperationContext) => {
    const requestId = context.userContext.get("requestId"); // Get data from context
    console.log(`[${agent.name}] Operation finished. RequestID: ${requestId}`);
  },
});

const loggerTool = createTool({
  name: "context_aware_logger",
  description: "Logs a message using the request ID from context.",
  parameters: z.object({ message: z.string() }),
  execute: async (params: { message: string }, options?: ToolExecutionContext) => {
    const requestId = options?.operationContext?.userContext?.get("requestId") || "unknown";
    const logMessage = `[ReqID: ${requestId}] Tool Log: ${params.message}`;
    console.log(logMessage);
    return `Logged: ${params.message}`;
  },
});

const agent = new Agent({
  name: "Context Agent",
  description: "Uses userContext.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  hooks: hooks,
  tools: [loggerTool],
});

await agent.generateText("Log this message: 'Processing user data.'");
// The requestId set in onStart will be available in loggerTool and onEnd.
```

[Learn more about Operation Context (userContext)](./context.md)

### Retriever

**Why?** To provide the agent with access to external knowledge bases or documents, allowing it to answer questions or generate content based on information not present in its original training data (Retrieval-Augmented Generation - RAG).

The retriever is automatically invoked before calling the LLM within `generate*`/`stream*` methods to fetch relevant context, which is then added to the system prompt.

```ts
import { BaseRetriever } from "@voltagent/core";
import type { BaseMessage } from "@voltagent/core";
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Create a simple retriever (replace with actual vector search in production)
class SimpleRetriever extends BaseRetriever {
  // Sample knowledge base
  private documents = [
    { id: "doc1", content: "VoltAgent is a TypeScript framework for building AI agents." },
    { id: "doc2", content: "Agents can use tools, memory, and sub-agents." },
    { id: "doc3", content: "Retrievers enhance AI agents with external knowledge using RAG." },
  ];

  // Method to fetch relevant documents
  async retrieve(input: string | BaseMessage[]): Promise<string> {
    // Extract the query text
    const query = typeof input === "string" ? input : (input[input.length - 1].content as string);
    console.log(`Retriever: Searching for "${query}"`);

    // Simple keyword matching (use vector embeddings for real applications)
    const results = this.documents.filter((doc) =>
      doc.content.toLowerCase().includes(query.toLowerCase())
    );

    if (results.length === 0) return "No relevant information found in documents.";

    // Format results for the LLM
    return results.map((doc) => `Document ${doc.id}: ${doc.content}`).join("\n\n");
  }
}

// Create agent with the retriever
const agent = new Agent({
  name: "Knowledge Assistant",
  description: "An assistant that uses retrieved documents to answer questions.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  retriever: new SimpleRetriever(), // Add the retriever instance
});

// Example: Ask a question using streamText
const response = await agent.generateText("What are Retrievers in VoltAgent?");
console.log(response.text);
// The agent will use SimpleRetriever *before* calling the LLM,
// then generate an answer based on the retrieved context.
```

[Learn more about Retrievers](./retriever.md)

### Providers

**Why?** To abstract the communication layer with different LLM backends (like OpenAI, Anthropic, Google Gemini, Cohere, local models via Ollama, etc.), allowing you to switch providers without rewriting your core agent logic.

VoltAgent achieves this through `LLMProvider` implementations. You configure your `Agent` with a specific provider instance and the desired model compatible with that provider.

Currently, VoltAgent offers built-in support for:

- **`@voltagent/vercel-ai`**: Leverages the powerful Vercel AI SDK [\[1\]](https://sdk.vercel.ai/docs/introduction) to connect to a wide array of popular models (OpenAI, Anthropic, Google, Mistral, Cohere, and many more) with a standardized API.
- **`@voltagent/xsai`**: Provides a lightweight alternative provider, compatible with OpenAI and OpenAI-compatible APIs, ideal for environments where bundle size is a concern (like browsers or edge functions) [\[2\]](https://xsai.js.org/docs).

We plan to add more official provider integrations in the future. Furthermore, developers can create their own custom providers by implementing the `LLMProvider` interface to connect VoltAgent to virtually any AI model or service.

```ts
// 1. Vercel AI Provider (integrates with various models via Vercel AI SDK)
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai"; // Model definition for OpenAI via Vercel
import { anthropic } from "@ai-sdk/anthropic"; // Model definition for Anthropic via Vercel

// Agent using OpenAI via Vercel
const vercelOpenAIAgent = new Agent({
  name: "Vercel OpenAI Assistant",
  description: "Assistant using Vercel AI SDK with OpenAI.",
  llm: new VercelAIProvider(), // The provider
  model: openai("gpt-4o"), // The specific model
});

// Agent using Anthropic via Vercel
const vercelAnthropicAgent = new Agent({
  name: "Vercel Anthropic Assistant",
  description: "Assistant using Vercel AI SDK with Anthropic.",
  llm: new VercelAIProvider(), // Same provider
  model: anthropic("claude-3-5-sonnet-20240620"), // Different model
});

// 2. XsAI Provider (Example of a custom/alternative provider)
import { XsAIProvider } from "@voltagent/xsai";

// Agent using XsAI Provider (might use different model naming)
const xsaiAgent = new Agent({
  name: "XsAI Assistant",
  description: "Assistant using XsAI Provider.",
  llm: new XsAIProvider({ apiKey: process.env.OPENAI_API_KEY }), // Provider instance
  model: "xsai-model-name", // Model identifier specific to this provider
});

// Use the agents (example)
const response = await vercelOpenAIAgent.generateText("Hello OpenAI via Vercel!");
console.log(response.text);

const response2 = await xsaiAgent.generateText("Hello XsAI!");
console.log(response2.text);
```

[Learn more about Providers](../providers/overview.md)

### Provider Options

**Why?** To provide a standardized way to configure model behavior across different LLM providers, making it easier to adjust generation parameters without worrying about provider-specific implementation details.

VoltAgent uses a standardized `ProviderOptions` type that abstracts common LLM configuration options like temperature, max tokens, and frequency penalties. These options are automatically mapped to each provider's specific format internally, giving you a consistent developer experience regardless of which provider you're using.

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Configurable Assistant",
  description: "An assistant with configurable generation parameters",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
});

// Example: Configure common LLM parameters regardless of provider
const response = await agent.generateText("Write a creative story about a robot.", {
  provider: {
    // Fine-tune generation behavior with standardized options
    temperature: 0.8, // Higher creativity (0-1)
    maxTokens: 500, // Limit response length
    topP: 0.9, // Nucleus sampling parameter
    frequencyPenalty: 0.5, // Reduce repetition
    presencePenalty: 0.3, // Encourage topic diversity
    seed: 12345, // Reproducible results
    stopSequences: ["THE END"], // Stop generation at specific string

    // Add provider callbacks for streaming
    onStepFinish: async (step) => {
      console.log("Step complete:", step.type);
    },
    onFinish: async (result) => {
      console.log("Generation complete!");
    },
    onError: async (error) => {
      console.error("Generation error:", error);
    },

    // Provider-specific options not covered by standard fields
    extraOptions: {
      someProviderSpecificOption: "value",
    },
  },
});

// Alternative: Provide parameters for streamed responses
const streamedResponse = await agent.streamText("Generate a business plan", {
  provider: {
    temperature: 0.3, // More focused, less creative
    maxTokens: 2000, // Longer response limit
    // ... other options as needed
  },
});
```

Use these standardized options to:

- Fine-tune response characteristics (creativity, length, diversity)
- Register callbacks for streaming events
- Achieve consistent behavior across different LLM providers
- Create reproducible outputs with the same seed value

The options are applied consistently whether you're using `generateText`, `streamText`, `generateObject`, or `streamObject` methods.

### MCP (Model Context Protocol)

**Why?** To enable standardized communication between your agent and external, potentially independent, model/tool servers, promoting interoperability and modular deployment.

Connect to external servers that adhere to the MCP specification to leverage their capabilities (e.g., specialized models or tools) without directly integrating their code. MCP tools are treated like any other tool and can be invoked during `generate*`/`stream*` calls.

```ts
import { Agent, MCPConfiguration } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Set up MCP configuration pointing to your external server(s)
const mcpConfig = new MCPConfiguration({
  servers: {
    // Define one or more MCP-compliant servers
    myModelServer: {
      type: "http", // Communication type
      url: "https://my-mcp-server.example.com", // URL of the MCP server
    },
  },
});

// Asynchronously fetch tools offered by the configured MCP server(s)
const mcpTools = await mcpConfig.getTools();

// Create an agent that can utilize these external MCP tools
const agent = new Agent({
  name: "MCP Agent",
  description: "Uses external model capabilities via MCP",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  // Add the tools fetched from the MCP server
  tools: mcpTools,
});

// Example: Call streamText
const response = await agent.generateText("Use the external analysis tool on this data...");
console.log(response.text);
// The agent can now potentially call tools hosted on 'myModelServer'.
```

[Learn more about MCP](./mcp.md)

### Voice

**Why?** To build voice-based applications by adding speech-to-text (STT) and text-to-speech (TTS) capabilities to your agent.

Integrate with voice providers like OpenAI or ElevenLabs. Use the provider directly for STT/TTS, or configure it on the agent (`agent.voice`) and use its methods (e.g., `agent.voice.speak()`) to synthesize the agent's text response.

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
// Import voice providers
import { OpenAIVoiceProvider, ElevenLabsVoiceProvider } from "@voltagent/voice";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";

// --- Using a Voice Provider directly ---

// Option 1: OpenAI Voice
const openaiVoice = new OpenAIVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY,
  ttsModel: "tts-1", // Text-to-Speech model
  voice: "alloy", // Choose a voice (alloy, echo, fable, onyx, nova, shimmer)
});

// Text to Speech (TTS) -> Returns a Readable stream of audio data
const audioStream = await openaiVoice.speak("Hello from OpenAI voice!");
// Example: Pipe the audio stream to a file
await pipeline(audioStream, createWriteStream("openai_output.mp3"));

// Speech to Text (STT) -> Takes an audio source (e.g., Readable stream)
const audioFileStream = createReadStream("input.mp3");
const transcript = await openaiVoice.listen(audioFileStream);
console.log("OpenAI Transcript:", transcript);

// Option 2: ElevenLabs Voice
const elevenLabsVoice = new ElevenLabsVoiceProvider({
  apiKey: process.env.ELEVENLABS_API_KEY,
  voice: "Rachel", // Choose an ElevenLabs voice ID or name
});

// TTS with ElevenLabs
const elAudioStream = await elevenLabsVoice.speak("Hello from ElevenLabs!");
await pipeline(elAudioStream, createWriteStream("elevenlabs_output.mp3"));

// --- Integrating Voice with an Agent ---

const agent = new Agent({
  name: "Voice Assistant",
  description: "A helpful voice assistant",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  // Assign a voice provider instance to the agent's voice property
  voice: elevenLabsVoice, // Or use openaiVoice
});

// To generate voice from an agent response:
// 1. Generate the text response using a core agent method.
const textResponse = await agent.generateText("Tell me a short story.");

// 2. Check if the agent has a voice provider configured.
if (agent.voice && textResponse.text) {
  // 3. Call the 'speak' method on the agent's voice provider instance.
  console.log("Generating voice output...");
  const agentAudioStream = await agent.voice.speak(textResponse.text);

  // Example: Save the agent's spoken response to a file
  await pipeline(agentAudioStream, createWriteStream("agent_story.mp3"));
  console.log("Generated voice output stream.");
} else {
  console.log("Agent response:", textResponse.text);
  if (!agent.voice) {
    console.log("(Agent has no voice provider configured)");
  }
}
```

[Learn more about Voice Agents](./voice.md)

## Error Handling

When interacting with agents (`generateText`, `streamText`, etc.), operations can fail due to network issues, API errors, tool execution problems, or other runtime exceptions.

**Synchronous Errors (e.g., during setup):**

Use standard JavaScript `try...catch` blocks around the agent method calls (`generateText`, `streamText`, `generateObject`, `streamObject`). This will catch errors that occur _before_ the main operation or stream begins, such as configuration issues or initial API connection failures.

```ts
const agent = new Agent({
  /* ... configuration ... */
});

try {
  // This try/catch handles errors during the initial call setup
  const response = await agent.streamText("Some complex request that might fail initially");

  // Processing the stream itself might encounter errors handled differently (see below)
  console.log("Stream processing started...");
  for await (const delta of response.stream) {
    // ... handle deltas ...
    process.stdout.write(delta.type === "text-delta" ? delta.textDelta : "");
  }
  // Note: If an error occurs *during* the stream, the loop might finish,
  // but the final history entry status will indicate an error.
  console.log("Interaction finished processing stream.");
} catch (error) {
  // Catches errors from the initial await agent.streamText() call
  console.error("Agent interaction failed during setup:", error);
  // Implement fallback logic, inform the user, or log the error
}
```

**Asynchronous Errors (e.g., during streaming):**

Errors that occur _during_ the streaming process (after the initial `await agent.streamText()` call succeeds) are handled internally by VoltAgent:

1.  The corresponding history entry is automatically updated with an `error` status.
2.  An error event is added to the agent's timeline.
3.  These errors **do not** typically cause the `await agent.streamText(...)` call or the `for await...of response.stream` loop itself to throw.

To observe or react to these asynchronous errors, you can:

- **Check History:** After the stream finishes (the `for await` loop completes), check the status of the corresponding `AgentHistoryEntry`.
- **Use Agent Hooks:** The existing hooks (`onStart`, `onEnd`, `onToolStart`, `onToolEnd`) can still provide valuable context for logging and debugging around the points where errors might occur, even though there isn't a specific `onError` hook.
- **Use `onError` Callback (Per-Call):** Pass an `onError` callback directly in the `provider` options when calling `streamText` (or other methods). This is the most direct way to be notified of errors _during_ the stream for a specific call.

  ```ts
  // Example with streamText
  const response = await agent.streamText("Another request", {
    provider: {
      onError: async (error) => {
        console.error("onError callback: Stream encountered an error:", error);
        // Implement specific error handling for this call
      },
    },
  });
  ```

By combining `try...catch` for initial errors and using the per-call `onError` callback or checking history for stream errors, you can effectively manage issues during agent interactions.

## Next Steps

Now that you have an overview of the `Agent` class and its core interaction methods, dive deeper into specific areas:

- Explore the dedicated documentation pages linked in each section above (Memory, Tools, Providers, etc.).
- Check out our [examples repository](https://github.com/voltagent/voltagent/tree/main/examples) for complete working applications built with VoltAgent.
