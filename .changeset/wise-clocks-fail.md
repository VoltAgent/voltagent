---
"@voltagent/core": patch
---

feat: Add ability to tap into workflow without mutating the data by adding the `andTap` step

### Usage

The andTap step is useful when you want to tap into the workflow without mutating the data, for example:

```ts
const workflow = createWorkflowChain(config)
  .andTap({
    execute: async (data) => {
      console.log("🔄 Translating text:", data);
    },
  })
  .andTap({
    id: "sleep",
    execute: async (data) => {
      console.log("🔄 Sleeping for 1 second");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return data;
    },
  })
  .andThen({
    execute: async (data) => {
      return { ...data, translatedText: data.translatedText };
    },
  })
  .run({
    originalText: "Hello, world!",
    targetLanguage: "en",
  });
```

You will notice that the `andTap` step is not included in the result, BUT it is `awaited` and `executed` before the next step, so you can block processing safely if needed.
