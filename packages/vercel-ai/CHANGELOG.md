# @voltagent/vercel-ai

## 1.0.0-next.0

### Patch Changes

- Updated dependencies [[`64a50e6`](https://github.com/VoltAgent/voltagent/commit/64a50e6800dec844fad7b9f3a3b1c2c8d0486229), [`9e8b211`](https://github.com/VoltAgent/voltagent/commit/9e8b2119a783942f114459f0a9b93e645727445e)]:
  - @voltagent/core@1.0.0-next.0

## 0.1.18

### Patch Changes

- [#475](https://github.com/VoltAgent/voltagent/pull/475) [`9b4ea38`](https://github.com/VoltAgent/voltagent/commit/9b4ea38b28df248c1e1ad5541d414bd47838df9a) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: Remove other potentially problematic `JSON.stringify` usages

## 0.1.17

### Patch Changes

- [`90a1316`](https://github.com/VoltAgent/voltagent/commit/90a131622a876c0d91e1b9046a5e1fc143fef6b5) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve code quality with biome linting and package configuration enhancements

  This update focuses on improving code quality and package configuration across the entire VoltAgent monorepo:

  **Key improvements:**
  - **Biome Linting**: Fixed numerous linting issues identified by Biome across all packages, ensuring consistent code style and catching potential bugs
  - **Package Configuration**: Added `publint` script to all packages for strict validation of package.json files to ensure proper publishing configuration
  - **TypeScript Exports**: Fixed `typesVersions` structure in @voltagent/internal package and removed duplicate entries
  - **Test Utilities**: Refactored `createTrackedStorage` function in core package by simplifying its API - removed the `testName` parameter for cleaner test setup
  - **Type Checking**: Enabled `attw` (Are The Types Wrong) checking to ensure TypeScript types are correctly exported

  These changes improve the overall maintainability and reliability of the VoltAgent framework without affecting the public API.

## 0.1.16

### Patch Changes

- [#425](https://github.com/VoltAgent/voltagent/pull/425) [`8605e70`](https://github.com/VoltAgent/voltagent/commit/8605e708d17e6fa0150bd13235e795288422c52b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Promise-based properties and warnings to AI responses - #422

  Enhanced AI response types to align with Vercel AI SDK's API and provide better metadata:

  **For `streamObject`:**
  - Added optional `object?: Promise<T>` property that resolves to the final generated object
  - Added optional `usage?: Promise<UsageInfo>` property that resolves to token usage information
  - Added optional `warnings?: Promise<any[] | undefined>` property for provider warnings

  **For `streamText`:**
  - Added optional `text?: Promise<string>` property that resolves to the full generated text
  - Added optional `finishReason?: Promise<string>` property that resolves to the reason generation stopped
  - Added optional `usage?: Promise<UsageInfo>` property that resolves to token usage information
  - Added optional `reasoning?: Promise<string | undefined>` property that resolves to model's reasoning text

  **For `generateText` and `generateObject`:**
  - Added optional `reasoning?: string` property for model's reasoning text (generateText only)
  - Added optional `warnings?: any[]` property for provider warnings

  These properties are optional to maintain backward compatibility. Providers that support these features (like Vercel AI) now return these values, allowing users to access rich metadata:

  ```typescript
  // For streamObject
  const response = await agent.streamObject(input, schema);
  const finalObject = await response.object; // Promise<T>
  const usage = await response.usage; // Promise<UsageInfo>

  // For streamText
  const response = await agent.streamText(input);
  const fullText = await response.text; // Promise<string>
  const usage = await response.usage; // Promise<UsageInfo>

  // For generateText
  const response = await agent.generateText(input);
  console.log(response.warnings); // Any provider warnings
  console.log(response.reasoning); // Model's reasoning (if available)
  ```

- Updated dependencies [[`8605e70`](https://github.com/VoltAgent/voltagent/commit/8605e708d17e6fa0150bd13235e795288422c52b)]:
  - @voltagent/core@0.1.69

## 0.1.15

### Patch Changes

- [`1f8ce22`](https://github.com/VoltAgent/voltagent/commit/1f8ce226fec449f16f1dce6c2b96cef7030eff3a) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: zod peer dependency to allow flexible versioning (^3.24.2 instead of 3.24.2) to resolve npm install conflicts

- Updated dependencies [[`1f8ce22`](https://github.com/VoltAgent/voltagent/commit/1f8ce226fec449f16f1dce6c2b96cef7030eff3a)]:
  - @voltagent/core@0.1.66

## 0.1.14

### Patch Changes

- [#401](https://github.com/VoltAgent/voltagent/pull/401) [`4a7145d`](https://github.com/VoltAgent/voltagent/commit/4a7145debd66c7b1dfb953608e400b6c1ed02db7) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: resolve TypeScript performance issues by fixing Zod dependency configuration (#377)

  Moved Zod from direct dependencies to peer dependencies in @voltagent/vercel-ai to prevent duplicate Zod installations that were causing TypeScript server slowdowns. Also standardized Zod versions across the workspace to ensure consistency.

  Changes:
  - @voltagent/vercel-ai: Moved `zod` from dependencies to peerDependencies
  - @voltagent/docs-mcp: Updated `zod` from `^3.23.8` to `3.24.2`
  - @voltagent/with-postgres: Updated `zod` from `^3.24.2` to `3.24.2` (removed caret)

  This fix significantly improves TypeScript language server performance by ensuring only one Zod version is processed, eliminating the "Type instantiation is excessively deep and possibly infinite" errors that users were experiencing.

- Updated dependencies [[`57c4874`](https://github.com/VoltAgent/voltagent/commit/57c4874d4d4807c50242b2e34ab9574fc6129888), [`da66f86`](https://github.com/VoltAgent/voltagent/commit/da66f86d92a278007c2d3386d22b482fa70d93ff), [`4a7145d`](https://github.com/VoltAgent/voltagent/commit/4a7145debd66c7b1dfb953608e400b6c1ed02db7)]:
  - @voltagent/core@0.1.61

## 0.1.13

### Patch Changes

- [`8eced6d`](https://github.com/VoltAgent/voltagent/commit/8eced6dad9c688a33b4700a6fc4be34bfc3ba88b) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: resolve onStepFinishHandler issue preventing tool_calls and hooks from functioning properly

  Fixed a critical bug in the Vercel AI provider where the `onStepFinishHandler` was blocking tool calls and agent hooks from executing correctly. This issue was preventing agents from properly utilizing tools and executing lifecycle hooks during operations.

## 0.1.12

### Patch Changes

- [#251](https://github.com/VoltAgent/voltagent/pull/251) [`be0cf47`](https://github.com/VoltAgent/voltagent/commit/be0cf47ec6e9640119d752dd6b608097d06bf69d) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add fullStream support for generative UIs

  Added `fullStream` support to the Vercel AI provider for better streaming in generative UI applications.

- Updated dependencies [[`be0cf47`](https://github.com/VoltAgent/voltagent/commit/be0cf47ec6e9640119d752dd6b608097d06bf69d), [`a3b4e60`](https://github.com/VoltAgent/voltagent/commit/a3b4e604e6f79281903ff0c28422e6ee2863b340), [`20119ad`](https://github.com/VoltAgent/voltagent/commit/20119ada182ec5f313a7f46956218d593180e096)]:
  - @voltagent/core@0.1.36

## 0.1.11

### Patch Changes

- [#226](https://github.com/VoltAgent/voltagent/pull/226) [`d879e6d`](https://github.com/VoltAgent/voltagent/commit/d879e6d41757081420162cf983223683b72b66a5) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: add toolName to tool-result steps

  Tool result steps now include the toolName field, ensuring proper identification of which tool generated each result in conversation flows and hook messages.

## 0.1.10

### Patch Changes

- [#213](https://github.com/VoltAgent/voltagent/pull/213) [`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f) Thanks [@baseballyama](https://github.com/baseballyama)! - chore!: drop Node.js v18

- Updated dependencies [[`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f), [`80fd3c0`](https://github.com/VoltAgent/voltagent/commit/80fd3c069de4c23116540a55082b891c4b376ce6)]:
  - @voltagent/core@0.1.31

## 0.1.9

### Patch Changes

- [#155](https://github.com/VoltAgent/voltagent/pull/155) [`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: update `tsconfig.json`'s `target` to `ES2022`

- [#162](https://github.com/VoltAgent/voltagent/pull/162) [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: pin zod version to 3.24.2 to avoid "Type instantiation is excessively deep and possibly infinite" error

  Fixed compatibility issues between different zod versions that were causing TypeScript compilation errors. This issue occurs when multiple packages use different patch versions of zod (e.g., 3.23.x vs 3.24.x), leading to type instantiation depth problems. By pinning to 3.24.2, we ensure consistent behavior across all packages.

  See: https://github.com/colinhacks/zod/issues/3435

- Updated dependencies [[`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c), [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af), [`9412cf0`](https://github.com/VoltAgent/voltagent/commit/9412cf0633f20d6b77c87625fc05e9e216936758)]:
  - @voltagent/core@0.1.20

## 0.1.7

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

## 0.1.6

### Patch Changes

- [`13db262`](https://github.com/VoltAgent/voltagent/commit/13db2621ae6b730667f9991d3c2129c85265e925) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Update Zod to version 3.24.2 to resolve "Type instantiation is excessively deep and possibly infinite" error (related to https://github.com/colinhacks/zod/issues/3435).

- Updated dependencies [[`f7de864`](https://github.com/VoltAgent/voltagent/commit/f7de864503d598cf7131cc01afa3779639190107), [`13db262`](https://github.com/VoltAgent/voltagent/commit/13db2621ae6b730667f9991d3c2129c85265e925)]:
  - @voltagent/core@0.1.13

## 0.1.5

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

## 0.1.4

### Patch Changes

- [#71](https://github.com/VoltAgent/voltagent/pull/71) [`1f20509`](https://github.com/VoltAgent/voltagent/commit/1f20509528fc2cb2ba00f86d649848afae34af04) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Standardize Agent Error and Finish Handling

  This change introduces a more robust and consistent way errors and successful finishes are handled across the `@voltagent/core` Agent and LLM provider implementations (like `@voltagent/vercel-ai`).

  **Key Improvements:**
  - **Standardized Errors (`VoltAgentError`):**
    - Introduced `VoltAgentError`, `ToolErrorInfo`, and `StreamOnErrorCallback` types in `@voltagent/core`.
    - LLM Providers (e.g., Vercel) now wrap underlying SDK/API errors into a structured `VoltAgentError` before passing them to `onError` callbacks or throwing them.
    - Agent methods (`generateText`, `streamText`, `generateObject`, `streamObject`) now consistently handle `VoltAgentError`, enabling richer context (stage, code, tool details) in history events and logs.

  - **Standardized Stream Finish Results:**
    - Introduced `StreamTextFinishResult`, `StreamTextOnFinishCallback`, `StreamObjectFinishResult`, and `StreamObjectOnFinishCallback` types in `@voltagent/core`.
    - LLM Providers (e.g., Vercel) now construct these standardized result objects upon successful stream completion.
    - Agent streaming methods (`streamText`, `streamObject`) now receive these standardized results in their `onFinish` handlers, ensuring consistent access to final output (`text` or `object`), `usage`, `finishReason`, etc., for history, events, and hooks.

  - **Updated Interfaces:** The `LLMProvider` interface and related options types (`StreamTextOptions`, `StreamObjectOptions`) have been updated to reflect these new standardized callback types and error-throwing expectations.

  These changes lead to more predictable behavior, improved debugging capabilities through structured errors, and a more consistent experience when working with different LLM providers.

- Updated dependencies [[`1f20509`](https://github.com/VoltAgent/voltagent/commit/1f20509528fc2cb2ba00f86d649848afae34af04), [`1f20509`](https://github.com/VoltAgent/voltagent/commit/1f20509528fc2cb2ba00f86d649848afae34af04), [`7a7a0f6`](https://github.com/VoltAgent/voltagent/commit/7a7a0f672adbe42635c3edc5f0a7f282575d0932)]:
  - @voltagent/core@0.1.9

## 0.1.3

### Patch Changes

- [#33](https://github.com/VoltAgent/voltagent/pull/33) [`3ef2eaa`](https://github.com/VoltAgent/voltagent/commit/3ef2eaa9661e8ecfebf17af56b09af41285d0ca9) Thanks [@kwaa](https://github.com/kwaa)! - Update package.json files:
  - Remove `src` directory from the `files` array.
  - Add explicit `exports` field for better module resolution.

- Updated dependencies [[`52d5fa9`](https://github.com/VoltAgent/voltagent/commit/52d5fa94045481dc43dc260a40b701606190585c), [`3ef2eaa`](https://github.com/VoltAgent/voltagent/commit/3ef2eaa9661e8ecfebf17af56b09af41285d0ca9), [`52d5fa9`](https://github.com/VoltAgent/voltagent/commit/52d5fa94045481dc43dc260a40b701606190585c)]:
  - @voltagent/core@0.1.6

## 0.1.1

- 🚀 **Introducing VoltAgent: TypeScript AI Agent Framework!**

  This initial release marks the beginning of VoltAgent, a powerful toolkit crafted for the JavaScript developer community. We saw the challenges: the complexity of building AI from scratch, the limitations of No-Code tools, and the lack of first-class AI tooling specifically for JS.

  ![VoltAgent Demo](https://cdn.voltagent.dev/readme/demo.gif)
  VoltAgent aims to fix that by providing the building blocks you need:
  - **`@voltagent/core`**: The foundational engine for agent capabilities.
  - **`@voltagent/voice`**: Easily add voice interaction.
  - **`@voltagent/vercel-ai`**: Seamless integration with [Vercel AI SDK](https://sdk.vercel.ai/docs/introduction).
  - **`@voltagent/xsai`**: A Seamless integration with [xsAI](https://xsai.js.org/).
  - **`@voltagent/cli` & `create-voltagent-app`**: Quick start tools to get you building _fast_.

  We're combining the flexibility of code with the clarity of visual tools (like our **currently live [VoltOps LLM Observability Platform](https://console.voltagent.dev/)**) to make AI development easier, clearer, and more powerful. Join us as we build the future of AI in JavaScript!

  Explore the [Docs](https://voltagent.dev/docs/) and join our [Discord community](https://s.voltagent.dev/discord)!
