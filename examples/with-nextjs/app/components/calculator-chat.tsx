"use client";

import { useChat } from "@ai-sdk/react";
import type { StreamPart } from "@voltagent/core";
import type { UIMessage } from "ai";
import { useEffect, useRef } from "react";

interface ToolCallAnnotation {
  type: "tool-call";
  value: {
    toolCallId: string;
    toolName: string;
    args: any;
    status: "calling";
    subAgentName?: string;
  };
}

interface ToolResultAnnotation {
  type: "tool-result";
  value: {
    toolCallId: string;
    toolName: string;
    result: any;
    status: "completed";
    subAgentName?: string;
  };
}

interface ErrorAnnotation {
  type: "error";
  value: {
    error: string;
  };
}

type MessageAnnotation = ToolCallAnnotation | ToolResultAnnotation | ErrorAnnotation;

export function CalculatorChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hello! I'm your AI-powered calculator. You can write your calculations in natural language. For example: '5 plus 3 times 2' or '(25 + 75) / 4'.",
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

  const formatPartAsAnnotation = (part: UIMessage["parts"][number]): MessageAnnotation | null => {
    if (part.type === "tool-invocation") {
      if (part.toolInvocation.state === "result") {
        return {
          type: "tool-result",
          value: {
            toolCallId: part.toolInvocation.toolCallId,
            toolName: part.toolInvocation.toolName,
            result: part.toolInvocation.result,
            status: "completed",
            // @ts-expect-error - subAgentName is not typed
            subAgentName: part.toolInvocation.subAgentName,
          },
        };
      }

      return {
        type: "tool-call",
        value: {
          toolCallId: part.toolInvocation.toolCallId,
          toolName: part.toolInvocation.toolName,
          args: part.toolInvocation.args,
          status: "calling",
          // @ts-expect-error - subAgentName is not typed
          subAgentName: part.toolInvocation.subAgentName,
        },
      };
    }

    return null;
  };

  const renderToolCall = (annotation: ToolCallAnnotation) => (
    <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 my-2">
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-blue-300">
          Tool Call: {annotation.value.toolName}{" "}
          {annotation.value.subAgentName ? `(Sub-Agent: ${annotation.value.subAgentName})` : ""}
        </span>
      </div>
      <div className="mt-2 text-xs text-blue-200">
        <strong>Arguments:</strong>{" "}
        <code className="bg-blue-950/50 px-1 rounded">{JSON.stringify(annotation.value.args)}</code>
      </div>
    </div>
  );

  const renderToolResult = (annotation: ToolResultAnnotation) => (
    <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 my-2">
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 bg-green-400 rounded-full" />
        <span className="text-sm font-medium text-green-300">
          Tool Result: {annotation.value.toolName}{" "}
          {annotation.value.subAgentName ? `(Sub-Agent: ${annotation.value.subAgentName})` : ""}
        </span>
      </div>
      <div className="mt-2 text-xs text-green-200">
        <strong>Result:</strong>{" "}
        <code className="bg-green-950/50 px-1 rounded">
          {JSON.stringify(annotation.value.result)}
        </code>
      </div>
    </div>
  );

  const renderError = (annotation: ErrorAnnotation) => (
    <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 my-2">
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 bg-red-400 rounded-full" />
        <span className="text-sm font-medium text-red-300">Error</span>
      </div>
      <div className="mt-2 text-xs text-red-200">{annotation.value.error}</div>
    </div>
  );

  const renderAnnotations = (parts: UIMessage["parts"] = []) => {
    console.log(parts);
    return parts
      .map(formatPartAsAnnotation)
      .filter((annotation): annotation is MessageAnnotation => annotation !== null)
      .map((annotation, index) => {
        const key =
          annotation.type === "tool-call" || annotation.type === "tool-result"
            ? `${annotation.type}-${annotation.value.toolCallId || index}`
            : `${annotation.type}-${index}`;

        switch (annotation.type) {
          case "tool-call":
            return <div key={key}>{renderToolCall(annotation)}</div>;
          case "tool-result":
            return <div key={key}>{renderToolResult(annotation)}</div>;
          case "error":
            return <div key={key}>{renderError(annotation)}</div>;
          default:
            return null;
        }
      });
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
                  <div className="whitespace-pre-wrap">{message.content}</div>

                  {message.parts && renderAnnotations(message.parts)}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
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
          )}
        </div>
      </div>

      {/* Input Form */}
      <div className="border-t border-gray-700 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Start typing your calculation... (e.g.: 25 + 17 * 3)"
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-[#24f2ff] focus:border-[#24f2ff] transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-[#333333] hover:bg-[#444444] focus:ring-4 focus:ring-[#333333]/50 text-white font-medium rounded-lg px-6 py-3 transition-all duration-200 ease-in-out focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
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
