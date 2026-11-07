---
"@voltagent/core": patch
---

Restore stringified array and object argument coercion for routed tools using Zod 4 schemas. Check the actual argument value instead of relying on the Zod 3-only `received` validation issue field, while preserving schema revalidation before tool execution.
