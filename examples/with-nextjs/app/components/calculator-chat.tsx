"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  type TextUIPart,
  type UIMessage,
  getToolName,
  isToolUIPart,
} from "ai";
import { useEffect, useRef, useState } from "react";

// No need for custom annotation interfaces - we'll use AI SDK v5 types directly

export function CalculatorChat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    messages: [
      {
        id: "welcome",
        role: "assistant" as UIMessage["role"],
        parts: [
          {
            type: "text",
            text: "Hello! I'm your AI-powered calculator. You can write your calculations in natural language. For example: '5 plus 3 times 2' or '(25 + 75) / 4'.",
          },
        ],
      },
    ],
  });

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  });

  // Removed formatPartAsAnnotation - we'll render parts directly

  // Removed separate render functions - we'll inline them in renderAnnotations

  const renderAnnotations = (parts: UIMessage["parts"] = []) => {
    return parts
      .map((part) => {
        // Handle data-subagent parts
        if (part.type === "data-subagent") {
          return (
            <div key={`subagent-${part.id}`} className="flex items-center space-x-2 my-2 text-xs">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              <span className="text-purple-300">
                Delegating to: {(part as any).data?.subAgentName || "SubAgent"}
              </span>
            </div>
          );
        }

        if (isToolUIPart(part)) {
          const toolName = getToolName(part);

          if (part.state === "output-available") {
            return (
              <div
                key={`tool-result-${part.toolCallId}`}
                className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 my-2"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                  <span className="text-sm font-medium text-green-300">
                    Tool Result: {String(toolName)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-green-200">
                  <strong>Result:</strong>{" "}
                  <code className="bg-green-950/50 px-1 rounded">
                    {JSON.stringify(part.output)}
                  </code>
                </div>
              </div>
            );
          }

          if (part.state === "input-available" || part.state === "input-streaming") {
            return (
              <div
                key={`tool-call-${part.toolCallId}`}
                className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 my-2"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-blue-300">
                    Tool Call: {String(toolName)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-blue-200">
                  <strong>Arguments:</strong>{" "}
                  <code className="bg-blue-950/50 px-1 rounded">{JSON.stringify(part.input)}</code>
                </div>
              </div>
            );
          }

          if (part.state === "output-error") {
            return (
              <div
                key={`tool-error-${part.toolCallId}`}
                className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 my-2"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full" />
                  <span className="text-sm font-medium text-red-300">
                    Tool Error: {String(toolName)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-red-200">{part.errorText}</div>
              </div>
            );
          }
        }
        return null;
      })
      .filter(Boolean);
  };

  return (
    <div className="bg-[#1b1b1b] border-2 border-[#333333] rounded-xl shadow-xl overflow-hidden max-w-2xl mx-auto">
      <div className="bg-[#333333] p-6">
        <h2 className="text-white text-2xl font-bold">AI Calculator Chat</h2>
        <p className="text-gray-400 text-sm mt-1">Watch tool executions in real-time</p>
      </div>

      {/* Chat Messages */}
      <div ref={messagesContainerRef} className="p-6 max-h-96 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === "user"
                    ? "bg-[#333333] text-white"
                    : "bg-gray-800 text-gray-300 border border-gray-700"
                }`}
              >
                <div className="text-sm">
                  {message.role === "assistant" && (
                    <div className="flex items-center mb-1">
                      <div className="w-2 h-2 bg-[#24f2ff] rounded-full mr-2" />
                      <span className="text-xs text-gray-400">AI Assistant</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {/* Render text parts with context about which agent they're from */}
                    {message.parts?.map((part, index) => {
                      if (part.type === "text") {
                        // Check if there's a data-subagent part before this text
                        const prevPart = index > 0 ? message.parts?.[index - 1] : null;
                        const isFromSubAgent =
                          prevPart && (prevPart as any).type === "data-subagent";
                        const subAgentName = isFromSubAgent
                          ? (prevPart as any).data?.subAgentName
                          : null;

                        return (
                          <div
                            key={`text-${
                              // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                              index
                            }`}
                            className={isFromSubAgent ? "border-l-2 border-purple-500 pl-3" : ""}
                          >
                            {isFromSubAgent && (
                              <div className="text-xs text-purple-300 mb-1">
                                From {subAgentName}:
                              </div>
                            )}
                            <div className="whitespace-pre-wrap">{(part as TextUIPart).text}</div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>

                  {message.parts && renderAnnotations(message.parts)}
                </div>
              </div>
            </div>
          ))}
          {error && (
            <>
              <div>An error occurred. {error.message}</div>
              <button type="button" onClick={() => false}>
                Retry
              </button>
            </>
          )}
          {status === "streaming" ||
            (status === "submitted" && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-300 border border-gray-700 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-[#24f2ff] rounded-full mr-2" />
                    <span className="text-xs text-gray-400 mr-2">AI Assistant</span>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="border-t border-gray-700 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              sendMessage({ text: input });
              setInput("");
            }
          }}
          className="flex space-x-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status !== "ready"}
            placeholder="Start typing your calculation... (e.g.: 25 + 17 * 3)"
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-[#24f2ff] focus:border-[#24f2ff] transition-colors"
          />
          <button
            type="submit"
            disabled={status !== "ready"}
            className="bg-[#333333] hover:bg-[#444444] focus:ring-4 focus:ring-[#333333]/50 text-white font-medium rounded-lg px-6 py-3 transition-all duration-200 ease-in-out focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {status === "submitted" ? (
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-label="Loading"
              >
                <title>Loading spinner</title>
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              "Send"
            )}
          </button>
        </form>

        <div className="mt-2 text-xs text-gray-500">
          <p>
            Tip: You can use expressions like "5 times 3 plus 10", "(20 + 5) divided by 5", "square
            root of 16"
          </p>
          <p className="text-blue-400">💡 Watch tool executions in real-time!</p>
        </div>
      </div>
    </div>
  );
}
