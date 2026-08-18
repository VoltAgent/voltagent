import { z } from "zod";

export const MAX_CHAT_REQUEST_BYTES = 1024 * 1024;

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

async function readRequestBody(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CHAT_REQUEST_BYTES) {
    throw new InvalidChatRequestError("Request body exceeds the size limit");
  }

  const reader = request.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_CHAT_REQUEST_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new InvalidChatRequestError("Request body exceeds the size limit");
    }

    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}

export async function parseChatRequestBody(request: Request) {
  let input: unknown;

  try {
    input = JSON.parse(await readRequestBody(request));
  } catch (error) {
    if (error instanceof InvalidChatRequestError) throw error;
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
