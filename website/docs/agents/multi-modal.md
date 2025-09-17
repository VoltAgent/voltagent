# Multi-modal Capabilities

VoltAgent supports multi-modal interactions, allowing agents to process and understand inputs that combine different types of content, primarily text and images. This enables more complex and richer interactions, such as asking questions about an uploaded image or providing visual context alongside text prompts.

## `BaseMessage` (AI SDK v5 ModelMessage) Content Structure

The core of multi-modal input lies in the structure of the `content` field within a `BaseMessage` object. While simple text interactions might use a plain string for `content`, multi-modal inputs require `content` to be an **array** of specific content part objects.

```typescript
import type { BaseMessage } from "@voltagent/core"; // maps to ai-sdk v5 ModelMessage

// Basic Text Message
const textMessage: BaseMessage = {
  role: "user",
  content: "Describe this image for me.",
};

// Multi-modal Message (Text + Image)
const multiModalMessage: BaseMessage = {
  role: "user",
  content: [
    {
      type: "text",
      text: "What is shown in this image?",
    },
    {
      type: "image",
      image: "data:image/jpeg;base64,/9j/4AAQSk...", // URL, Data URI, or Base64 payload
      mediaType: "image/jpeg", // Optional but recommended
    },
  ],
};
```

### Content Part Types

When `content` is an array, each element must be an object with a `type` field indicating the kind of content. Common types include:

1.  **Text Part:**
    - `type: 'text'`
    - `text: string` - The actual text content.

    ```typescript
    { type: 'text', text: 'This is the text part.' }
    ```

2.  **Image Part (v5):**
    - `type: 'image'`
    - `image: string | URL | Uint8Array` - The image; can be an absolute URL, a **Data URI**, a **Base64 payload**, or binary.
    - `mediaType?: string` - (Optional but Recommended) The media type (e.g., `image/jpeg`, `image/png`).
    - `alt?: string` - (Optional) Alternative text describing the image.

    ```typescript
    {
      type: 'image',
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...',
      mediaType: 'image/png',
      alt: 'A cute cat sleeping'
    }
    ```

3.  **File Part (v5 UI semantics):**
    - `type: 'file'`
    - `url: string` - Absolute URL or Data URI. If you only have Base64, use a Data URI: `data:<mediaType>;base64,<payload>`.
    - `mediaType: string` - The media type of the file (e.g., `application/pdf`, `image/jpeg`).

    ```typescript
    {
      type: 'file',
      url: 'data:application/pdf;base64,JVBERi0xLjQKJ...',
      mediaType: 'application/pdf'
    }
    ```

You can mix different part types within the `content` array.

## Sending Multi-modal Input to Agents

To send multi-modal input, construct your `messages` array ensuring that the `content` field for relevant messages is an array of content parts, and pass it to the agent's generation methods (`generateText`, `streamText`, `generateObject`, etc.).

```typescript
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Initialize an agent with a vision-capable model
const agent = new Agent({
  name: "vision-assistant",
  instructions: "Answer based on the image and text.",
  model: openai("gpt-4o-mini"), // or another vision-capable ai-sdk model
});

async function askAboutImage(image: string, question: string) {
  const messages: BaseMessage[] = [
    {
      role: "user",
      content: [
        { type: "text", text: question },
        {
          type: "image",
          image, // Can be absolute URL, Data URI or Base64 payload
          // Provide mediaType if not using a Data URI
          // mediaType: 'image/jpeg'
        },
      ],
    },
  ];

  try {
    // Use generateText for a single response
    const response = await agent.generateText(messages);
    console.log("Agent Response:", response);

    // Or use streamText for streaming responses
    // const streamResponse = await agent.streamText(messages);
    // for await (const chunk of streamResponse.textStream) {
    //   process.stdout.write(chunk);
    // }
    // console.log(); // Newline after stream
  } catch (error) {
    console.error("Error generating response:", error);
  }
}

// Example usage:
const catImageBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQE...";
askAboutImage(catImageBase64, "What breed is this cat?");
```

## Provider Support & Considerations

Multi-modal support depends on the specific ai-sdk provider and model you choose.

- Not all models accept image inputs.
- Check provider docs for supported formats, limits, and costs.

Common vision-capable options in ai-sdk:

- OpenAI: `gpt-4o`, `gpt-4o-mini`
- Google: `gemini-1.5-pro`, `gemini-1.5-flash`
- Anthropic: latest Claude 3 models with vision

See [Providers & Models](/docs/getting-started/providers-models) for details.

## VoltOps Platform Integration

![VoltAgent VoltOps Platform Multi-modal Demo](https://cdn.voltagent.dev/docs/multi-modal-demo.gif)

The [VoltAgent VoltOps Platform](https://console.voltagent.dev/) provides a user-friendly way to interact with multi-modal agents:

- **Assistant Chat:** The chat interface includes an attachment button (📎).
- **Uploading:** Clicking the button allows you to select one or more image files (and potentially other supported file types) from your computer.
- **Preview:** Uploaded files are shown as previews below the text input area.
- **Sending:** When you send the message, the Console automatically converts the uploaded files into the appropriate `ImagePart` or `FilePart` format (using Base64 data URIs) and constructs the `BaseMessage` with the `content` field as an array containing both your typed text and the file/image parts. This structured message is then sent to the agent API.

This provides a seamless way for you and your users to test and utilize the multi-modal capabilities of your agents directly within the Console.
