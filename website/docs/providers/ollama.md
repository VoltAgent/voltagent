---
title: Ollama
slug: /providers/ollama
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Ollama Provider (`@voltagent/ollama`)

The Ollama Provider integrates VoltAgent with [Ollama](https://ollama.ai/), allowing your agents to interact with locally running Ollama models. This provider supports both chat and completion-style interactions, making it versatile for various use cases.

**Key Characteristics:**

- **Local Model Execution:** Run AI models locally through Ollama's infrastructure
- **Chat & Completion Support:** Supports both chat-style conversations and direct text completions
- **Streaming Capability:** Built-in support for streaming responses
- **JSON Generation:** Best-effort support for structured JSON output

## Installation

<Tabs>
  <TabItem value="npm" label="npm">
    ```bash copy
    npm install @voltagent/core @voltagent/ollama
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash copy
    yarn add @voltagent/core @voltagent/ollama
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash copy
    pnpm add @voltagent/core @voltagent/ollama
    ```
  </TabItem>
</Tabs>

## Configuration

The `OllamaProvider` can be configured with custom options:

```typescript
import { OllamaProvider } from "@voltagent/ollama";

const ollamaProvider = new OllamaProvider({
  baseUrl: "http://localhost:11434", // Optional: defaults to this value
});
```

### Configuration Options

| Option    | Type     | Default                    | Description                        |
| --------- | -------- | -------------------------- | ---------------------------------- |
| `baseUrl` | `string` | `"http://localhost:11434"` | The base URL of your Ollama server |

## Usage

Instantiate your `Agent` with the `OllamaProvider`:

```typescript
import { Agent } from "@voltagent/core";
import { OllamaProvider } from "@voltagent/ollama";

const ollamaProvider = new OllamaProvider();

const agent = new Agent({
  name: "Ollama Chat Agent",
  description: "An agent powered by local Ollama models",
  llm: ollamaProvider,
  model: "llama2", // Use any model you have pulled in Ollama
});
```

## Supported Methods

- **`generateText`**: ✅ Fully supported. Uses Ollama's completion or chat API based on message count.
- **`streamText`**: ✅ Fully supported with real-time streaming responses.
- **`generateObject`**: ⚠️ Best-effort support. Uses system prompts to guide JSON generation.
- **`streamObject`**: ⚠️ Best-effort support. Streams complete object at end of generation.

## Error Handling

The provider includes several specialized error classes for better error handling:

```typescript
// Example error handling
try {
  const response = await agent.generateText("Hello");
} catch (error) {
  if (error instanceof OllamaModelError) {
    console.error("Model-related error:", error.message);
  } else if (error instanceof OllamaConnectionError) {
    console.error("Connection error:", error.message);
  } else if (error instanceof OllamaValidationError) {
    console.error("Validation error:", error.message);
  }
}
```

## Code Examples

### Text Generation

```typescript
import { Agent } from "@voltagent/core";
import { OllamaProvider } from "@voltagent/ollama";

async function main() {
  const ollamaProvider = new OllamaProvider();

  const agent = new Agent({
    name: "Simple Ollama Agent",
    description: "A simple agent powered by Ollama",
    llm: ollamaProvider,
    model: "llama2",
  });

  const prompt = "What is the capital of France?";

  try {
    const response = await agent.generateText(prompt);
    console.log(`Agent response to "${prompt}":`);
    console.log(response);
  } catch (error) {
    console.error("Error generating text:", error);
  }
}

main();
```

### Streaming Text

```typescript
import { Agent } from "@voltagent/core";
import { OllamaProvider } from "@voltagent/ollama";

async function main() {
  const ollamaProvider = new OllamaProvider();

  const agent = new Agent({
    name: "Ollama Streaming Agent",
    description: "A streaming agent powered by Ollama",
    llm: ollamaProvider,
    model: "llama2",
  });

  const prompt = "Write a short story about a robot learning to paint.";

  try {
    const streamResponse = await agent.streamText(prompt);

    console.log(`Streaming agent response to "${prompt}":`);
    for await (const chunk of streamResponse.textStream) {
      process.stdout.write(chunk);
    }
    console.log();
  } catch (error) {
    console.error("Error streaming text:", error);
  }
}

main();
```

### Generating Structured Objects (`generateObject`)

````typescript
import { OllamaProvider } from "@voltagent/ollama";
import { Agent } from "@voltagent/core";
import { z } from "zod";

// Define a schema for the desired object structure
const personSchema = z.object({
  name: z.string().describe("The person's full name"),
  age: z.number().describe("The person's age"),
  city: z.string().describe("The city they live in"),
});

// Helper function to clean JSON response
const cleanJsonResponse = (text: string): string => {
  let jsonString = text.trim();

  // Remove markdown formatting if present
  jsonString = jsonString
    .replace(/^```(?:json)?\s*/g, "") // Remove opening ```json or ``` at start
    .replace(/\s*```\s*$/g, "") // Remove closing ``` at end
    .trim(); // Clean up whitespace

  // Extract JSON if wrapped in other text
  if (jsonString.includes("{")) {
    jsonString = jsonString.substring(jsonString.indexOf("{"));
    if (jsonString.includes("}")) {
      jsonString = jsonString.substring(0, jsonString.lastIndexOf("}") + 1);
    }
  }

  return jsonString;
};

async function main() {
  const ollamaProvider = new OllamaProvider();

  const agent = new Agent({
    name: "Simple Ollama Agent",
    description: "A simple agent powered by Ollama",
    llm: ollamaProvider,
    model: "gemma3:1b",
  });

  // Add system message to enforce JSON format
  const messages = [
    {
      role: "system" as const,
      content: `You must respond with ONLY a valid JSON object with these REQUIRED fields:
- name (string): The person's full name
- age (number): The person's age
- city (string): The city they live in

Do not include markdown formatting (no \`\`\`json). Return only the raw JSON object.
Example format:
{
  "name": "John Doe",
  "age": 25,
  "city": "New York"
}`,
    },
    {
      role: "user" as const,
      content:
        "Generate details for a software engineer named Alex who is 30 years old and lives in London.",
    },
  ];

  try {
    // First get the raw text response
    const textResult = await agent.generateText(messages);

    // Clean the response and parse it
    const cleanedJson = cleanJsonResponse(textResult.text);

    const jsonObject = JSON.parse(cleanedJson);

    // Validate against our schema
    const validatedObject = personSchema.parse(jsonObject);

    console.log(validatedObject);
    console.log("Usage:", textResult.usage);
  } catch (error) {
    console.error("Error generating object:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
  }
}

main();
````

### Provider-Specific Options

You can pass provider-specific options when generating text or streaming:

```typescript
const response = await agent.generateText("Tell me a story", {
  provider: {
    temperature: 0.7,
    maxTokens: 500,
    topP: 0.9,
    frequencyPenalty: 0.5,
    presencePenalty: 0.5,
    seed: 42,
    stopSequences: ["END"],
  },
});
```

### Available Provider Options

| Option             | Type       | Description                          |
| ------------------ | ---------- | ------------------------------------ |
| `temperature`      | `number`   | Controls randomness in the output    |
| `maxTokens`        | `number`   | Maximum number of tokens to generate |
| `topP`             | `number`   | Nucleus sampling parameter           |
| `frequencyPenalty` | `number`   | Penalty for token frequency          |
| `presencePenalty`  | `number`   | Penalty for token presence           |
| `seed`             | `number`   | Random seed for reproducibility      |
| `stopSequences`    | `string[]` | Sequences that stop generation       |

## Usage with Different Models

The Ollama provider works with any model you have pulled into your local Ollama installation. Here's how to use different models:

```typescript
// Using Llama 2
const llama2Agent = new Agent({
  llm: new OllamaProvider(),
  model: "llama2",
});

// Using CodeLlama
const codeLlamaAgent = new Agent({
  llm: new OllamaProvider(),
  model: "codellama",
});

// Using Mistral
const mistralAgent = new Agent({
  llm: new OllamaProvider(),
  model: "mistral",
});
```

Make sure you have pulled the desired model using the Ollama CLI before using it:

```bash
ollama pull llama2
ollama pull codellama
ollama pull mistral
```

## Error Handling Best Practices

Here's a comprehensive example of error handling with the Ollama provider:

```typescript
import { Agent } from "@voltagent/core";
import { OllamaProvider } from "@voltagent/ollama";
import {
  OllamaError,
  OllamaModelError,
  OllamaConnectionError,
  OllamaValidationError,
} from "@voltagent/ollama";

async function main() {
  const ollamaProvider = new OllamaProvider();
  const agent = new Agent({
    name: "ollama-agent",
    description: "An agent that streams structured data via Ollama",
    llm: ollamaProvider,
    model: "gemma3:1b",
  });

  try {
    const _ = await agent.generateText("Hello");
    console.log("Agent response:", _);
  } catch (error) {
    if (error instanceof OllamaModelError) {
      // Handle model-specific errors (e.g., model not found)
      console.error("Model error:", error.message);
      console.error("Status:", error.status);
    } else if (error instanceof OllamaConnectionError) {
      // Handle connection issues (e.g., Ollama server not running)
      console.error("Connection error:", error.message);
    } else if (error instanceof OllamaValidationError) {
      // Handle validation errors (e.g., invalid parameters)
      console.error("Validation error:", error.message);
    } else if (error instanceof OllamaError) {
      // Handle other Ollama-specific errors
      console.error("Ollama error:", error.message);
      console.error("Status:", error.status);
      console.error("Status text:", error.statusText);
      console.error("Error code:", error.code);
    } else {
      // Handle unknown errors
      console.error("Unknown error:", error);
    }
  }
}

main();
```

## Multi-modal Support

⚠️ Currently, the Ollama provider does not support multi-modal inputs (images) through its API. This feature may be added in future versions when Ollama adds native support for multi-modal interactions.

## Advanced Features

### Chat with Format Parameter

The Ollama provider supports structured output formatting using the `chat` method with a format parameter. This is particularly useful when you need the model to return responses in a specific JSON structure:

```typescript
import { Agent } from "@voltagent/core";
import type { MessageRole } from "@voltagent/core";
import { OllamaProvider } from "@voltagent/ollama";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

async function main() {
  const ollamaProvider = new OllamaProvider();

  // Define your schema
  const CharacterSchema = z.object({
    name: z.string(),
    city: z.string(),
    occupation: z.string(),
  });

  const MyInfoSchema = z.object({
    character: CharacterSchema,
  });

  // Create messages
  const messages = [
    {
      role: "user" as MessageRole,
      content: "Create a character profile for Alice",
    },
  ];

  // Use chat with format parameter
  const response = await ollamaProvider.chat({
    model: "gemma3:1b",
    messages: messages,
    format: zodToJsonSchema(MyInfoSchema),
  });

  console.log(JSON.parse(response.message.content));
}

main();
```

### Message Content Handling

The provider supports different types of message content:

1. **String Content**

```typescript
const message = {
  role: "user",
  content: "simple string content",
};
```

2. **Array Content with Text Parts**

```typescript
const message = {
  role: "user",
  content: [
    { type: "text", text: "part 1" },
    { type: "text", text: "part 2" },
  ],
};
```

3. **Mixed Content Types** (Note: image content is currently ignored)

```typescript
const message = {
  role: "user",
  content: [
    { type: "text", text: "text part" },
    { type: "image", image: "base64data" }, // Will be ignored
    { type: "text", text: "more text" },
  ],
};
```

### Usage Information

The provider automatically tracks and returns usage information when available:

```typescript
const response = await agent.generateText("Hello");
if (response.usage) {
  console.log({
    promptTokens: response.usage.promptTokens, // Number of tokens in the prompt
    completionTokens: response.usage.completionTokens, // Number of tokens in the completion
    totalTokens: response.usage.totalTokens, // Total tokens used
  });
}
```

### Message Role Mapping

The provider automatically maps message roles between VoltAgent and Ollama:

- `user` → `user`
- `assistant` → `assistant`
- `system` → `system`
- `tool` → `user` (Ollama doesn't support tool roles)

### System Message Handling in Object Generation

When using `generateObject`, the provider intelligently handles system messages:

```typescript
const systemMessage = {
  role: "system",
  content: "You are a helpful assistant",
};

const response = await agent.generateObject({
  model: "llama2",
  messages: [systemMessage, { role: "user", content: "Generate user info" }],
  schema: userSchema,
});
```

The provider will automatically combine your system message with JSON generation instructions while preserving your original system message content.

## Testing and Reliability

The Ollama provider has been thoroughly tested for:

- Text generation and streaming
- Object generation and streaming
- Error handling and recovery
- Message content processing
- Usage information extraction
- Format parameter support
- System message handling
- Role mapping
- Connection error handling
- Model availability checks

For production use, it's recommended to implement proper error handling and fallback strategies as shown in the error handling examples above.
