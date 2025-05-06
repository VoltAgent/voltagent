# Voltagent Ollama Provider

This package provides Ollama integration for Voltagent, allowing you to use your locally hosted Ollama models with Voltagent.

## Installation

```bash
npm install @voltagent/ollama
# or
yarn add @voltagent/ollama
# or
pnpm add @voltagent/ollama
```

## Prerequisites

1. [Install Ollama](https://ollama.ai/download) on your machine
2. Pull the models you want to use:
   ```bash
   ollama pull llama3
   # or any other model you want to use
   ```
3. Ensure Ollama is running:
   ```bash
   ollama serve
   ```

## Usage

```typescript
import { Agent } from "@voltagent/core";
import { OllamaProvider } from "@voltagent/ollama";

// Initialize the Ollama provider
const ollama = new OllamaProvider({
  // Optional: provide a custom URL if Ollama is not running on the default localhost:11434
  baseUrl: "http://localhost:11434",
});

// Create an agent using the Ollama provider
const agent = new Agent({
  name: "LocalLLMAgent",
  description: "An agent that uses a local Ollama model",
  llm: ollama,
  // Specify the model name - this should match a model you've pulled in Ollama
  model: "llama3",
});

// Use the agent
const response = await agent.generateText("Hello, what can you do for me?");
console.log(response.text);
```

## Configuration Options

The `OllamaProvider` accepts the following options:

| Option    | Type   | Default                  | Description                     |
| --------- | ------ | ------------------------ | ------------------------------- |
| `baseUrl` | string | `http://localhost:11434` | The URL where Ollama is running |

## Provider-Specific Options

When calling agent methods, you can pass provider-specific options:

```typescript
const response = await agent.generateText("What is the capital of France?", {
  provider: {
    temperature: 0.7,
    maxTokens: 500,
    topP: 0.9,
    seed: 123,
  },
});
```

## Available Models

The available models depend on what you've pulled to your Ollama instance. Common models include:

- `llama3`
- `mistral`
- `gemma`
- `phi`
- `llama2`
- `llama2-uncensored`
- `orca-mini`
- `codellama`
- `stable-code`

Check the [Ollama model library](https://ollama.ai/library) for the full list of available models.

## Features

### Supported

- Text generation via `generateText` and `streamText`
- Basic object generation via `generateObject` and `streamObject` (using system prompting for JSON formatting)
- Streaming responses
- Basic token usage metrics when available from Ollama

### Limitations

- Ollama doesn't natively support structured JSON outputs, so `generateObject` and `streamObject` use prompt engineering
- Ollama doesn't yet support function/tool calling in a standardized way
- Image inputs are not supported by Ollama's API
- Some advanced options like response format or JSON mode are not natively supported

## Example with Streaming

```typescript
const stream = await agent.streamText("Tell me a story about a robot");

// Process the stream
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

## License

MIT
