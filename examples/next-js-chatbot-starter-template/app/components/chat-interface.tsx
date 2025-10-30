"use client";

import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { AlertCircle, Loader2, Send, User, Wrench } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { MessageContent } from "./message-content";

export function ChatInterface() {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setInput } = useChat({
    api: "/api/chat",
    onError: (err: Error) => {
      console.error("Chat error:", err);
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  });

  // Focus input after message is sent
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  // Sync local state with useChat
  useEffect(() => {
    setInputValue(input);
  }, [input]);

  const handleLocalInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    handleInputChange(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        handleSubmit(e as React.FormEvent<HTMLTextAreaElement>);
      }
    }
  };

  const renderMessage = (
    message: ReturnType<typeof useChat>["messages"][number],
    index: number,
  ) => {
    const isUser = message.role === "user";
    const parts = message.parts || [];

    // Extract text content and tool information from parts
    let textContent = "";
    const toolParts: Array<Record<string, unknown>> = [];

    for (const part of parts) {
      if (typeof part === "string") {
        textContent += part;
      } else if (part && typeof part === "object") {
        // Handle text parts
        if ("text" in part && typeof part.text === "string") {
          textContent += part.text;
        }
        // Handle tool-invocation parts (AI SDK v5 structure)
        if ("type" in part && typeof part.type === "string" && part.type.startsWith("tool-")) {
          toolParts.push(part as Record<string, unknown>);
        }
      }
    }

    return (
      <div
        key={message.id || index}
        className={`flex gap-3 ${isUser ? "justify-end" : ""} message-animate`}
      >
        {!isUser && (
          <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden ">
            <Image
              src="/voltagent.png"
              alt="VoltAgent"
              width={36}
              height={36}
              className="object-cover"
            />
          </div>
        )}

        <div className={`flex flex-col gap-2 max-w-[75%] ${isUser ? "items-end" : ""}`}>
          <div
            className={`rounded-2xl px-4 py-3 shadow-sm ${
              isUser
                ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20"
                : "bg-[#0f2a26] text-white border border-emerald-900/30 shadow-black/10"
            }`}
          >
            {textContent && <MessageContent content={textContent} isUser={isUser} />}

            {/* Display tool calls if present */}
            {toolParts.length > 0 && (
              <div className={`${textContent ? "mt-3" : ""} space-y-2`}>
                {toolParts.map((tool: Record<string, unknown>, toolIndex: number) => {
                  const toolName = (tool.toolName as string) || (tool.type as string) || "Tool";
                  const hasResult = "output" in tool || "result" in tool;
                  const toolKey = (tool.toolCallId as string) || `tool-${toolIndex}`;

                  return (
                    <div
                      key={toolKey}
                      className="text-sm p-3 rounded-lg bg-black/10 backdrop-blur-sm border border-white/10"
                    >
                      <div className="font-semibold mb-2 flex items-center gap-2 text-emerald-300">
                        <Wrench className="w-4 h-4" />
                        <span>{toolName}</span>
                      </div>
                      {hasResult ? (
                        <pre className="text-xs overflow-x-auto bg-black/20 p-2 rounded border border-white/5">
                          {JSON.stringify(tool.output || tool.result, null, 2)}
                        </pre>
                      ) : (
                        <div className="text-xs opacity-70 flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Executing...</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timestamp - optional, can be enabled if needed */}
          {/* <div className="text-xs text-emerald-200/40 px-2">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div> */}
        </div>

        {isUser && (
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-emerald-900/40 border border-emerald-800/30 flex items-center justify-center">
            <User className="w-5 h-5 text-emerald-300" strokeWidth={2.5} />
          </div>
        )}
      </div>
    );
  };

  const examplePrompts = [
    { text: "Explain quantum computing" },
    { text: "Help me write a story" },
    { text: "Debug my JavaScript code" },
    { text: "Analyze this data" },
  ];

  const handlePromptClick = (promptText: string) => {
    setInput(promptText);
    setInputValue(promptText);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto bg-[#0a1f1c]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-emerald-900/30 bg-[#0a1f1c]/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-full overflow-hidden ">
              <Image
                src="/voltagent.png"
                alt="VoltAgent"
                width={44}
                height={44}
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">VoltAgent</h1>
              <p className="text-sm text-emerald-400/80">Next.js Chatbot Starter</p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">Ready</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-8 space-y-6 bg-[#0a1f1c] messages-container"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="relative w-20 h-20 rounded-full overflow-hidden  mb-6">
              <Image
                src="/voltagent.png"
                alt="VoltAgent"
                width={80}
                height={80}
                className="object-cover"
              />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
              Welcome to VoltAgent
            </h2>
            <p className="text-emerald-200/70 max-w-lg text-lg leading-relaxed mb-8">
              Build, customize, and orchestrate AI agents with full control, speed, and great
              developer experience.
            </p>

            {/* Example prompts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt.text}
                  onClick={() => handlePromptClick(prompt.text)}
                  className="px-4 py-3 rounded-xl bg-[#0f2a26] border border-emerald-900/30 hover:border-emerald-700/50 hover:bg-[#132f2a] text-left transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-emerald-100 group-hover:text-white transition-colors">
                      {prompt.text}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => renderMessage(message, index))
        )}

        {/* Error message */}
        {error && (
          <div className="flex justify-center message-animate">
            <div className="bg-red-900/20 border border-red-700/50 text-red-200 px-4 py-3 rounded-xl max-w-md flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">Error</p>
                <p className="text-sm opacity-90">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator when streaming */}
        {isLoading && messages.length > 0 && (
          <div className="flex gap-3 message-animate">
            <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden ">
              <Image
                src="/voltagent.png"
                alt="VoltAgent"
                width={36}
                height={36}
                className="object-cover"
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#0f2a26] border border-emerald-900/30">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span className="text-sm text-emerald-200/70">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-emerald-900/30 bg-[#0a1f1c]/80 backdrop-blur-sm px-6 py-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleLocalInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                disabled={isLoading}
                rows={1}
                className={cn(
                  "w-full px-5 py-3.5 pr-12 rounded-xl border border-emerald-900/30",
                  "bg-[#0f2a26] text-white resize-none",
                  "placeholder:text-emerald-200/40",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-all duration-200",
                  "min-h-[3.5rem] max-h-32",
                )}
                style={{
                  height: "auto",
                  minHeight: "3.5rem",
                }}
              />
              {inputValue && !isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <kbd className="px-2 py-1 text-xs font-semibold text-emerald-400/60 bg-emerald-900/20 rounded border border-emerald-800/30">
                    ↵
                  </kbd>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className={cn(
                "px-6 py-3.5 rounded-xl",
                "bg-gradient-to-r from-emerald-500 to-emerald-600",
                "hover:from-emerald-600 hover:to-emerald-700",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:from-emerald-500 disabled:to-emerald-600",
                "text-white font-semibold transition-all duration-200",
                "shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30",
                "flex items-center gap-2 group",
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="hidden sm:inline">Sending</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Send</span>
                  <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer text */}
        <p className="text-center text-xs text-emerald-200/30 mt-3">
          Powered by VoltAgent • Built with Next.js & Vercel AI SDK
        </p>
      </div>
    </div>
  );
}
