---
title: Contributing a new Provider
slug: /providers/contributing
---

# Contributing a new Provider

Thank your for your interest in contributing a new VoltAgent provider. This guide will walk you through the process of creating a new provider in under 15 minutes!

## Prerequisites

- Node.js 24+
- pnpm
- [VoltAgent repo](https://github.com/Voltagent/voltagent) cloned locally

## TL;DR:

1. Generate a new provider using the generator `pnpm nx generate @voltagent/core:provider acme-ai`
2. Install dependencies `cd packages/acme-ai && pnpm install acme-ai-sdk`
3. Implement all required methods in `src/provider.ts`
4. Verify tests pass in `src/provider.spec.ts` and add any new tests to `src/provider-custom.spec.ts`
5. Verify `pnpm build` passes (this will also run typescript checks)
6. Update `README.md` with usage examples and any other relevant information
7. Submit PR to contribute back

## Detailed Guide

### 1. Generate Provider

You can use the generator to create a new provider. This will create a new directory in `packages/` with the provider name and all the necessary files.

```bash
pnpm nx generate @voltagent/core:provider acme-ai
```

### 2. Install Dependencies

You will need to `cd` into the provider directory and install the dependencies for the provider.

```bash
cd packages/acme-ai
pnpm install acme-ai-sdk
```

### 3. Implement Provider

Edit `src/provider.ts` and make sure to implement all required methods and update all the `any` types to the correct types from the provider.

:::tip Pro Tip

All methods **MUST** have the `public`, `private` or `protected` modifier. See the [vercel-ai provider](https://github.com/VoltAgent/voltagent/blob/main/packages/vercel-ai/src/provider.ts) for a well built example.

:::

#### Example

```typescript
import { LLMProvider, GenerateTextOptions, ProviderTextResponse } from "@voltagent/core";
import { AcmeAI, ModelV1 } from "acme-ai-sdk";

export class AcmeAIProvider implements LLMProvider<{ model: ModelV1 }> {
  private client: AcmeAI;

  constructor(config?: { apiKey?: string }) {
    this.client = new AcmeAI({
      apiKey: config?.apiKey ?? process.env.ACME_AI_API_KEY,
    });
  }

  public async generateText(
    options: GenerateTextOptions<string>
  ): Promise<ProviderTextResponse<string>> {
    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: options.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });

    return {
      text: response.choices[0].message.content,
      provider: response,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      finishReason: response.choices[0].finish_reason,
    };
  }

  // Implement other required methods (streamText, generateObject, streamObject)
  // See generated template for full implementation
}
```

### 4. Verify Tests Pass

You will need to run the tests to make sure your provider is working correctly.

```bash
pnpm test
```

The tests in `provider.spec.ts` are standard for all providers and will help you get started. If you need to add new tests, its recommended to create a new file (e.g. `provider-custom.spec.ts`) in the same directory as the provider, as the `provider.spec.ts` file could be overwritten by the generator in the future.

### 5. Verify Build

You should also test running a build to make sure your provider is output correctly.

```bash
pnpm build
```

### 6. Update README

Update the `README.md` file to include usage examples and any other relevant information, for example:

```markdown
# Acme AI Provider

This is a provider for the Acme AI API.

## Usage

\`\`\`typescript
import { Agent } from "@voltagent/core";
import { AcmeAIProvider } from "@voltagent/acme-ai";

const agent = new Agent({
id: "my-agent",
purpose: "Help users",
instructions: "You are helpful",
llm: new AcmeAIProvider(),
});

const response = await agent.generateText({
model: "acme-ai-4o",
messages: [{ role: "user", content: "Hello!" }],
});
\`\`\`
```

### 7. Ship it!

If you've followed all the steps above, you can submit a PR to the VoltAgent repo!
