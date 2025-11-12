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
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart } from "ai";
import { Bot, Send, Sparkles } from "lucide-react";

export function ChatInterface() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    onError: (err: Error) => {
      console.error("Chat error:", err);
    },
  });

  const examplePrompts = [
    "What is 2 + 2?",
    "What's the current date and time?",
    "Generate a random number between 1 and 100",
    "What's the weather like?",
  ];

  const handlePromptClick = (suggestion: string) => {
    sendMessage({ text: suggestion });
  };

  const handleSubmit = (message: PromptInputMessage) => {
    if (message.text) {
      sendMessage({ text: message.text });
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
                const role = message.role;
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
                      {/* Render message parts */}
                      {message.parts?.map((part, idx) => {
                        // Render text parts
                        if (part.type === "text" && "text" in part) {
                          return <Response key={`text-${message.id}-${idx}`}>{part.text}</Response>;
                        }

                        // Render tool invocation parts
                        if (isToolUIPart(part)) {
                          const toolName = getToolName(part);

                          return (
                            <Tool key={part.toolCallId} defaultOpen>
                              <ToolHeader title={toolName} type={part.type} state={part.state} />
                              <ToolContent>
                                <>
                                  {part.input && <ToolInput input={part.input} />}
                                  <ToolOutput output={part.output} errorText={part.errorText} />
                                </>
                              </ToolContent>
                            </Tool>
                          );
                        }

                        return null;
                      })}
                    </MessageContent>
                  </Message>
                );
              })}

              {status === "streaming" && (
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
