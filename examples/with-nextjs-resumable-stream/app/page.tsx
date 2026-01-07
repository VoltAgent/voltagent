import { sharedMemory } from "@/voltagent/memory";
import { ChatInterface } from "../components/chat-interface";

export default async function Home() {
  const conversationId = "1";
  const userId = "1";
  const messages = (await sharedMemory.getMessages(userId, conversationId)) ?? [];

  return (
    <ChatInterface chatId={conversationId} initialMessages={messages} resume userId={userId} />
  );
}
