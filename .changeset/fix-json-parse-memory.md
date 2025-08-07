---
"@voltagent/core": patch
"@voltagent/postgres": patch
"@voltagent/supabase": patch
---

fix: memory messages now return parsed objects instead of JSON strings

## What Changed for You

Memory messages that contain structured content (like tool calls or multi-part messages) now return as **parsed objects** instead of **JSON strings**. This is a breaking change if you were manually parsing these messages.

## Before - You Had to Parse JSON Manually

```typescript
// ❌ OLD BEHAVIOR: Content came as JSON string
const messages = await memory.getMessages({ conversationId: "123" });

// What you got from memory:
console.log(messages[0]);
// {
//   role: "user",
//   content: '[{"type":"text","text":"Hello"},{"type":"image","image":"data:..."}]',  // STRING!
//   type: "text"
// }

// You had to manually parse the JSON string:
const content = JSON.parse(messages[0].content); // Parse required!
console.log(content);
// [
//   { type: "text", text: "Hello" },
//   { type: "image", image: "data:..." }
// ]

// Tool calls were also JSON strings:
console.log(messages[1].content);
// '[{"type":"tool-call","toolCallId":"123","toolName":"weather"}]'  // STRING!
```

## After - You Get Parsed Objects Automatically

```typescript
// ✅ NEW BEHAVIOR: Content comes as proper objects
const messages = await memory.getMessages({ conversationId: "123" });

// What you get from memory NOW:
console.log(messages[0]);
// {
//   role: "user",
//   content: [
//     { type: "text", text: "Hello" },      // OBJECT!
//     { type: "image", image: "data:..." }  // OBJECT!
//   ],
//   type: "text"
// }

// Direct access - no JSON.parse needed!
const content = messages[0].content; // Already parsed!
console.log(content[0].text); // "Hello"

// Tool calls are proper objects:
console.log(messages[1].content);
// [
//   { type: "tool-call", toolCallId: "123", toolName: "weather" }  // OBJECT!
// ]
```

## Breaking Change Warning ⚠️

If your code was doing this:

```typescript
// This will now FAIL because content is already parsed
const parsed = JSON.parse(msg.content); // ❌ Error: not a string!
```

Change it to:

```typescript
// Just use the content directly
const content = msg.content; // ✅ Already an object/array
```

## What Gets Auto-Parsed

- **String content** → Stays as string ✅
- **Structured content** (arrays) → Auto-parsed to objects ✅
- **Tool calls** → Auto-parsed to objects ✅
- **Tool results** → Auto-parsed to objects ✅
- **Metadata fields** → Auto-parsed to objects ✅

## Why This Matters

- **No more JSON.parse errors** in your application
- **Type-safe access** to structured content
- **Cleaner code** without try/catch blocks
- **Consistent behavior** with how agents handle messages

## Migration Guide

1. **Remove JSON.parse calls** for message content
2. **Remove try/catch** blocks around parsing
3. **Use content directly** as objects/arrays

Your memory messages now "just work" without manual parsing!
