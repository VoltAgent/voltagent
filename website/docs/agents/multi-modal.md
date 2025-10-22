# Multi-Modal Inputs

Agents can process text, images, and files in a single request. This document covers how to send multi-modal inputs to agent methods.

## Basic Usage

Agent methods (`generateText`, `streamText`, `generateObject`, `streamObject`) accept three input formats:

- `string` - Plain text input
- `UIMessage[]` - AI SDK's UI message format (used in chat interfaces and streaming)
- `BaseMessage[]` - AI SDK's model message format (alias for `ModelMessage`)

Both message formats are from the AI SDK and re-exported by VoltAgent. To send images or files, use either message array format with structured content.

```ts
import { Agent } from "@voltagent/core";
import type { BaseMessage } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "vision-assistant",
  instructions: "Analyze images and answer questions about them.",
  model: openai("gpt-4o"),
});

const messages: BaseMessage[] = [
  {
    role: "user",
    content: [
      { type: "text", text: "What's in this image?" },
      {
        type: "image",
        image: "https://example.com/photo.jpg",
      },
    ],
  },
];

const result = await agent.generateText(messages);
console.log(result.text);
```

## Image Formats

Images can be provided as URLs, data URIs, or base64 strings.

### Using URLs

```ts
const messages: BaseMessage[] = [
  {
    role: "user",
    content: [
      { type: "text", text: "Describe this chart" },
      {
        type: "image",
        image: "https://example.com/chart.png",
      },
    ],
  },
];
```

### Using Base64

```ts
import { readFileSync } from "fs";

const imageBuffer = readFileSync("./photo.jpg");
const base64Image = imageBuffer.toString("base64");

const messages: BaseMessage[] = [
  {
    role: "user",
    content: [
      { type: "text", text: "What's in this photo?" },
      {
        type: "image",
        image: `data:image/jpeg;base64,${base64Image}`,
        mediaType: "image/jpeg",
      },
    ],
  },
];
```

### Using Binary Data

```ts
import { readFileSync } from "fs";

const imageBuffer = readFileSync("./photo.jpg");

const messages: BaseMessage[] = [
  {
    role: "user",
    content: [
      { type: "text", text: "Analyze this image" },
      {
        type: "image",
        image: new Uint8Array(imageBuffer),
        mediaType: "image/jpeg",
      },
    ],
  },
];
```

## File Attachments

For non-image files (PDFs, documents), use the file content type.

```ts
import { readFileSync } from "fs";

const pdfBuffer = readFileSync("./report.pdf");
const base64Pdf = pdfBuffer.toString("base64");

const messages: BaseMessage[] = [
  {
    role: "user",
    content: [
      { type: "text", text: "Summarize this document" },
      {
        type: "file",
        url: `data:application/pdf;base64,${base64Pdf}`,
        mediaType: "application/pdf",
      },
    ],
  },
];

const result = await agent.generateText(messages);
```

## Multiple Images

You can include multiple images in a single message.

```ts
const messages: BaseMessage[] = [
  {
    role: "user",
    content: [
      { type: "text", text: "Compare these two images" },
      {
        type: "image",
        image: "https://example.com/before.jpg",
      },
      {
        type: "image",
        image: "https://example.com/after.jpg",
      },
    ],
  },
];

const result = await agent.generateText(messages);
```

## Streaming with Images

Streaming works the same way with multi-modal inputs.

```ts
const messages: BaseMessage[] = [
  {
    role: "user",
    content: [
      { type: "text", text: "Describe this image in detail" },
      {
        type: "image",
        image: "https://example.com/landscape.jpg",
      },
    ],
  },
];

const stream = await agent.streamText(messages);

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

## Structured Output with Images

Use `generateObject` to extract structured data from images.

```ts
import { z } from "zod";

const receiptSchema = z.object({
  total: z.number(),
  items: z.array(
    z.object({
      name: z.string(),
      price: z.number(),
    })
  ),
  date: z.string(),
});

const messages: BaseMessage[] = [
  {
    role: "user",
    content: [
      { type: "text", text: "Extract the receipt details" },
      {
        type: "image",
        image: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
      },
    ],
  },
];

const result = await agent.generateObject(messages, receiptSchema);
console.log(result.object);
// { total: 42.50, items: [...], date: "2024-01-15" }
```

## Content Part Types Reference

These types are from the AI SDK and re-exported by VoltAgent for convenience.

When using message arrays, the `content` field can be:

- A `string` for text-only messages
- An array of content parts for multi-modal messages

### Text Part

```ts
{
  type: "text",
  text: "Your text here"
}
```

### Image Part

```ts
{
  type: "image",
  image: string | URL | Uint8Array,  // URL, data URI, base64, or binary
  mediaType?: string,                 // "image/jpeg", "image/png", etc.
  alt?: string                        // Alternative text description
}
```

### File Part

```ts
{
  type: "file",
  url: string,           // Absolute URL or data URI
  mediaType: string      // "application/pdf", "text/csv", etc.
}
```

For complete type definitions, see the [AI SDK documentation](https://sdk.vercel.ai/docs/reference/ai-sdk-core/model-message).

## Model Support

Not all models support vision or file inputs. Check your provider's documentation.

Vision-capable models include:

- **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`
- **Anthropic**: `claude-3-5-sonnet`, `claude-3-opus`, `claude-3-haiku`
- **Google**: `gemini-1.5-pro`, `gemini-1.5-flash`

Image format support, size limits, and costs vary by provider. Refer to your model provider's documentation for details.

## Error Handling

```ts
try {
  const messages: BaseMessage[] = [
    {
      role: "user",
      content: [
        { type: "text", text: "What's in this image?" },
        {
          type: "image",
          image: "https://example.com/image.jpg",
        },
      ],
    },
  ];

  const result = await agent.generateText(messages);
  console.log(result.text);
} catch (error) {
  if (error.message.includes("vision")) {
    console.error("This model does not support image inputs");
  } else {
    console.error("Error:", error);
  }
}
```

## VoltOps Console

The [VoltOps Console](https://console.voltagent.dev/) includes a chat interface with file upload support.

Click the attachment button (📎) to upload images or files. The console converts uploaded files to the appropriate message format (base64 data URIs) and sends them to your agent.

This allows you to test multi-modal agents without writing code for file handling.
