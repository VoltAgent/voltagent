import { supervisorAgent } from "../../voltagent";

export default defineEventHandler(async (event) => {
  try {
    const { message, conversationId } = await readBody(event);

    if (!message || typeof message !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "Message is required",
      });
    }

    // Convert message to UIMessage format
    const messages = [
      {
        role: "user" as const,
        content: message,
        id: Date.now().toString(),
        parts: [{ type: "text" as const, text: message }],
      },
    ];

    // Use streamText for streaming responses from the supervisor agent
    const result = await supervisorAgent.streamText(messages, {
      userId: "1",
      conversationId: conversationId || "default-conversation",
    });

    // Return the streaming response
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error generating response:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Error generating response",
    });
  }
});
