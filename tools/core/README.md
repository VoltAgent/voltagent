# VoltAgent Provider Generator

This directory contains the Nx generator for creating new VoltAgent provider packages. The generator creates a complete provider package structure with all necessary files, configurations, and testing setup.

## 🚀 Quick Start

To create a new provider package, run the following command from the workspace root:

```bash
npx nx generate @voltagent/core:provider <provider-name>
```

Replace `<provider-name>` with your provider name in kebab-case (e.g., `openai`, `anthropic-ai`, `google-ai`).

### Example

```bash
npx nx generate @voltagent/core:provider my-ai-provider
```

This will create a new provider package at `packages/my-ai-provider/` with all the necessary files and configurations.

## 📁 Generated Structure

The generator creates the following file structure:

```
packages/<provider-name>/
├── README.md                    # Provider documentation
├── biome.json                   # Biome linting configuration
├── package.json                 # Package configuration
├── tsconfig.json               # TypeScript configuration
├── tsup.config.ts              # Build configuration
├── vitest.config.mts           # Test configuration
└── src/
    ├── index.ts                # Main export file
    ├── provider.ts             # Provider implementation
    ├── provider.spec.ts        # Comprehensive test suite
    └── testing.ts              # Testing utilities
```

## 📋 Generated Files Overview

### `package.json`

- Pre-configured with VoltAgent naming convention (`@voltagent/<name>`)
- Includes all necessary dependencies and dev dependencies
- Configured build, test, and lint scripts
- Proper exports for ESM and CommonJS

### `src/provider.ts`

- Template provider class implementing `LLMProvider` interface
- Stubbed methods for all required provider operations:
  - `generateText()` - Generate text responses
  - `streamText()` - Stream text responses
  - `generateObject()` - Generate structured objects
  - `streamObject()` - Stream structured objects
  - `getModelIdentifier()` - Get model identifier
  - `toMessage()` - Convert VoltAgent messages to provider format

### `src/provider.spec.ts`

- Comprehensive test suite covering all provider methods
- Tests for error handling, streaming, and object generation
- Mock utilities for testing provider responses
- Type safety tests for generated objects

### `src/testing.ts`

- Mock model creation utilities
- Helper functions for testing provider implementations

### Configuration Files

- `biome.json` - Linting and formatting configuration
- `tsconfig.json` - TypeScript compilation settings
- `tsup.config.ts` - Build tool configuration
- `vitest.config.mts` - Test runner configuration

## 🔧 Implementation Steps

After generating the provider package, follow these steps to implement your provider:

### 1. Install Provider Dependencies

Navigate to your new provider directory and install the required dependencies:

```bash
cd packages/<provider-name>
npm install <provider-sdk-package>
```

### 2. Implement the Provider Class

Edit `src/provider.ts` and implement the required methods:

```typescript
import { YourProviderSDK } from "your-provider-sdk";

export class YourProviderProvider implements LLMProvider<YourProviderModel> {
  private client: YourProviderSDK;

  constructor(config?: YourProviderConfig) {
    this.client = new YourProviderSDK(config);
  }

  public async generateText(
    options: GenerateTextOptions<YourProviderModel>
  ): Promise<ProviderTextResponse<YourProviderModel>> {
    // Implement text generation logic
    const response = await this.client.chat({
      messages: options.messages.map((msg) => this.toMessage(msg)),
      model: options.model,
      // ... other options
    });

    return {
      text: response.content,
      provider: response,
      usage: response.usage,
      finishReason: response.finishReason,
    };
  }

  // Implement other methods...
}
```

### 3. Update Type Definitions

Replace the `any` types in the generated template with proper types from your provider SDK:

```typescript
// Replace this:
export class YourProviderProvider implements LLMProvider<any> {

// With this:
export class YourProviderProvider implements LLMProvider<YourProviderModel> {
```

### 4. Implement Message Conversion

Implement the `toMessage()` method to convert VoltAgent messages to your provider's format:

```typescript
public toMessage(message: BaseMessage): YourProviderMessage {
  return {
    role: message.role,
    content: message.content,
    // ... any additional fields your provider requires
  };
}
```

### 5. Update Testing Utilities

Edit `src/testing.ts` to create proper mock models for your provider:

```typescript
export function createMockModel(
  output: Error | BaseMessage[] | Record<string, any>
): YourProviderModel {
  if (output instanceof Error) {
    throw output;
  }

  return {
    // Return a mock model that matches your provider's model structure
    id: "mock-model",
    // ... other model properties
  };
}
```

### 6. Update Package Dependencies

Edit `package.json` to include your provider's SDK and any other required dependencies:

```json
{
  "dependencies": {
    "@voltagent/core": "^0.1.31",
    "your-provider-sdk": "^1.0.0"
  }
}
```

### 7. Update Documentation

Edit `README.md` to include:

- Provider-specific installation instructions
- Configuration examples
- Usage examples with your provider
- Any provider-specific features or limitations

## 🧪 Testing Your Provider

The generated test suite provides comprehensive coverage. Run tests with:

```bash
npm test
```

The test suite includes:

- Text generation tests
- Streaming tests
- Object generation tests
- Error handling tests
- Type safety tests

## 📦 Building and Publishing

Build your provider package:

```bash
npm run build
```

The build process creates:

- CommonJS bundle (`dist/index.js`)
- ESM bundle (`dist/index.mjs`)
- TypeScript declarations (`dist/index.d.ts`)

## 🔗 Integration with VoltAgent

Once implemented, your provider can be used in VoltAgent applications:

```typescript
import { Agent } from "@voltagent/core";
import { YourProviderProvider } from "@voltagent/your-provider";

const agent = new Agent({
  id: "my-agent",
  purpose: "Do agentic things",
  instructions: "You are an AI agent...",
  llm: new YourProviderProvider({
    // Your provider configuration
  }),
});
```

## 📝 Best Practices

1. **Follow the Interface**: Ensure your provider implements all required methods from the `LLMProvider` interface
2. **Handle Errors Properly**: Wrap provider-specific errors in VoltAgent's error format
3. **Type Safety**: Use proper TypeScript types instead of `any`
4. **Testing**: Maintain high test coverage and add provider-specific tests
5. **Documentation**: Keep README.md updated with usage examples and configuration options
6. **Versioning**: Follow semantic versioning for your provider package

## 🐛 Troubleshooting

### Common Issues

1. **Type Errors**: Make sure to replace all `any` types with proper provider types
2. **Build Failures**: Check that all dependencies are properly installed
3. **Test Failures**: Ensure your mock models match the expected provider model structure
4. **Import Errors**: Verify that your provider exports are correctly configured in `src/index.ts`

### Getting Help

- Check existing provider implementations in the `packages/` directory for examples
- Review the VoltAgent core documentation for interface requirements
- Ensure your provider follows the same patterns as existing providers

## 📚 Examples

See existing provider implementations for reference:

- `packages/vercel-ai/` - Vercel AI SDK integration
- `packages/anthropic-ai/` - Anthropic Claude integration
- `packages/google-ai/` - Google AI integration
- `packages/groq-ai/` - Groq integration
