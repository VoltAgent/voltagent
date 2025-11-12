---
"@voltagent/server-core": patch
---

feat: add experimental_output support to HTTP text endpoints - #790

## What Changed

The HTTP API now supports AI SDK's `experimental_output` feature for structured generation! You can now use `/agents/{id}/text`, `/agents/{id}/stream`, and `/agents/{id}/chat` endpoints to generate type-safe structured data while maintaining full tool calling capabilities.

## The Problem

Previously, to get structured output from VoltAgent's HTTP API, you had two options:

1. Use `/agents/{id}/object` endpoint - BUT this doesn't support tool calling
2. Use direct method calls with `experimental_output` - BUT this requires running code in the same process

Users couldn't get structured output with tool calling through the HTTP API.

## The Solution

**HTTP API (server-core):**

- Added `experimental_output` field to `GenerateOptionsSchema` (accepts `{ type: "object"|"text", schema?: {...} }`)
- Updated `processAgentOptions` to convert JSON schema → Zod schema → `Output.object()` or `Output.text()`
- Modified `handleGenerateText` to return `experimental_output` in response
- Moved `BasicJsonSchema` definition to be reused across object and experimental_output endpoints
- All existing endpoints (`/text`, `/stream`, `/chat`) now support this feature

**What Gets Sent:**

```json
{
  "input": "Create a recipe",
  "options": {
    "experimental_output": {
      "type": "object",
      "schema": {
        "type": "object",
        "properties": { ... },
        "required": [...]
      }
    }
  }
}
```

**What You Get Back:**

```json
{
  "success": true,
  "data": {
    "text": "Here's a recipe...",
    "experimental_output": {
      "name": "Pasta Carbonara",
      "ingredients": ["eggs", "bacon", "pasta"],
      "steps": ["Boil pasta", "Cook bacon", ...],
      "prepTime": 20
    },
    "usage": { ... }
  }
}
```

## Usage Examples

### Object Type - Structured JSON Output

**Request:**

```bash
curl -X POST http://localhost:3141/agents/my-agent/text \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create a recipe for pasta carbonara",
    "options": {
      "experimental_output": {
        "type": "object",
        "schema": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "ingredients": {
              "type": "array",
              "items": { "type": "string" }
            },
            "steps": {
              "type": "array",
              "items": { "type": "string" }
            },
            "prepTime": { "type": "number" }
          },
          "required": ["name", "ingredients", "steps"]
        }
      }
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "text": "Here is a classic pasta carbonara recipe...",
    "experimental_output": {
      "name": "Classic Pasta Carbonara",
      "ingredients": [
        "400g spaghetti",
        "200g guanciale or pancetta",
        "4 large eggs",
        "100g Pecorino Romano cheese",
        "Black pepper"
      ],
      "steps": [
        "Bring a large pot of salted water to boil",
        "Cook pasta according to package directions",
        "While pasta cooks, dice guanciale and cook until crispy",
        "Beat eggs with grated cheese and black pepper",
        "Drain pasta, reserving 1 cup pasta water",
        "Off heat, toss pasta with guanciale and fat",
        "Add egg mixture, tossing quickly with pasta water"
      ],
      "prepTime": 20
    },
    "usage": {
      "promptTokens": 145,
      "completionTokens": 238,
      "totalTokens": 383
    },
    "finishReason": "stop",
    "toolCalls": [],
    "toolResults": []
  }
}
```

### Text Type - Constrained Text Output

**Request:**

```bash
curl -X POST http://localhost:3141/agents/my-agent/text \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Write a short poem about coding",
    "options": {
      "experimental_output": {
        "type": "text"
      }
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "text": "Lines of code dance on the screen...",
    "experimental_output": "Lines of code dance on the screen,\nLogic flows like streams pristine,\nBugs debug with patience keen,\nCreating worlds we've never seen.",
    "usage": { ... },
    "finishReason": "stop"
  }
}
```

### With Streaming (SSE)

The `/agents/{id}/stream` and `/agents/{id}/chat` endpoints also support `experimental_output`:

**Request:**

```bash
curl -X POST http://localhost:3141/agents/my-agent/stream \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create a recipe",
    "options": {
      "experimental_output": {
        "type": "object",
        "schema": { ... }
      }
    }
  }'
```

**Response (Server-Sent Events):**

```
data: {"type":"text-delta","textDelta":"Here"}
data: {"type":"text-delta","textDelta":" is"}
data: {"type":"text-delta","textDelta":" a recipe..."}
data: {"type":"finish","finishReason":"stop","experimental_output":{...}}
```

## Comparison: generateObject vs experimental_output

| Feature           | `/agents/{id}/object`  | `/agents/{id}/text` + `experimental_output` |
| ----------------- | ---------------------- | ------------------------------------------- |
| Structured output | ✅                     | ✅                                          |
| Tool calling      | ❌                     | ✅                                          |
| Streaming         | Partial objects        | Partial objects                             |
| Use case          | Simple data extraction | Complex workflows with tools                |

**When to use which:**

- Use `/object` for simple schema validation without tool calling
- Use `/text` with `experimental_output` when you need structured output **and** tool calling

## Important Notes

- **Backward Compatible:** `experimental_output` is optional - existing API calls work unchanged
- **Tool Calling:** Unlike `/object` endpoint, this supports full tool calling capabilities
- **Type Safety:** JSON schema is automatically converted to Zod schema for validation
- **Zod Version:** Supports both Zod v3 and v4 (automatic detection)
- **Experimental:** This uses AI SDK's experimental features and may change in future versions

## Technical Details

**Files Changed:**

- `packages/server-core/src/schemas/agent.schemas.ts` - Added `experimental_output` schema
- `packages/server-core/src/utils/options.ts` - Added JSON→Zod conversion logic
- `packages/server-core/src/handlers/agent.handlers.ts` - Added response field

**Schema Format:**

```typescript
experimental_output: z.object({
  type: z.enum(["object", "text"]),
  schema: BasicJsonSchema.optional(), // for type: "object"
}).optional();
```

## Impact

- ✅ **HTTP API Parity:** HTTP endpoints now have feature parity with direct method calls
- ✅ **Tool Calling + Structure:** Combine structured output with tool execution
- ✅ **Better DX:** Type-safe outputs through HTTP API
- ✅ **Backward Compatible:** No breaking changes

## Related

This feature complements the `experimental_output` support added to `@voltagent/core` in v1.1.6, bringing the same capabilities to HTTP endpoints.
