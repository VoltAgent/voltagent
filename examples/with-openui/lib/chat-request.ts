import { z } from "zod";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(100_000),
});

const chatRequestSchema = z.object({
  threadId: z.string().min(1).max(128).optional(),
  messages: z.array(chatMessageSchema).min(1).max(50),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export class InvalidChatRequestError extends Error {
  override name = "InvalidChatRequestError";
}

export function parseChatRequest(input: unknown) {
  return chatRequestSchema.parse(input);
}

export async function parseChatRequestBody(request: Request) {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    throw new InvalidChatRequestError("Request body must be valid JSON");
  }

  try {
    return parseChatRequest(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new InvalidChatRequestError("Request body does not match the chat schema");
    }

    throw error;
  }
}
