---
"@voltagent/core": patch
---

feat: enhanced message-helpers to support both MessageContent and UIMessage using TypeScript overloads - #796

## The Problem

When working with messages in VoltAgent, there were two different message formats:

1. **MessageContent** - The `content` property from AI SDK's `ModelMessage` (string or array of content parts)
2. **UIMessage** - The newer format returned by memory operations and AI SDK's UI utilities (object with `id`, `role`, and `parts` array)

The existing `message-helpers` utilities only supported MessageContent, making it cumbersome to extract information from UIMessage objects retrieved from memory or other sources. Users had to manually navigate the UIMessage structure or convert between formats.

## The Solution

All message helper functions now accept **both MessageContent and UIMessage** using TypeScript function overloads. This provides a seamless experience regardless of which message format you're working with.

**Enhanced Functions:**

- `extractText()` - Extract text from MessageContent or UIMessage
- `extractTextParts()` - Get text parts from either format
- `extractImageParts()` - Get image parts from either format
- `extractFileParts()` - Get file parts from either format
- `hasTextPart()` - Check for text parts in either format
- `hasImagePart()` - Check for image parts in either format
- `hasFilePart()` - Check for file parts in either format
- `getContentLength()` - Get content length from either format

## Usage Example

```typescript
import { extractText, hasImagePart } from "@voltagent/core";

// Works with MessageContent (existing usage - no changes needed!)
const content = [{ type: "text", text: "Hello world" }];
extractText(content); // "Hello world"

// Now also works with UIMessage directly!
const messages = await memory.getMessages(userId, conversationId);
const firstMessage = messages[0];

// Extract text directly from UIMessage
const text = extractText(firstMessage); // "Hello world"

// Check for images in UIMessage
if (hasImagePart(firstMessage)) {
  const images = extractImageParts(firstMessage);
  // Process images...
}

// TypeScript inference works perfectly for both!
```

## Benefits

1. **Zero Breaking Changes** - All existing code continues to work exactly as before
2. **Cleaner API** - Single function name for both formats instead of `extractText()` vs `extractTextFromUIMessage()`
3. **Type Safety** - Full TypeScript type inference and autocomplete for both formats
4. **Memory Integration** - Works seamlessly with messages retrieved from `memory.getMessages()`
5. **Intuitive** - "Extract text" is just `extractText()` regardless of message format

## Migration

**No migration needed!** Your existing code using MessageContent continues to work. You can now also pass UIMessage objects directly to these functions when working with memory or other sources that return UIMessage format.

```typescript
// Before: Had to manually navigate UIMessage structure
const message = messages[0];
const text = message.parts
  .filter((p) => p.type === "text")
  .map((p) => p.text)
  .join("");

// After: Use the same helper function!
const text = extractText(message);
```

## Technical Details

- Uses TypeScript function overloads for clean API surface
- Type guard (`isUIMessage`) automatically detects format
- Returns appropriate types based on input (e.g., `TextUIPart[]` for UIMessage, generic array for MessageContent)
- Fully tested with 50 comprehensive test cases covering both formats
