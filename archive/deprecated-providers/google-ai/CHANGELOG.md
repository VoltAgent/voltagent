# @voltagent/google-ai

## 0.4.2

### Patch Changes

- [#470](https://github.com/VoltAgent/voltagent/pull/470) [`d7eae54`](https://github.com/VoltAgent/voltagent/commit/d7eae54cbba810046ccb396d8aeca31398e73982) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: deprecate @voltagent/google-ai in favor of @ai-sdk/google

  This package is now deprecated. Please migrate to using `@ai-sdk/google` with `@voltagent/vercel-ai` instead.

  ## Why We're Deprecating

  As the VoltAgent team, we've made the strategic decision to deprecate our native provider implementations because:
  - **Maintenance Burden**: Google frequently updates their Gemini API with new models and features - keeping pace requires continuous effort that doesn't add unique value
  - **Duplicate Effort**: Vercel AI SDK already provides comprehensive Google AI integration that's actively maintained by their team
  - **Feature Parity Challenge**: Implementing all Gemini-specific features (file attachments, safety settings, grounding, etc.) would require substantial development time with no real benefit
  - **Strategic Focus**: By using Vercel AI SDK for providers, we can concentrate on VoltAgent's differentiating features like agent orchestration, memory systems, and workflows

  ## Migration Guide

  ### Step 1: Install New Packages

  ```bash
  npm uninstall @voltagent/google-ai
  npm install @voltagent/vercel-ai @ai-sdk/google@1
  ```

  ### Step 2: Update Your Code

  **Before (deprecated):**

  ```typescript
  import { GoogleAIProvider } from "@voltagent/google-ai";
  import { Agent } from "@voltagent/core";

  const agent = new Agent({
    name: "my-agent",
    llm: new GoogleAIProvider({
      apiKey: process.env.GOOGLE_AI_API_KEY,
    }),
    model: "gemini-1.5-pro",
  });
  ```

  **After (recommended):**

  ```typescript
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { google } from "@ai-sdk/google";
  import { Agent } from "@voltagent/core";

  const agent = new Agent({
    name: "my-agent",
    llm: new VercelAIProvider(),
    model: google("gemini-1.5-pro"),
  });
  ```

  ### Step 3: Environment Variables

  The environment variable has changed:
  - **Before**: `GOOGLE_AI_API_KEY`
  - **After**: `GOOGLE_GENERATIVE_AI_API_KEY`

  Update your `.env` file:

  ```env
  # Old (deprecated)
  GOOGLE_AI_API_KEY=your-api-key

  # New
  GOOGLE_GENERATIVE_AI_API_KEY=your-api-key
  ```

  ## Support

  For more information:
  - [Migration Guide](https://voltagent.dev/docs/providers/google-ai/) - Complete migration instructions
  - [Vercel AI SDK Google Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/google-generative-ai)
  - [VoltAgent Documentation](https://voltagent.dev/docs/providers/vercel-ai)
  - [Google AI Studio](https://aistudio.google.com/) - Get your API key

## 0.4.1

### Patch Changes

- [#454](https://github.com/VoltAgent/voltagent/pull/454) [`07f0889`](https://github.com/VoltAgent/voltagent/commit/07f08896a73db988bcf8f439d8fbeef424624507) Thanks [@yusuf-eren](https://github.com/yusuf-eren)! - feat(google-ai): add maxSteps option to @voltagent/google-ai

- [`90a1316`](https://github.com/VoltAgent/voltagent/commit/90a131622a876c0d91e1b9046a5e1fc143fef6b5) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve code quality with biome linting and package configuration enhancements

  This update focuses on improving code quality and package configuration across the entire VoltAgent monorepo:

  **Key improvements:**
  - **Biome Linting**: Fixed numerous linting issues identified by Biome across all packages, ensuring consistent code style and catching potential bugs
  - **Package Configuration**: Added `publint` script to all packages for strict validation of package.json files to ensure proper publishing configuration
  - **TypeScript Exports**: Fixed `typesVersions` structure in @voltagent/internal package and removed duplicate entries
  - **Test Utilities**: Refactored `createTrackedStorage` function in core package by simplifying its API - removed the `testName` parameter for cleaner test setup
  - **Type Checking**: Enabled `attw` (Are The Types Wrong) checking to ensure TypeScript types are correctly exported

  These changes improve the overall maintainability and reliability of the VoltAgent framework without affecting the public API.

## 0.4.0

### Minor Changes

- [#268](https://github.com/VoltAgent/voltagent/pull/268) [`c5733b9`](https://github.com/VoltAgent/voltagent/commit/c5733b9d2ccb50e807335985362c655c4870072e) Thanks [@luixaviles](https://github.com/luixaviles)! - fix(google-ai): update additionalProperties to avoid zod errors on subagents

  Fixes #114

### Patch Changes

- Updated dependencies [[`f7e5a34`](https://github.com/VoltAgent/voltagent/commit/f7e5a344a5bcb63d1a225e580f01dfa5886b6a01)]:
  - @voltagent/core@0.1.38

## 0.3.14

### Patch Changes

- [#229](https://github.com/VoltAgent/voltagent/pull/229) [`0eba8a2`](https://github.com/VoltAgent/voltagent/commit/0eba8a265c35241da74324613e15801402f7b778) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: migrate the provider streams to `AsyncIterableStream`

  Example:

  ```typescript
  const stream = createAsyncIterableStream(
    new ReadableStream({
      start(controller) {
        controller.enqueue("Hello");
        controller.enqueue(", ");
        controller.enqueue("world!");
        controller.close();
      },
    })
  );

  for await (const chunk of stream) {
    console.log(chunk);
  }

  // in the agent
  const result = await agent.streamObject({
    messages,
    model: "test-model",
    schema,
  });

  for await (const chunk of result.objectStream) {
    console.log(chunk);
  }
  ```

  New exports:
  - `createAsyncIterableStream`
  - `type AsyncIterableStream`

- Updated dependencies [[`f2f4539`](https://github.com/VoltAgent/voltagent/commit/f2f4539af7722f25a5aad9f01c2b7b5e50ba51b8), [`0eba8a2`](https://github.com/VoltAgent/voltagent/commit/0eba8a265c35241da74324613e15801402f7b778)]:
  - @voltagent/core@0.1.32

## 0.3.13

### Patch Changes

- [#226](https://github.com/VoltAgent/voltagent/pull/226) [`d879e6d`](https://github.com/VoltAgent/voltagent/commit/d879e6d41757081420162cf983223683b72b66a5) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: add toolName to tool-result steps

  Tool result steps now include the toolName field, ensuring proper identification of which tool generated each result in conversation flows and hook messages.

## 0.3.12

### Patch Changes

- [#213](https://github.com/VoltAgent/voltagent/pull/213) [`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f) Thanks [@baseballyama](https://github.com/baseballyama)! - chore!: drop Node.js v18

- Updated dependencies [[`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f), [`80fd3c0`](https://github.com/VoltAgent/voltagent/commit/80fd3c069de4c23116540a55082b891c4b376ce6)]:
  - @voltagent/core@0.1.31

## 0.3.11

### Patch Changes

- [#160](https://github.com/VoltAgent/voltagent/pull/160) [`03ed437`](https://github.com/VoltAgent/voltagent/commit/03ed43723cd56f29ac67088f0624a88632a14a1b) Thanks [@omeraplak](https://github.com/omeraplak)! - refactor: remove peer dependencies and update package configuration
  - Remove `@voltagent/core` peer dependency from Google AI and Groq AI packages
  - Clean up package.json formatting and configuration
  - Improve dependency management for better compatibility

- Updated dependencies [[`03ed437`](https://github.com/VoltAgent/voltagent/commit/03ed43723cd56f29ac67088f0624a88632a14a1b)]:
  - @voltagent/core@0.1.21

## 0.3.10

### Patch Changes

- [#155](https://github.com/VoltAgent/voltagent/pull/155) [`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: update `tsconfig.json`'s `target` to `ES2022`

- [#162](https://github.com/VoltAgent/voltagent/pull/162) [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: pin zod version to 3.24.2 to avoid "Type instantiation is excessively deep and possibly infinite" error

  Fixed compatibility issues between different zod versions that were causing TypeScript compilation errors. This issue occurs when multiple packages use different patch versions of zod (e.g., 3.23.x vs 3.24.x), leading to type instantiation depth problems. By pinning to 3.24.2, we ensure consistent behavior across all packages.

  See: https://github.com/colinhacks/zod/issues/3435

- Updated dependencies [[`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c), [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af), [`9412cf0`](https://github.com/VoltAgent/voltagent/commit/9412cf0633f20d6b77c87625fc05e9e216936758)]:
  - @voltagent/core@0.1.20

## 0.3.9

### Patch Changes

- [`85204e2`](https://github.com/VoltAgent/voltagent/commit/85204e24eea3a0aa5ad72038954302a182947fe0) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add provider options support including thinkingConfig - #138

  ```typescript
  const response = await agent.generateText("Write a creative story.", {
    provider: {
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  });
  ```

## 0.3.8

### Patch Changes

- [#122](https://github.com/VoltAgent/voltagent/pull/122) [`de83eaf`](https://github.com/VoltAgent/voltagent/commit/de83eaf76af5b88fb4303ff60fd8af36369fda63) Thanks [@luixaviles](https://github.com/luixaviles)! - feat(google-ai): include tool calls and results in generateText response

  Fixes #115

- Updated dependencies [[`d6cf2e1`](https://github.com/VoltAgent/voltagent/commit/d6cf2e194d47352565314c93f1a4e477701563c1)]:
  - @voltagent/core@0.1.19

## 0.3.7

### Patch Changes

- [`3fdef67`](https://github.com/VoltAgent/voltagent/commit/3fdef675bfac9d227592805f337396eae15f03ca) Thanks [@omeraplak](https://github.com/omeraplak)! - chore: only the `dist` directory is included in the published npm package.

## 0.3.6

### Patch Changes

- [#109](https://github.com/VoltAgent/voltagent/pull/109) [`5589efd`](https://github.com/VoltAgent/voltagent/commit/5589efd25d16f6bb226f2735ffa457e38fe079ab) Thanks [@luixaviles](https://github.com/luixaviles)! - feat(google-ai): enchance streamText with function call handling

- Updated dependencies [[`0a120f4`](https://github.com/VoltAgent/voltagent/commit/0a120f4bf1b71575a4b6c67c94104633c58e1410)]:
  - @voltagent/core@0.1.18

## 0.3.4

### Patch Changes

- [#102](https://github.com/VoltAgent/voltagent/pull/102) [`cdfec65`](https://github.com/VoltAgent/voltagent/commit/cdfec657f731fdc1b6d0c307376e3299813f55d3) Thanks [@omeraplak](https://github.com/omeraplak)! - refactor: use 'instructions' field for Agent definitions in examples - #88

  Updated documentation examples (READMEs, docs, blogs) and relevant package code examples to use the `instructions` field instead of `description` when defining `Agent` instances.

  This change aligns the examples with the preferred API usage for the `Agent` class, where `instructions` provides behavioral guidance to the agent/LLM. This prepares for the eventual deprecation of the `description` field specifically for `Agent` class definitions.

  **Example Change for Agent Definition:**

  ```diff
    const agent = new Agent({
      name: "My Assistant",
  -   description: "A helpful assistant.",
  +   instructions: "A helpful assistant.",
      llm: new VercelAIProvider(),
      model: openai("gpt-4o-mini"),
    });
  ```

- Updated dependencies [[`cdfec65`](https://github.com/VoltAgent/voltagent/commit/cdfec657f731fdc1b6d0c307376e3299813f55d3)]:
  - @voltagent/core@0.1.14

## 0.3.3

### Patch Changes

- [#99](https://github.com/VoltAgent/voltagent/pull/99) [`82c1066`](https://github.com/VoltAgent/voltagent/commit/82c1066462456aa71bb9427cfd46d061235088d5) Thanks [@luixaviles](https://github.com/luixaviles)! - feat(google-ai): add function calling support for Google SDK integration

- [`13db262`](https://github.com/VoltAgent/voltagent/commit/13db2621ae6b730667f9991d3c2129c85265e925) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Update Zod to version 3.24.2 to resolve "Type instantiation is excessively deep and possibly infinite" error (related to https://github.com/colinhacks/zod/issues/3435).

- Updated dependencies [[`f7de864`](https://github.com/VoltAgent/voltagent/commit/f7de864503d598cf7131cc01afa3779639190107), [`13db262`](https://github.com/VoltAgent/voltagent/commit/13db2621ae6b730667f9991d3c2129c85265e925)]:
  - @voltagent/core@0.1.13

## 0.3.2

### Patch Changes

- [`340feee`](https://github.com/VoltAgent/voltagent/commit/340feee1162e74c52def337af8f35d8d3117eefc) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Add index signature `[key: string]: any;` to `GoogleProviderRuntimeOptions`. This allows passing arbitrary extra options to the Google AI provider, alongside refactoring types to prevent TypeScript deep instantiation errors.

- Updated dependencies [[`e5b3a46`](https://github.com/VoltAgent/voltagent/commit/e5b3a46e2e61f366fa3c67f9a37d4e4d9e0fe426), [`4649c3c`](https://github.com/VoltAgent/voltagent/commit/4649c3ccb9e56a7fcabfe6a0bcef2383ff6506ef), [`8e6d2e9`](https://github.com/VoltAgent/voltagent/commit/8e6d2e994398c1a727d4afea39d5e34ffc4a5fca)]:
  - @voltagent/core@0.1.11

## 0.3.1

### Patch Changes

- [#77](https://github.com/VoltAgent/voltagent/pull/77) [`beaa8fb`](https://github.com/VoltAgent/voltagent/commit/beaa8fb1f1bc6351f1bede0b65a6a189cc1b6ea2) Thanks [@omeraplak](https://github.com/omeraplak)! - **API & Providers:** Standardized message content format for array inputs.
  - The API (`/text`, `/stream`, `/object`, `/stream-object` endpoints) now strictly expects the `content` field within message objects (when `input` is an array) to be either a `string` or an `Array` of content parts (e.g., `[{ type: 'text', text: '...' }]`).
  - The previous behavior of allowing a single content object (e.g., `{ type: 'text', ... }`) directly as the value for `content` in message arrays is no longer supported in the API schema. Raw string inputs remain unchanged.
  - Provider logic (`google-ai`, `groq-ai`, `xsai`) updated to align with this stricter definition.

  **Console:**
  - **Added file and image upload functionality to the Assistant Chat.** Users can now attach multiple files/images via a button, preview attachments, and send them along with text messages.
  - Improved the Assistant Chat resizing: Replaced size toggle buttons with a draggable handle (top-left corner).
  - Chat window dimensions are now saved to local storage and restored on reload.

  **Internal:**
  - Added comprehensive test suites for Groq and XsAI providers.

- Updated dependencies [[`beaa8fb`](https://github.com/VoltAgent/voltagent/commit/beaa8fb1f1bc6351f1bede0b65a6a189cc1b6ea2)]:
  - @voltagent/core@0.1.10

## 0.3.0

### Minor Changes

- [#52](https://github.com/VoltAgent/voltagent/pull/52) [`96f2395`](https://github.com/VoltAgent/voltagent/commit/96f239548a207d8cf34694999129980a7998f6e1) Thanks [@foxy17](https://github.com/foxy17)! - feat: Add `generateObject` method for structured JSON output via Zod schemas and Google's JSON mode.
  feat: Add support for reading the Google GenAI API key from the `GEMINI_API_KEY` environment variable as a fallback.

### Patch Changes

- Updated dependencies [[`55c58b0`](https://github.com/VoltAgent/voltagent/commit/55c58b0da12dd94a3095aad4bc74c90757c98db4), [`d40cb14`](https://github.com/VoltAgent/voltagent/commit/d40cb14860a5abe8771e0b91200d10f522c62881), [`e88cb12`](https://github.com/VoltAgent/voltagent/commit/e88cb1249c4189ced9e245069bed5eab71cdd894), [`0651d35`](https://github.com/VoltAgent/voltagent/commit/0651d35442cda32b6057f8b7daf7fd8655a9a2a4)]:
  - @voltagent/core@0.1.8

## 0.2.0

### Minor Changes

- [#29](https://github.com/VoltAgent/voltagent/pull/29) [`82e27c2`](https://github.com/VoltAgent/voltagent/commit/82e27c2bcd19fbf476d7812b91df3ab399a03357) Thanks [@foxy17](https://github.com/foxy17)! - feat(google-ai): Add initial Google AI provider package - #12

  Introduces the `@voltagent/google-ai` package to integrate Google's Generative AI capabilities directly into VoltAgent. This allows developers to leverage powerful models like Gemini within their agents.

  This initial version includes:
  - The core `GoogleGenAIProvider` class for interfacing with the `@google/genai` SDK.
  - Configuration options for API key authentication.
  - Basic setup and usage examples in the README.
  - Documentation outlining future support and considerations for Vertex AI.

### Patch Changes

- Updated dependencies [[`52d5fa9`](https://github.com/VoltAgent/voltagent/commit/52d5fa94045481dc43dc260a40b701606190585c), [`3ef2eaa`](https://github.com/VoltAgent/voltagent/commit/3ef2eaa9661e8ecfebf17af56b09af41285d0ca9), [`52d5fa9`](https://github.com/VoltAgent/voltagent/commit/52d5fa94045481dc43dc260a40b701606190585c)]:
  - @voltagent/core@0.1.6
