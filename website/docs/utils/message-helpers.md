---
title: Message Helpers
---

# Message Helpers

Message helpers are utility functions for working with message content in VoltAgent.

Message helpers work with two message formats:

- **MessageContent** - The `content` property from AI SDK's ModelMessage (string or array of content parts)
- **UIMessage** - The AI SDK UI message format with `id`, `role`, and `parts` array (used by Agent hooks, memory, and generation)

Most extractor and checker functions support **both formats** using TypeScript overloads, so you can use the same function regardless of which format you're working with.

## Import

```typescript
import { messageHelpers } from "@voltagent/core";
// Or import individual functions
import { isTextContent, extractText, MessageContentBuilder } from "@voltagent/core/utils";
```

:::info Understanding Message Types
VoltAgent uses different message types for different purposes. For a comprehensive guide on **MessageContent**, **UIMessage**, and **VoltAgentTextStreamPart**, see [Understanding Message Types](../agents/message-types.md).
:::

## Working with UIMessage

All extractor and checker functions (`extractText`, `extractTextParts`, `extractImageParts`, `extractFileParts`, `hasTextPart`, `hasImagePart`, `hasFilePart`, `getContentLength`) support **both MessageContent and UIMessage** using TypeScript overloads.

This means you can use the same function whether you're working with:

- `ModelMessage.content` (MessageContent format)
- Messages from `memory.getMessages()` (UIMessage format)
- Messages in agent hooks (UIMessage format)

### Example: Memory Integration

```typescript
import { extractText, hasImagePart, extractImageParts } from "@voltagent/core";

// Get messages from memory (returns UIMessage[])
const messages = await memory.getMessages(userId, conversationId);

// Extract text directly from UIMessage
const text = extractText(messages[0]);
console.log(text); // Works seamlessly!

// Check for images in UIMessage
if (hasImagePart(messages[0])) {
  const images = extractImageParts(messages[0]);
  // Process images...
}

// TypeScript automatically infers the correct return types
```

### Example: Both Formats

```typescript
import { extractText } from "@voltagent/core";

// Works with MessageContent
const content = [{ type: "text", text: "Hello" }];
extractText(content); // "Hello"

// Also works with UIMessage
const message = {
  id: "msg-1",
  role: "user",
  parts: [{ type: "text", text: "Hello" }],
};
extractText(message); // "Hello"

// Same function, different formats!
```

## Type Guards

Type guards determine the format of message content and enable type-safe operations.

### `isTextContent()`

Checks if content is a string.

```typescript
import { isTextContent } from "@voltagent/core/utils";

const stringContent = "Hello world";
const arrayContent = [{ type: "text", text: "Hello" }];

console.log(isTextContent(stringContent)); // true
console.log(isTextContent(arrayContent)); // false
```

### `isStructuredContent()`

Checks if content is an array of content parts.

```typescript
import { isStructuredContent } from "@voltagent/core/utils";

const stringContent = "Hello world";
const arrayContent = [
  { type: "text", text: "Hello" },
  { type: "image", image: "data:image/png;base64..." },
];

console.log(isStructuredContent(stringContent)); // false
console.log(isStructuredContent(arrayContent)); // true
```

### `hasTextPart()`

Checks if content contains any text, regardless of format. Works with both MessageContent and UIMessage.

```typescript
import { hasTextPart } from "@voltagent/core/utils";

// With MessageContent
const stringContent = "Hello";
const mixedContent = [
  { type: "text", text: "Description" },
  { type: "image", image: "data..." },
];
const imageOnlyContent = [{ type: "image", image: "data..." }];

console.log(hasTextPart(stringContent)); // true
console.log(hasTextPart(mixedContent)); // true
console.log(hasTextPart(imageOnlyContent)); // false

// With UIMessage
import type { UIMessage } from "ai";

const message: UIMessage = {
  id: "m1",
  role: "user",
  parts: [
    { type: "text", text: "Hello" },
    { type: "file", url: "image.png", mediaType: "image/png" },
  ],
} as UIMessage;

console.log(hasTextPart(message)); // true
```

### `hasImagePart()` and `hasFilePart()`

Check for specific content part types. Works with both MessageContent and UIMessage.

```typescript
import { hasImagePart, hasFilePart } from "@voltagent/core/utils";

// With MessageContent
const content = [
  { type: "text", text: "Check this image:" },
  { type: "image", image: "data:image/png;base64..." },
  { type: "file", data: "file content", mimeType: "text/plain" },
];

console.log(hasImagePart(content)); // true
console.log(hasFilePart(content)); // true
console.log(hasImagePart("text")); // false

// With UIMessage
import type { UIMessage } from "ai";

const message: UIMessage = {
  id: "m1",
  role: "user",
  parts: [
    { type: "text", text: "Check this:" },
    { type: "file", url: "image.png", mediaType: "image/png" },
  ],
} as UIMessage;

console.log(hasImagePart(message)); // true (file with image mediaType)
console.log(hasFilePart(message)); // true
```

## Extractors

Extractors retrieve specific content types from messages.

### `extractText()`

Extracts all text from content, concatenating multiple text parts. Works with both MessageContent and UIMessage.

```typescript
import { extractText } from "@voltagent/core/utils";

// From string content (MessageContent)
const text1 = extractText("Hello world");
console.log(text1); // "Hello world"

// From structured content (MessageContent)
const content = [
  { type: "text", text: "Hello " },
  { type: "image", image: "data..." },
  { type: "text", text: "world" },
];
const text2 = extractText(content);
console.log(text2); // "Hello world"

// From UIMessage
import type { UIMessage } from "ai";

const message: UIMessage = {
  id: "m1",
  role: "user",
  parts: [
    { type: "text", text: "Hello " },
    { type: "file", url: "image.png", mediaType: "image/png" },
    { type: "text", text: "world" },
  ],
} as UIMessage;

const text3 = extractText(message);
console.log(text3); // "Hello world"

// From memory
const messages = await memory.getMessages(userId, conversationId);
const text4 = extractText(messages[0]);
```

### `extractTextParts()`

Returns all text parts as an array, preserving structure.

```typescript
import { extractTextParts } from "@voltagent/core/utils";

const content = [
  { type: "text", text: "First paragraph" },
  { type: "image", image: "data..." },
  { type: "text", text: "Second paragraph" },
];

const textParts = extractTextParts(content);
console.log(textParts);
// [
//   { type: "text", text: "First paragraph" },
//   { type: "text", text: "Second paragraph" }
// ]

// String content returns array format
const stringParts = extractTextParts("Hello");
console.log(stringParts);
// [{ type: "text", text: "Hello" }]
```

### `extractImageParts()` and `extractFileParts()`

Extract specific content part types.

```typescript
import { extractImageParts, extractFileParts } from "@voltagent/core/utils";

const content = [
  { type: "text", text: "Files:" },
  { type: "image", image: "image1.png" },
  { type: "file", data: "doc.pdf", mimeType: "application/pdf" },
  { type: "image", image: "image2.jpg" },
];

const images = extractImageParts(content);
console.log(images.length); // 2
console.log(images[0]); // { type: "image", image: "image1.png" }

const files = extractFileParts(content);
console.log(files.length); // 1
console.log(files[0]); // { type: "file", data: "doc.pdf", mimeType: "application/pdf" }
```

## Transformers

Transformers modify message content while preserving structure.

### `transformTextContent()`

Applies a transformation function to all text parts.

```typescript
import { transformTextContent } from "@voltagent/core/utils";

// Transform string content
const upper1 = transformTextContent("hello", (text) => text.toUpperCase());
console.log(upper1); // "HELLO"

// Transform structured content
const content = [
  { type: "text", text: "hello" },
  { type: "image", image: "data..." },
  { type: "text", text: "world" },
];

const upper2 = transformTextContent(content, (text) => text.toUpperCase());
console.log(upper2);
// [
//   { type: "text", text: "HELLO" },
//   { type: "image", image: "data..." },
//   { type: "text", text: "WORLD" }
// ]
```

### `mapMessageContent()`

Transforms all text parts within a `UIMessage`.

```typescript
import { mapMessageContent } from "@voltagent/core/utils";
import type { UIMessage } from "ai";

const message: UIMessage = {
  id: "m1",
  role: "user",
  parts: [
    { type: "text", text: "hello" },
    { type: "image", image: "graph.png" },
    { type: "text", text: "world" },
  ],
  metadata: {},
} as UIMessage;

const emphasized = mapMessageContent(message, (text) => `**${text}**`);
// Text parts become **hello** and **world**; image part is unchanged
```

### `filterContentParts()`

Filters content parts based on a predicate function.

```typescript
import { filterContentParts } from "@voltagent/core/utils";

const content = [
  { type: "text", text: "Keep this" },
  { type: "image", image: "remove.png" },
  { type: "text", text: "Keep this too" },
  { type: "file", data: "remove.pdf" },
];

// Keep only text parts
const textOnly = filterContentParts(content, (part) => part.type === "text");
console.log(textOnly);
// [
//   { type: "text", text: "Keep this" },
//   { type: "text", text: "Keep this too" }
// ]

// If only one text part remains, returns string
const singleContent = [
  { type: "text", text: "Only text" },
  { type: "image", image: "img.png" },
];
const filtered = filterContentParts(singleContent, (part) => part.type === "text");
console.log(filtered); // "Only text"
```

## Normalizers

Normalizers convert between content formats.

### `normalizeToArray()`

Converts any content format to array format.

```typescript
import { normalizeToArray } from "@voltagent/core/utils";

// String to array
const array1 = normalizeToArray("Hello");
console.log(array1);
// [{ type: "text", text: "Hello" }]

// Array remains array
const content = [
  { type: "text", text: "Hello" },
  { type: "image", image: "data..." },
];
const array2 = normalizeToArray(content);
console.log(array2 === content); // true (same reference)
```

### `normalizeContent()`

Converts content to the most compact representation.

```typescript
import { normalizeContent } from "@voltagent/core/utils";

// Single text part becomes string
const content1 = [{ type: "text", text: "Hello" }];
const normalized1 = normalizeContent(content1);
console.log(normalized1); // "Hello"

// Empty array becomes empty string
const content2 = [];
const normalized2 = normalizeContent(content2);
console.log(normalized2); // ""

// Multiple parts remain as array
const content3 = [
  { type: "text", text: "Hello" },
  { type: "image", image: "data..." },
];
const normalized3 = normalizeContent(content3);
console.log(Array.isArray(normalized3)); // true
```

## MessageContentBuilder

A builder class for constructing complex message content.

### Basic Usage

```typescript
import { MessageContentBuilder } from "@voltagent/core/utils";

const builder = new MessageContentBuilder();

// Build simple text
const simple = builder.addText("Hello world").build();
console.log(simple); // "Hello world"

// Build complex content
builder.clear(); // Reset the builder
const complex = builder
  .addText("Here's an image:")
  .addImage("data:image/png;base64,...")
  .addText("And here's a file:")
  .addFile("document.pdf", "application/pdf")
  .build();

console.log(Array.isArray(complex)); // true
console.log(complex.length); // 4
```

### Builder Methods

```typescript
const builder = new MessageContentBuilder();

// Add various content types
builder
  .addText("Step 1")
  .addImage("screenshot.png")
  .addFile("data.csv", "text/csv")
  .addPart({ type: "custom", data: "..." }); // Custom parts

// Builder state
console.log(builder.length); // 4

// Build as array (always returns array)
const asArray = builder.buildAsArray();
console.log(Array.isArray(asArray)); // true

// Clear and reuse
builder.clear();
console.log(builder.length); // 0
```

## Convenience Functions

Pre-built functions for common operations.

### `addTimestampToMessage()`

Adds a timestamp prefix to all text parts of user `UIMessage`s.

```typescript
import { addTimestampToMessage } from "@voltagent/core/utils";
import type { UIMessage } from "ai";

const userMessage: UIMessage = {
  id: "u1",
  role: "user",
  parts: [{ type: "text", text: "What's the weather?" }],
  metadata: {},
} as UIMessage;

// With custom timestamp
const stamped1 = addTimestampToMessage(userMessage, "10:30:00");
// First text part becomes: "[10:30:00] What's the weather?"

// With automatic timestamp
const stamped2 = addTimestampToMessage(userMessage);
// Uses current time

// Non-user messages are unchanged
const assistantMessage: UIMessage = {
  id: "a1",
  role: "assistant",
  parts: [{ type: "text", text: "The weather is sunny" }],
  metadata: {},
} as UIMessage;
const unchanged = addTimestampToMessage(assistantMessage);
```

### `prependToMessage()` and `appendToMessage()`

Add text to the beginning or end of all text parts in a `UIMessage`.

```typescript
import { prependToMessage, appendToMessage } from "@voltagent/core/utils";
import type { UIMessage } from "ai";

const message: UIMessage = {
  id: "m2",
  role: "user",
  parts: [{ type: "text", text: "Execute this" }],
  metadata: {},
} as UIMessage;

const withPrefix = prependToMessage(message, "URGENT: ");
const withSuffix = appendToMessage(message, " immediately!");

// Works with multi-part content too
const structured: UIMessage = {
  id: "m3",
  role: "assistant",
  parts: [
    { type: "text", text: "Result" },
    { type: "image", image: "graph.png" },
  ],
  metadata: {},
} as UIMessage;

const prefixed = prependToMessage(structured, "Final ");
// First text part becomes: { type: "text", text: "Final Result" }
```

### `hasContent()` and `getContentLength()`

Utility functions for content inspection.

```typescript
import { hasContent, getContentLength } from "@voltagent/core/utils";
import type { UIMessage } from "ai";

// Check if UIMessage has content
const empty: UIMessage = { id: "e1", role: "user", parts: [], metadata: {} } as UIMessage;
const withText: UIMessage = {
  id: "e2",
  role: "user",
  parts: [{ type: "text", text: "Hello" }],
  metadata: {},
} as UIMessage;

console.log(hasContent(empty)); // false
console.log(hasContent(withText)); // true

// Get content length
console.log(getContentLength("Hello")); // 5 (string length)
console.log(getContentLength([])); // 0 (array length)
console.log(
  getContentLength([
    { type: "text", text: "Hi" },
    { type: "image", image: "..." },
  ])
); // 2 (array length)
```

## Using with Hooks

Message helpers integrate with agent hooks for message transformation.

```typescript
import { Agent, messageHelpers } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Assistant",
  instructions: "A helpful assistant",
  // Direct ai-sdk model; no custom provider needed
  model: openai("gpt-4o-mini"),

  hooks: {
    onPrepareMessages: async ({ messages }) => {
      const timestamp = new Date().toLocaleTimeString();

      // Transform all user messages
      const enhanced = messages.map((msg) => messageHelpers.addTimestampToMessage(msg, timestamp));

      return { messages: enhanced };
    },
  },
});
```

## API Reference

### Type Guards

```typescript
function isTextContent(content: MessageContent): content is string;
function isStructuredContent(content: MessageContent): content is Array<any>;

// Overloaded to support both MessageContent and UIMessage
function hasTextPart(content: MessageContent): boolean;
function hasTextPart(message: UIMessage): boolean;

function hasImagePart(content: MessageContent): boolean;
function hasImagePart(message: UIMessage): boolean;

function hasFilePart(content: MessageContent): boolean;
function hasFilePart(message: UIMessage): boolean;
```

### Extractors

```typescript
// Overloaded to support both MessageContent and UIMessage
function extractText(content: MessageContent): string;
function extractText(message: UIMessage): string;

function extractTextParts(content: MessageContent): Array<{ type: "text"; text: string }>;
function extractTextParts(message: UIMessage): TextUIPart[];

function extractImageParts(content: MessageContent): Array<any>;
function extractImageParts(message: UIMessage): FileUIPart[];

function extractFileParts(content: MessageContent): Array<any>;
function extractFileParts(message: UIMessage): FileUIPart[];
```

### Transformers

```typescript
function transformTextContent(
  content: MessageContent,
  transformer: (text: string) => string
): MessageContent;

function mapMessageContent(message: UIMessage, transformer: (text: string) => string): UIMessage;

function filterContentParts(
  content: MessageContent,
  predicate: (part: any) => boolean
): MessageContent;
```

### Normalizers

```typescript
function normalizeToArray(content: MessageContent): Array<any>;
function normalizeContent(content: MessageContent): MessageContent;
```

### Builder

```typescript
class MessageContentBuilder {
  addText(text: string): this;
  addImage(image: string | Uint8Array): this;
  addFile(file: string | Uint8Array, mimeType?: string): this;
  addPart(part: any): this;
  build(): MessageContent;
  buildAsArray(): Array<any>;
  clear(): this;
  get length(): number;
}
```

### Convenience Functions

```typescript
function addTimestampToMessage(message: UIMessage, timestamp?: string): UIMessage;
function prependToMessage(message: UIMessage, prefix: string): UIMessage;
function appendToMessage(message: UIMessage, suffix: string): UIMessage;
function hasContent(message: UIMessage): boolean;

// Overloaded to support both MessageContent and UIMessage
function getContentLength(content: MessageContent): number;
function getContentLength(message: UIMessage): number;
```

### Combined Export

All functions are available through the `messageHelpers` object:

```typescript
import { messageHelpers } from "@voltagent/core";

// Access all functions
messageHelpers.isTextContent(content);
messageHelpers.extractText(content);
messageHelpers.MessageContentBuilder;
// ... etc
```
