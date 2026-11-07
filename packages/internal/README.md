# `@voltagent/internal`

An internal set of tools for the VoltAgent packages.

## 🚀 Quick Start

```bash
pnpm add @voltagent/internal
```

```typescript
import { isObject, isString } from "@voltagent/internal";

// Use utility functions
if (isObject(data)) {
  console.log("Data is an object");
}
```

## 📦 Imports

You can also import specific subsets of the package:

```typescript
import { resolveConfig } from "@voltagent/internal/config";
import { convertArrayToAsyncIterable } from "@voltagent/internal/test";
import { deepClone, hasKey } from "@voltagent/internal/utils";
```

Allowing you to only import the tools you need.

## 📄 License

MIT License - see LICENSE file for details.
