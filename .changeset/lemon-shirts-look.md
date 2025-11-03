---
"@voltagent/core": patch
---

feat: add multi-modal tool results support with toModelOutput - #722

Tools can now return images, media, and rich content to AI models using the `toModelOutput` function.

## The Problem

AI agents couldn't receive visual information from tools - everything had to be text or JSON. This limited use cases like:

- Computer use agents that need to see screenshots
- Image analysis workflows
- Visual debugging tools
- Any tool that produces media output

## The Solution

Added `toModelOutput?: (output) => ToolResultOutput` to tool options. This function transforms your tool's output into a format the AI model can understand, including images and media.

```typescript
import { createTool } from "@voltagent/core";
import fs from "fs";

const screenshotTool = createTool({
  name: "take_screenshot",
  description: "Takes a screenshot of the screen",
  parameters: z.object({
    region: z.string().optional().describe("Region to capture"),
  }),
  execute: async ({ region }) => {
    const imageData = fs.readFileSync("./screenshot.png").toString("base64");
    return {
      type: "image",
      data: imageData,
      timestamp: new Date().toISOString(),
    };
  },
  toModelOutput: (result) => ({
    type: "content",
    value: [
      { type: "text", text: `Screenshot captured at ${result.timestamp}` },
      { type: "media", data: result.data, mediaType: "image/png" },
    ],
  }),
});
```

## Return Formats

The `toModelOutput` function can return multiple formats:

**Text output:**

```typescript
toModelOutput: (result) => ({
  type: "text",
  value: result.summary,
});
```

**JSON output:**

```typescript
toModelOutput: (result) => ({
  type: "json",
  value: { status: "success", data: result },
});
```

**Multi-modal content (text + media):**

```typescript
toModelOutput: (result) => ({
  type: "content",
  value: [
    { type: "text", text: "Analysis complete" },
    { type: "media", data: result.imageBase64, mediaType: "image/png" },
  ],
});
```

**Error handling:**

```typescript
toModelOutput: (result) => ({
  type: "error-text",
  value: result.errorMessage,
});
```

## Impact

- **Visual AI Workflows**: Build computer use agents that can see and interact with UIs
- **Image Generation**: Tools can return generated images directly to the model
- **Debugging**: Return screenshots and visual debugging information
- **Rich Responses**: Combine text explanations with visual evidence

## Usage with Anthropic

```typescript
const agent = createAgent({
  name: "visual-assistant",
  tools: [screenshotTool],
  model: anthropic("claude-3-5-sonnet-20241022"),
});

const result = await agent.generateText({
  prompt: "Take a screenshot and describe what you see",
});
// Agent receives both text and image, can analyze the screenshot
```

See [AI SDK documentation](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#multi-modal-tool-results) for more details on multi-modal tool results.
