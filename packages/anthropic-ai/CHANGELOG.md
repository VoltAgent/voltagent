# @voltagent/anthropic-ai

## 0.1.13

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

## 0.1.12

### Patch Changes

- [#421](https://github.com/VoltAgent/voltagent/pull/421) [`21d499a`](https://github.com/VoltAgent/voltagent/commit/21d499ac44f4a821df36b53c04e6dfa231333dda) Thanks [@tawanorg](https://github.com/tawanorg)! - fix(anthropic-ai): improve generateObject JSON formatting with explicit system prompt

  Enhanced system prompt to prevent AI from wrapping JSON responses in markdown code blocks, fixing JSON parsing errors in generateObject method.

- Updated dependencies [[`089c039`](https://github.com/VoltAgent/voltagent/commit/089c03993e3b9e05655a1108355e7bee940d33a7)]:
  - @voltagent/core@0.1.68

## 0.1.11

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

## 0.1.10

### Patch Changes

- [#213](https://github.com/VoltAgent/voltagent/pull/213) [`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f) Thanks [@baseballyama](https://github.com/baseballyama)! - chore!: drop Node.js v18

- Updated dependencies [[`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f), [`80fd3c0`](https://github.com/VoltAgent/voltagent/commit/80fd3c069de4c23116540a55082b891c4b376ce6)]:
  - @voltagent/core@0.1.31

## 0.1.9

### Patch Changes

- [#199](https://github.com/VoltAgent/voltagent/pull/199) [`a6c0d8e`](https://github.com/VoltAgent/voltagent/commit/a6c0d8e1618f1b6ae300490e151a8ded2e2ced82) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: optional chaining `usage` in callback handlers to prevent runtime errors when options are undefined

## 0.1.8

### Patch Changes

- [#149](https://github.com/VoltAgent/voltagent/pull/149) [`0137a4e`](https://github.com/VoltAgent/voltagent/commit/0137a4e67deaa2490b4a07f9de5f13633f2c473c) Thanks [@VenomHare](https://github.com/VenomHare)! - Added JSON schema support for REST API `generateObject` and `streamObject` functions. The system now accepts JSON schemas which are internally converted to Zod schemas for validation. This enables REST API usage where Zod schemas cannot be directly passed. #87

  Additional Changes:
  - Included the JSON schema from `options.schema` in the system message for the `generateObject` and `streamObject` functions in both `anthropic-ai` and `groq-ai` providers.
  - Enhanced schema handling to convert JSON schemas to Zod internally for seamless REST API compatibility.

- Updated dependencies [[`0137a4e`](https://github.com/VoltAgent/voltagent/commit/0137a4e67deaa2490b4a07f9de5f13633f2c473c), [`4308b85`](https://github.com/VoltAgent/voltagent/commit/4308b857ab2133f6ca60f22271dcf30bad8b4c08)]:
  - @voltagent/core@0.1.22

## 0.1.7

### Patch Changes

- [#155](https://github.com/VoltAgent/voltagent/pull/155) [`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: update `tsconfig.json`'s `target` to `ES2022`

- [#162](https://github.com/VoltAgent/voltagent/pull/162) [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: pin zod version to 3.24.2 to avoid "Type instantiation is excessively deep and possibly infinite" error

  Fixed compatibility issues between different zod versions that were causing TypeScript compilation errors. This issue occurs when multiple packages use different patch versions of zod (e.g., 3.23.x vs 3.24.x), leading to type instantiation depth problems. By pinning to 3.24.2, we ensure consistent behavior across all packages.

  See: https://github.com/colinhacks/zod/issues/3435

- Updated dependencies [[`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c), [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af), [`9412cf0`](https://github.com/VoltAgent/voltagent/commit/9412cf0633f20d6b77c87625fc05e9e216936758)]:
  - @voltagent/core@0.1.20

## 0.1.6

### Patch Changes

- [#110](https://github.com/VoltAgent/voltagent/pull/110) [`6180880`](https://github.com/VoltAgent/voltagent/commit/6180880a91ea0bb380dd0595e3c3ed6e5c15bc8e) Thanks [@VenomHare](https://github.com/VenomHare)! - ### Features
  - Added multi-modal support for message handling.

  ### Improvements
  - Improved logic for generating system prompts.
  - Implemented enhanced error handling within the provider.

  ### Refactoring
  - Moved utility functions to `utils` folder for better code organization.

  ### Documentation
  - Updated and refined documentation for clarity.

  ### Testing
  - Added tests for newly implemented logic.

## 0.1.4

### Patch Changes

- Updated dependencies [[`b31c8f2`](https://github.com/VoltAgent/voltagent/commit/b31c8f2ad1b4bf242b197a094300cb3397109a94)]:
  - @voltagent/core@0.1.17

## 0.1.2

### Patch Changes

- Updated dependencies [[`cdfec65`](https://github.com/VoltAgent/voltagent/commit/cdfec657f731fdc1b6d0c307376e3299813f55d3)]:
  - @voltagent/core@0.1.14

## 0.1.1

### Patch Changes

- [#58](https://github.com/VoltAgent/voltagent/pull/58) [`cc031e9`](https://github.com/VoltAgent/voltagent/commit/cc031e99b9d35d28c92cb05f5f698b5969250718) Thanks [@VenomHare](https://github.com/VenomHare)! - feat(anthropic-ai): Implemented AnthropicProvider class

  It Allows user to use Anthropic (Claude) models inside Voltagent

  MCP tools are also supported in this provider

  Basic Implementation is described in Examples/with-anthropic

  Resolves #10
