import { getResumableStreamAdapter } from "@/lib/resumable-stream";
import { agent } from "@/voltagent";
import { safeStringify } from "@voltagent/internal/utils";
import { createResumableChatSession } from "@voltagent/resumable-streams";

const jsonError = (status: number, message: string) =>
  new Response(safeStringify({ error: message, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return jsonError(400, "conversationId is required");
  }

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return jsonError(400, "userId is required");
  }
  const agentId = agent.id;
  const resumableStream = await getResumableStreamAdapter();
  const session = createResumableChatSession({
    adapter: resumableStream,
    conversationId: id,
    userId,
    agentId,
  });

  try {
    return await session.resumeResponse();
  } catch (error) {
    console.error("[API] Failed to resume stream:", error);
    return new Response(null, { status: 204 });
  }
}
