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

export function parseChatRequest(input: unknown) {
  return chatRequestSchema.parse(input);
}
