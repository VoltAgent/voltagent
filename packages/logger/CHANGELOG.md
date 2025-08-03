# @voltagent/logger

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
