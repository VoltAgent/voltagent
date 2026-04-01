# @voltagent/logger

## 2.0.2

### Patch Changes

- [`f6ffb8a`](https://github.com/VoltAgent/voltagent/commit/f6ffb8ae0fd95fbe920058e707d492d8c21b2505) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

- Updated dependencies [[`f6ffb8a`](https://github.com/VoltAgent/voltagent/commit/f6ffb8ae0fd95fbe920058e707d492d8c21b2505)]:
  - @voltagent/internal@1.0.2

## 2.0.1

### Patch Changes

- [`c3943aa`](https://github.com/VoltAgent/voltagent/commit/c3943aa89a7bee113d99404ecd5a81a62bc159c2) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

- Updated dependencies [[`c3943aa`](https://github.com/VoltAgent/voltagent/commit/c3943aa89a7bee113d99404ecd5a81a62bc159c2)]:
  - @voltagent/internal@1.0.1

## 2.0.0

### Major Changes

- [#894](https://github.com/VoltAgent/voltagent/pull/894) [`ee05549`](https://github.com/VoltAgent/voltagent/commit/ee055498096b1b99015a8362903712663969677f) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

### Patch Changes

- Updated dependencies [[`ee05549`](https://github.com/VoltAgent/voltagent/commit/ee055498096b1b99015a8362903712663969677f)]:
  - @voltagent/internal@1.0.0

## 1.0.4

### Patch Changes

- [#736](https://github.com/VoltAgent/voltagent/pull/736) [`348bda0`](https://github.com/VoltAgent/voltagent/commit/348bda0f0fffdcbd75c8a6aa2c2d8bd15195cd22) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: respect configured log levels for console output while sending all logs to OpenTelemetry - #646

  ## The Problem

  When users configured a custom logger with a specific log level (e.g., `level: "error"`), DEBUG and INFO logs were still appearing in console output, cluttering the development environment. This happened because:
  1. `LoggerProxy` was forwarding all log calls to the underlying logger without checking the configured level
  2. Multiple components (agents, workflows, retrievers, memory adapters, observability) were logging at DEBUG level unconditionally
  3. OpenTelemetry logs were also being filtered by the same level, preventing observability platforms from receiving all logs

  ## The Solution

  **Framework Changes:**
  - Updated `LoggerProxy` to check configured log level before forwarding to console/stdout
  - Added `shouldLog(level)` method that inspects the underlying logger's level (supports both Pino and ConsoleLogger)
  - Separated console output filtering from OpenTelemetry emission:
    - **Console/stdout**: Respects configured level (error level → only shows error/fatal)
    - **OpenTelemetry**: Always receives all logs (debug, info, warn, error, fatal)

  **What Gets Fixed:**

  ```typescript
  const logger = createPinoLogger({ level: "error" });

  logger.debug("Agent created");
  // Console: ❌ Hidden (keeps dev environment clean)
  // OpenTelemetry: ✅ Sent (full observability)

  logger.error("Generation failed");
  // Console: ✅ Shown (important errors visible)
  // OpenTelemetry: ✅ Sent (full observability)
  ```

  ## Impact
  - **Cleaner Development**: Console output now respects configured log levels
  - **Full Observability**: OpenTelemetry platforms receive all logs regardless of console level
  - **Better Debugging**: Debug/trace logs available in observability tools even in production
  - **No Breaking Changes**: Existing code works as-is with improved behavior

  ## Usage

  No code changes needed - the fix applies automatically:

  ```typescript
  // Create logger with error level
  const logger = createPinoLogger({
    level: "error",
    name: "my-app",
  });

  // Use it with VoltAgent
  new VoltAgent({
    agents: { myAgent },
    logger, // Console will be clean, OpenTelemetry gets everything
  });
  ```

  ## Migration Notes

  If you were working around this issue by:
  - Filtering console output manually
  - Using different loggers for different components
  - Avoiding debug logs altogether

  You can now remove those workarounds and use a single logger with your preferred console level while maintaining full observability.

## 1.0.3

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`
- Updated dependencies [[`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e)]:
  - @voltagent/internal@0.0.12

## 1.0.2

### Patch Changes

- Updated dependencies [[`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7), [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7)]:
  - @voltagent/internal@0.0.11

## 1.0.1

### Patch Changes

- Updated dependencies [[`134bf9a`](https://github.com/VoltAgent/voltagent/commit/134bf9a2978f0b069f842910fb4fb3e969f70390)]:
  - @voltagent/internal@0.0.10

## 1.0.0

### Major Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - This release adds first‑class OpenTelemetry (OTel) support and seamless integration with VoltAgent 1.x observability.

## 1.0.0-next.0

### Major Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - This release adds first‑class OpenTelemetry (OTel) support and seamless integration with VoltAgent 1.x observability.

## 0.1.4

### Patch Changes

- Updated dependencies [[`5968cef`](https://github.com/VoltAgent/voltagent/commit/5968cef5fe417cd118867ac78217dddfbd60493d)]:
  - @voltagent/internal@0.0.9

## 0.1.3

### Patch Changes

- Updated dependencies [[`8de5785`](https://github.com/VoltAgent/voltagent/commit/8de5785e385bec632f846bcae44ee5cb22a9022e)]:
  - @voltagent/internal@0.0.8

## 0.1.2

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

- Updated dependencies [[`90a1316`](https://github.com/VoltAgent/voltagent/commit/90a131622a876c0d91e1b9046a5e1fc143fef6b5)]:
  - @voltagent/internal@0.0.7

## 0.1.1

### Patch Changes

- [#404](https://github.com/VoltAgent/voltagent/pull/404) [`809bd13`](https://github.com/VoltAgent/voltagent/commit/809bd13c5fce7b2afdb0f0d934cc5a21d3e77726) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: initial release of @voltagent/logger package

  Introducing a powerful, production-ready logging solution for VoltAgent applications. This package provides a feature-rich logger built on top of Pino with support for pretty formatting, file transports, and advanced logging capabilities.

  **Key Features:**
  - **Pino-based Logger**: High-performance logging with minimal overhead
  - **Pretty Formatting**: Human-readable output in development with colors and structured formatting
  - **Multiple Transports**: Support for console, file, and custom transports
  - **Child Logger Support**: Create contextual loggers with inherited configuration
  - **Log Buffering**: In-memory buffer for accessing recent logs programmatically
  - **Environment-aware Defaults**: Automatic configuration based on NODE_ENV
  - **Redaction Support**: Built-in sensitive data redaction
  - **Extensible Architecture**: Provider-based design for custom implementations

  **Usage Example:**

  ```typescript
  import { createPinoLogger } from "@voltagent/logger";

  const logger = createPinoLogger({
    level: "info",
    name: "my-app",
  });
  ```

  This package replaces the basic ConsoleLogger in @voltagent/core for production use cases, offering significantly improved debugging capabilities and performance.

- Updated dependencies [[`809bd13`](https://github.com/VoltAgent/voltagent/commit/809bd13c5fce7b2afdb0f0d934cc5a21d3e77726)]:
  - @voltagent/internal@0.0.6
