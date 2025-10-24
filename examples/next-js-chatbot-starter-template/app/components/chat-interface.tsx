"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { Loader2, Send, User, Zap } from "lucide-react";
import { useEffect, useRef } from "react";

export function ChatInterface() {
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input: chatInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
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

  const renderMessage = (message: UIMessage, index: number) => {
    const isUser = message.role === "user";
    const parts = message.parts || [];

    // Extract text content and tool information from parts
    let textContent = "";
    const toolParts: any[] = [];

    for (const part of parts) {
      if (typeof part === "string") {
        textContent += part;
      } else if (part && typeof part === "object") {
        // Handle text parts
        if ("text" in part && typeof part.text === "string") {
          textContent += part.text;
        }
        // Handle tool-invocation parts (AI SDK v5 structure)
        if ("type" in part && part.type === "tool-invocation") {
          toolParts.push(part);
        }
      }
    }

    return (
      <div key={message.id || index} className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-500" />
          </div>
        )}

        <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? "items-end" : ""}`}>
          <div
            className={`rounded-2xl px-4 py-3 ${
              isUser
                ? "bg-emerald-500 text-white"
                : "bg-[#0f2a26] text-white border border-emerald-900/30"
            }`}
          >
            {textContent && <div className="whitespace-pre-wrap">{textContent}</div>}

            {/* Display tool calls if present */}
            {toolParts.length > 0 && (
              <div className="mt-3 space-y-2">
                {toolParts.map((tool: any, toolIndex: number) => {
                  const toolName = tool.toolName || "Tool";
                  const hasResult = "result" in tool;
                  const toolKey = tool.toolCallId || `tool-${toolIndex}`;

                  return (
                    <div key={toolKey} className="text-sm p-2 rounded bg-black/5 dark:bg-white/5">
                      <div className="font-semibold mb-1">🔧 {toolName}</div>
                      {hasResult ? (
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(tool.result, null, 2)}
                        </pre>
                      ) : (
                        <div className="text-xs opacity-70 flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Calling...</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-900/30 flex items-center justify-center">
            <User className="w-5 h-5 text-emerald-400" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-[#0a1f1c] dark:bg-[#0a1f1c]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-emerald-900/30 bg-[#0a1f1c] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">voltagent</h1>
            <p className="text-sm text-emerald-400">voltagent next js chatapp starter template</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-[#0a1f1c]"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-4">
              <Zap className="w-10 h-10 text-white" fill="white" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Welcome to VoltAgent</h2>
            <p className="text-emerald-200/70 max-w-md">
              Build, customize, and orchestrate AI agents with full control, speed, and a great
              DevEx. Start a conversation below!
            </p>
          </div>
        ) : (
          messages.map((message, index) => renderMessage(message as any, index))
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-900/20 border border-red-800 text-red-200 px-4 py-3 rounded-lg">
              <p className="text-sm">Error: {error.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-emerald-900/30 bg-[#0a1f1c] px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={chatInput}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl border border-emerald-900/30 
                     bg-[#0f2a26] text-white
                     placeholder:text-emerald-200/40
                     focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isLoading}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 
                     disabled:opacity-50 disabled:cursor-not-allowed
                     text-white font-medium transition-colors
                     flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <Send className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
