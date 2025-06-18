# `@voltagent/internal`

An internal set of tools for the VoltAgent packages.

## 🚀 Quick Start

```bash
pnpm add @voltagent/internal
```

```typescript
import { devLogger } from "@voltagent/internal";

// will only log if process.env.NODE_ENV is "development"
devLogger.info("Hello, world!");
```

## 📦 Imports

You can also import specific subsets of the package:

```typescript
import { devLogger } from "@voltagent/internal/dev";
import { convertArrayToAsyncIterable } from "@voltagent/internal/test";
```

Allowing you to only import the tools you need.

## 📄 License

MIT License - see LICENSE file for details.
