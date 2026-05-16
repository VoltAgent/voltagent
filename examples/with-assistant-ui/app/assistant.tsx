"use client";

import { AssistantUiTemplate } from "@/components/assistant-ui/assistant-ui-template";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";

export const Assistant = () => {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantUiTemplate />
    </AssistantRuntimeProvider>
  );
};
