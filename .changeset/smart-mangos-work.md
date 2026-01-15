---
"@voltagent/core": patch
---

fix: allow merging `andAgent` output with existing workflow data via an optional mapper

```ts
.andAgent(
  ({ data }) => `What type of email is this: ${data.email}`,
  agent,
  {
    schema: z.object({
      type: z.enum(["support", "sales", "spam"]),
      priority: z.enum(["low", "medium", "high"]),
    }),
  },
  (output, { data }) => ({ ...data, emailType: output })
)
```
