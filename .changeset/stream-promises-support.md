---
"@voltagent/core": patch
"@voltagent/vercel-ai": patch
---

feat: add Promise-based properties and warnings to AI responses - #422

Enhanced AI response types to align with Vercel AI SDK's API and provide better metadata:

**For `streamObject`:**

- Added optional `object?: Promise<T>` property that resolves to the final generated object
- Added optional `usage?: Promise<UsageInfo>` property that resolves to token usage information
- Added optional `warnings?: Promise<any[] | undefined>` property for provider warnings

**For `streamText`:**

- Added optional `text?: Promise<string>` property that resolves to the full generated text
- Added optional `finishReason?: Promise<string>` property that resolves to the reason generation stopped
- Added optional `usage?: Promise<UsageInfo>` property that resolves to token usage information
- Added optional `reasoning?: Promise<string | undefined>` property that resolves to model's reasoning text

**For `generateText` and `generateObject`:**

- Added optional `reasoning?: string` property for model's reasoning text (generateText only)
- Added optional `warnings?: any[]` property for provider warnings

These properties are optional to maintain backward compatibility. Providers that support these features (like Vercel AI) now return these values, allowing users to access rich metadata:

```typescript
// For streamObject
const response = await agent.streamObject(input, schema);
const finalObject = await response.object; // Promise<T>
const usage = await response.usage; // Promise<UsageInfo>

// For streamText
const response = await agent.streamText(input);
const fullText = await response.text; // Promise<string>
const usage = await response.usage; // Promise<UsageInfo>

// For generateText
const response = await agent.generateText(input);
console.log(response.warnings); // Any provider warnings
console.log(response.reasoning); // Model's reasoning (if available)
```
