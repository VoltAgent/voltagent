import { sharedMemory } from "@/voltagent/memory";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId") || "1";
    const userId = searchParams.get("userId") || "1";

    // Check if memory is available
    if (!sharedMemory || !sharedMemory.getUIMessages) {
      return Response.json({
        data: [],
      });
    }

    // Get messages in UIMessage format directly
    const uiMessages = await sharedMemory.getUIMessages({
      userId,
      conversationId,
    });

    return Response.json({
      data: uiMessages || [],
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return Response.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
