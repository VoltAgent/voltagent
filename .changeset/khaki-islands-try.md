---
"@voltagent/core": patch
---

fix: resolve Zod v4 compatibility issue in delegate_task tool schema

Fixed a compatibility issue where `z.record(z.unknown())` in the delegate_task tool's context parameter was causing JSON schema generation errors with Zod v4. Changed to `z.record(z.string(), z.any())` which works correctly with both Zod v3 and v4.

The error occurred when using the MCP server or other components that convert Zod schemas to JSON schemas:

```
TypeError: Cannot read properties of undefined (reading '_zod')
```

This fix ensures the delegate_task tool works seamlessly across all Zod versions supported by the framework (^3.25.0 || ^4.0.0).
