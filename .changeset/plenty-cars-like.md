---
"@voltagent/core": patch
---

feat: (experimental) Allow for dynamic `andAll` steps when using the `createWorkflow` API.

### Usage

You can now provide a function to the `steps` property of `andAll` to dynamically generate the steps.

> [!NOTE]
> This is an experimental feature and may change in the future, its only supported for `andAll` steps in the `createWorkflow` API.

```typescript
const workflow = createWorkflow(
  {
    id: "my-workflow",
    name: "My Workflow",
    input: z.object({
      id: z.string(),
    }),
    result: z.object({
      name: z.string(),
    }),
    memory,
  },
  andThen({
    id: "fetch-data",
    name: "Fetch data",
    execute: async ({ data }) => {
      return request.get(`https://api.example.com/data/${data.id}`);
    },
  }),
  andAll({
    id: "transform-data",
    name: "Transform data",
    steps: async (context) =>
      context.data.map((item) =>
        andThen({
          id: `transform-${item.id}`,
          name: `Transform ${item.id}`,
          execute: async ({ data }) => {
            return {
              ...item,
              name: [item.name, item.id].join("-"),
            };
          },
        })
      ),
  }),
  andThen({
    id: "pick-data",
    name: "Pick data",
    execute: async ({ data }) => {
      return {
        name: data[0].name,
      };
    },
  })
);
```
