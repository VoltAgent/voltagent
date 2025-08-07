---
"@voltagent/core": patch
---

feat: add message helper utilities to simplify working with complex message content

## What Changed for You

Working with message content (which can be either a string or an array of content parts) used to require complex if/else blocks. Now you have simple helper functions that handle all the complexity.

## Before - Your Old Code (Complex)

```typescript
// Adding timestamps to messages - 30+ lines of code
const enhancedMessages = messages.map((msg) => {
  if (msg.role === "user") {
    const timestamp = new Date().toLocaleTimeString();

    // Handle string content
    if (typeof msg.content === "string") {
      return {
        ...msg,
        content: `[${timestamp}] ${msg.content}`,
      };
    }

    // Handle structured content (array of content parts)
    if (Array.isArray(msg.content)) {
      return {
        ...msg,
        content: msg.content.map((part) => {
          if (part.type === "text") {
            return {
              ...part,
              text: `[${timestamp}] ${part.text}`,
            };
          }
          return part;
        }),
      };
    }
  }
  return msg;
});

// Extracting text from content - another 15+ lines
function getText(content) {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
  }
  return "";
}
```

## After - Your New Code (Simple)

```typescript
import { messageHelpers } from "@voltagent/core";

// Adding timestamps - 1 line!
const enhancedMessages = messages.map((msg) =>
  messageHelpers.addTimestampToMessage(msg, timestamp)
);

// Extracting text - 1 line!
const text = messageHelpers.extractText(content);

// Check if has images - 1 line!
if (messageHelpers.hasImagePart(content)) {
  // Handle image content
}

// Build complex content - fluent API
const content = new messageHelpers.MessageContentBuilder()
  .addText("Here's an image:")
  .addImage("screenshot.png")
  .addText("And a file:")
  .addFile("document.pdf")
  .build();
```

## Real Use Case in Hooks

```typescript
import { Agent, messageHelpers } from "@voltagent/core";

const agent = new Agent({
  name: "Assistant",
  hooks: {
    onPrepareMessages: async ({ messages }) => {
      // Before: 30+ lines of complex if/else
      // After: 2 lines!
      const timestamp = new Date().toLocaleTimeString();
      return {
        messages: messages.map((msg) => messageHelpers.addTimestampToMessage(msg, timestamp)),
      };
    },
  },
});
```

## What You Get

- **No more if/else blocks** for content type checking
- **Type-safe operations** with TypeScript support
- **30+ lines → 1 line** for common operations
- **Works everywhere**: hooks, tools, custom logic

## Available Helpers

```typescript
import { messageHelpers } from "@voltagent/core";

// Check content type
messageHelpers.isTextContent(content); // Is it a string?
messageHelpers.hasImagePart(content); // Has images?

// Extract content
messageHelpers.extractText(content); // Get all text
messageHelpers.extractImageParts(content); // Get all images

// Transform content
messageHelpers.transformTextContent(content, (text) => text.toUpperCase());
messageHelpers.addTimestampToMessage(message, "10:30:00");

// Build content
new messageHelpers.MessageContentBuilder().addText("Hello").addImage("world.png").build();
```

Your message handling code just got 90% simpler!
