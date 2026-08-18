---
"@voltagent/core": minor
---

Let tools use Valibot (and other Standard Schema libraries) for their parameter and output schemas, not just Zod.

Tool schemas now accept any Standard Schema, so `createTool`/`new Tool` take a Valibot schema and infer the `execute` args from it. Zod keeps working exactly as before. Since Valibot doesn't ship a JSON Schema extension yet, VoltAgent converts Valibot schemas with `@valibot/to-json-schema` (install it alongside `valibot` to use Valibot schemas); Zod-only users don't need it and nothing extra loads for them.
