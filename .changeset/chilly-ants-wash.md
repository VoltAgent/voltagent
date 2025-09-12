---
"@voltagent/core": minor
---

feat: ai sdk v5 ModelMessage support across Agent + Workflow; improved image/file handling and metadata preservation.

What's new

- Agent I/O: `generateText`, `streamText`, `generateObject`, `streamObject` now accept `string | UIMessage[] | ModelMessage[]` (AI SDK v5) as input. No breaking changes for existing callers.
- Conversion layer: Robust `ModelMessage → UIMessage` handling with:
  - Image support: `image` parts are mapped to UI `file` parts; URLs and `data:` URIs are preserved, raw/base64 strings become `data:<mediaType>;base64,...`.
  - File support: string data is auto-detected as URL (`http(s)://`, `data:`) or base64; binary is encoded to data URI.
  - Metadata: `providerOptions` on text/reasoning/image/file parts is preserved as `providerMetadata` on UI parts.
  - Step boundaries: Inserts `step-start` after tool results when followed by assistant text.
- Workflow: `andAgent` step and `WorkflowInput` types now also accept `UIMessage[] | ModelMessage[]` in addition to `string`.

Usage examples

1. Agent with AI SDK v5 ModelMessage input (multimodal)

```ts
import type { ModelMessage } from "@ai-sdk/provider-utils";

const messages: ModelMessage[] = [
  {
    role: "user",
    content: [
      { type: "image", image: "https://example.com/cat.jpg", mediaType: "image/jpeg" },
      { type: "text", text: "What's in this picture?" },
    ],
  },
];

const result = await agent.generateText(messages);
console.log(result.text);
```

2. Agent with UIMessage input

```ts
import type { UIMessage } from "ai";

const uiMessages: UIMessage[] = [
  {
    id: crypto.randomUUID(),
    role: "user",
    parts: [
      { type: "file", url: "https://example.com/cat.jpg", mediaType: "image/jpeg" },
      { type: "text", text: "What's in this picture?" },
    ],
  },
];

const result = await agent.generateText(uiMessages);
```

3. Provider metadata preservation (files/images)

```ts
import type { ModelMessage } from "@ai-sdk/provider-utils";

const msgs: ModelMessage[] = [
  {
    role: "assistant",
    content: [
      {
        type: "file",
        mediaType: "image/png",
        data: "https://cdn.example.com/img.png",
        providerOptions: { source: "cdn" },
      },
    ],
  },
];

// Internally preserved as providerMetadata on the UI file part
await agent.generateText(msgs);
```

4. Workflow andAgent with ModelMessage[] or UIMessage[]

```ts
import { z } from "zod";
import type { ModelMessage } from "@ai-sdk/provider-utils";

workflow
  .andAgent(
    ({ data }) =>
      [
        {
          role: "user",
          content: [{ type: "text", text: `Hello ${data.name}` }],
        },
      ] as ModelMessage[],
    agent,
    { schema: z.object({ reply: z.string() }) }
  )
  .andThen({
    id: "extract",
    execute: async ({ data }) => data.reply,
  });
```

Notes

- No breaking changes. Existing string/UIMessage inputs continue to work.
- Multimodal inputs are passed through correctly to the model after conversion.
