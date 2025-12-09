---
"@voltagent/core": patch
---

fix: expose resultSchema in workflow API response

Previously, when calling the workflow API endpoint (e.g., `GET /workflows/{id}`), the response included `inputSchema`, `suspendSchema`, and `resumeSchema`, but was missing `resultSchema` (the output schema).

Now, workflows properly expose their result schema alongside other schemas:

```json
{
  "inputSchema": {
    "type": "object",
    "properties": { "name": { "type": "string" } },
    "required": ["name"]
  },
  "resultSchema": {
    "type": "object",
    "properties": { "greeting": { "type": "string" } },
    "required": ["greeting"]
  },
  "suspendSchema": { "type": "unknown" },
  "resumeSchema": { "type": "unknown" }
}
```

This allows API consumers to understand the expected output format of a workflow, enabling better client-side validation and documentation generation.
