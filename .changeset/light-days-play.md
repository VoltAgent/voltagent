---
"@voltagent/docs-mcp": patch
---

fix(docs-mcp): update JSON Schema target to draft-7 for tool compatibilityfix(docs): update JSON Schema target to draft-7 for tool compatibility

The MCP tool schemas were using JSON Schema draft-2020-12 features that weren't supported by the current validator. Updated to explicitly use draft-7 format for better compatibility.The MCP tool schemas were using JSON Schema draft-2020-12 features that weren't supported by the current validator. Updated to explicitly use draft-7 format for better compatibility.

- Changed z.toJSONSchema() to use draft-7 target- Changed z.toJSONSchema() to use draft-7 target

- Fixed tool registration failures due to schema validation errors- Fixed tool registration failures due to schema validation errors

- Removed dependency on unsupported $dynamicRef feature- Removed dependency on unsupported $dynamicRef feature

Fixes #626
