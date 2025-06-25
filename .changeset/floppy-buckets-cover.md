---
"@voltagent/core": patch
---

feat: add `deepClone` function to `object-utils` module

Added a new `deepClone` utility function to the object-utils module for creating deep copies of complex JavaScript objects. This utility provides safe cloning of nested objects, arrays, and primitive values while handling circular references and special object types.

Usage:

```typescript
import { deepClone } from "@voltagent/core/utils/object-utils";

const original = {
  nested: {
    array: [1, 2, { deep: "value" }],
    date: new Date(),
  },
};

const cloned = deepClone(original);
// cloned is completely independent from original
```

This utility is particularly useful for agent state management, configuration cloning, and preventing unintended mutations in complex data structures.
