# @voltagent/openrouter

OpenRouter provider integration for VoltAgent.

## Installation

```bash
npm install @voltagent/openrouter
```

## Usage

```typescript
import { Agent } from "@voltagent/core";
import { OpenRouterProvider } from "@voltagent/openrouter";

const agent = new Agent({
  name: "my-openrouter-agent",
  instructions: "You are a helpful assistant.",
  llm: new OpenRouterProvider({
    apiKey: process.env.OPENROUTER_API_KEY, // Optional: defaults to env var
    httpReferer: "https://your-app.com", // Optional: for OpenRouter's referer tracking
    xTitle: "Your App Name", // Optional: for OpenRouter's title tracking
  }),
  model: "openai/gpt-4o-mini",
});

// Generate text
const response = await agent.generateText("Hello, world!");
console.log(response.text);
```

## Configuration

The OpenRouterProvider accepts the following options:

- `apiKey` (optional): Your OpenRouter API key. Defaults to `process.env.OPENROUTER_API_KEY`
- `baseURL` (optional): The base URL for OpenRouter API. Defaults to `https://openrouter.ai/api/v1`
- `httpReferer` (optional): HTTP Referer header for OpenRouter's tracking
- `xTitle` (optional): X-Title header for OpenRouter's tracking

## Features

- ✅ Text generation
- ✅ Streaming text generation
- ✅ Object generation with Zod schemas
- ✅ Tool calling support
- ✅ Usage tracking
- ✅ Error handling

## Models

This provider supports all models available through OpenRouter. Popular options include:

- `openai/gpt-4o`
- `openai/gpt-4o-mini`
- `anthropic/claude-3-5-sonnet`
- `google/gemini-pro`
- `meta-llama/llama-3-70b-instruct`

See [OpenRouter's model list](https://openrouter.ai/models) for all available models.

## Environment Variables

```bash
OPENROUTER_API_KEY=your_api_key_here
```

## License

MIT
