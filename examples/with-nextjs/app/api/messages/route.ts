import { sharedMemory } from "@/voltagent/memory";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId") || "1";
  const userId = searchParams.get("userId") || "1";

  const uiMessages = await sharedMemory.getMessages(userId, conversationId);

  return Response.json({
    data: uiMessages || [],
  });
}
