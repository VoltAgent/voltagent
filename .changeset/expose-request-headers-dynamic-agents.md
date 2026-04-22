---
"@voltagent/core": patch
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/server-elysia": patch
"@voltagent/serverless-hono": patch
---

feat(agent): expose request headers to dynamic agent configuration

Dynamic `instructions`, `model`, and `tools` functions now receive a `headers` map in
`DynamicValueOptions` when an agent is called through the built-in HTTP endpoints. This makes it
possible to configure tenant-aware models and request-scoped tools from headers such as
`authorization`, `x-tenant-id`, or `x-user-id` without manually copying them into
`options.context`.

Header names are normalized to lowercase:

```ts
const agent = new Agent({
  name: "Tenant Agent",
  instructions: "You are a tenant-aware assistant.",
  model: ({ headers }) => {
    return headers?.["x-tenant-id"] === "enterprise" ? "openai/gpt-4o" : "openai/gpt-4o-mini";
  },
  tools: ({ headers }) => {
    return headers?.authorization ? [createTenantTool(headers.authorization)] : [];
  },
});
```

For direct in-process calls, pass `requestHeaders`:

```ts
await agent.generateText("Hello", {
  requestHeaders: {
    authorization: "Bearer token",
    "x-tenant-id": "tenant-1",
  },
});
```

Fixes #1201
