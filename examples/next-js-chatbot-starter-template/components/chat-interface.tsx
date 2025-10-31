"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { Message, MessageAvatar, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Response } from "@/components/ai-elements/response";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { useChat } from "@ai-sdk/react";
import { Bot, Send, Sparkles } from "lucide-react";

export function ChatInterface() {
  const { messages, append, isLoading, error } = useChat({
    api: "/api/chat",
    onError: (err: Error) => {
      console.error("Chat error:", err);
    },
  });

  const examplePrompts = [
    "Explain quantum computing",
    "Help me write a story",
    "Debug my JavaScript code",
    "Analyze this data",
  ];

  const handlePromptClick = (suggestion: string) => {
    append({
      role: "user",
      content: suggestion,
    });
  };

  const handleSubmit = (message: PromptInputMessage) => {
    if (message.text) {
      append({
        role: "user",
        content: message.text,
      });
    }
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">VoltAgent</h1>
            <p className="text-sm text-muted-foreground">AI Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-green-600">Online</span>
        </div>
      </div>

      {/* Messages */}
      <Conversation className="flex-1">
        <ConversationContent className="space-y-6 p-6">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Welcome to VoltAgent"
              description="Start a conversation by selecting a suggestion below or type your own message"
              icon={
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
              }
            >
              <div className="mt-8 w-full max-w-3xl space-y-3">
                <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                  Try these suggestions
                </p>
                <Suggestions className="justify-center gap-2">
                  {examplePrompts.map((prompt) => (
                    <Suggestion
                      key={prompt}
                      suggestion={prompt}
                      onClick={handlePromptClick}
                      size="default"
                      className="text-sm"
                    />
                  ))}
                </Suggestions>
              </div>
            </ConversationEmptyState>
          ) : (
            <>
              {messages.map((message) => {
                const role = message.role === "data" ? "assistant" : message.role;
                return (
                  <Message key={message.id} from={role}>
                    <MessageAvatar
                      src={
                        role === "user"
                          ? "https://avatar.vercel.sh/user"
                          : "https://avatar.vercel.sh/volt"
                      }
                      name={role === "user" ? "You" : "AI"}
                    />
                    <MessageContent variant="flat">
                      <Response>{message.content}</Response>
                    </MessageContent>
                  </Message>
                );
              })}

              {isLoading && (
                <Message from="assistant">
                  <MessageAvatar src="https://avatar.vercel.sh/volt" name="AI" />
                  <MessageContent variant="flat">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader />
                      <span>Thinking...</span>
                    </div>
                  </MessageContent>
                </Message>
              )}

              {error && (
                <div className="flex justify-center">
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <p className="font-semibold">Error</p>
                    <p className="text-xs opacity-90">{error.message}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      <div className="border-t bg-background p-4">
        <PromptInput onSubmit={handleSubmit} className="w-full">
          <PromptInputTextarea
            placeholder="Type your message..."
            className="min-h-[24px] w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus-visible:outline-none"
          />
          <PromptInputFooter>
            <div />
            <PromptInputButton type="submit" size="sm">
              <Send className="h-4 w-4" />
            </PromptInputButton>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
