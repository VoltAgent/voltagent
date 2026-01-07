import { sharedMemory } from "@/voltagent/memory";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");
  const userId = searchParams.get("userId");

  if (!conversationId || !userId) {
    return Response.json({ error: "conversationId and userId are required" }, { status: 400 });
  }

  const uiMessages = await sharedMemory.getMessages(userId, conversationId);

  return Response.json({
    data: uiMessages || [],
  });
}
