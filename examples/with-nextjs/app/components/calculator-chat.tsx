"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage, getToolName, isToolUIPart } from "ai";
import { useEffect, useRef, useState } from "react";

// Subagent data event helpers
const SUBAGENT_DATA_EVENT_TYPE = "data-subagent-stream";

interface SubAgentDataEvent {
  type: typeof SUBAGENT_DATA_EVENT_TYPE;
  // No id field - each delta is a separate part
  data: {
    subAgentName: string;
    subAgentId?: string;
    originalType: string;
    delta?: string;
    text?: string;
    [key: string]: any;
  };
}

function isSubAgentDataEvent(part: any): part is SubAgentDataEvent {
  return part?.type === SUBAGENT_DATA_EVENT_TYPE;
}

export function CalculatorChat() {
  const [input, setInput] = useState("");
  const [chatKey, setChatKey] = useState(0);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);

  // Load messages from storage on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch("/api/messages?conversationId=1&userId=1");
        if (response.ok) {
          const { data } = await response.json();
          if (data && data.length > 0) {
            setInitialMessages(data);
            setChatKey((prev) => prev + 1);
          }
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    };
    loadMessages();
  }, []);

  const { messages, sendMessage, status, error } = useChat({
    id: `chat-${chatKey}`,
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    messages: initialMessages,
    onError: () => {
      // Handle errors silently
    },
  });

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  });

  // Helper to get agent display info with colors
  const getAgentInfo = (name: string) => {
    const agents: Record<
      string,
      { icon: string; displayName: string; color: string; bgColor: string }
    > = {
      UppercaseAgent: {
        icon: "🔠",
        displayName: "Uppercase Converter",
        color: "text-purple-400",
        bgColor: "bg-purple-900/20 border-purple-500/30",
      },
      WordCountAgent: {
        icon: "📊",
        displayName: "Word Counter",
        color: "text-green-400",
        bgColor: "bg-green-900/20 border-green-500/30",
      },
      StoryWriterAgent: {
        icon: "📝",
        displayName: "Story Writer",
        color: "text-blue-400",
        bgColor: "bg-blue-900/20 border-blue-500/30",
      },
    };

    return (
      agents[name] || {
        icon: "🤖",
        displayName: name || "Assistant",
        color: "text-gray-400",
        bgColor: "bg-gray-800/20 border-gray-600/30",
      }
    );
  };

  // Render message parts as a pure timeline
  const renderMessage = (message: UIMessage) => {
    const parts = message.parts || [];

    // Pre-process parts to aggregate consecutive subagent text-delta events
    const processedParts: any[] = [];
    let currentSubagentGroup: { subAgentName: string; text: string } | null = null;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (isSubAgentDataEvent(part) && part.data.originalType === "text-delta" && part.data.delta) {
        // If this is a text-delta from a subagent
        if (currentSubagentGroup && currentSubagentGroup.subAgentName === part.data.subAgentName) {
          // Same subagent, accumulate text
          currentSubagentGroup.text += part.data.delta;
        } else {
          // Different subagent or first subagent
          if (currentSubagentGroup) {
            // Save the previous group
            processedParts.push({
              type: "aggregated-subagent-text",
              ...currentSubagentGroup,
            });
          }
          // Start new group
          currentSubagentGroup = {
            subAgentName: part.data.subAgentName,
            text: part.data.delta,
          };
        }
      } else {
        // Not a subagent text-delta
        if (currentSubagentGroup) {
          // Save any pending subagent group
          processedParts.push({
            type: "aggregated-subagent-text",
            ...currentSubagentGroup,
          });
          currentSubagentGroup = null;
        }
        // Add the non-subagent part
        processedParts.push(part);
      }
    }

    // Don't forget the last group if any
    if (currentSubagentGroup) {
      processedParts.push({
        type: "aggregated-subagent-text",
        ...currentSubagentGroup,
      });
    }

    return (
      <div className="space-y-2">
        {processedParts.map((part, index) => {
          const partType = (part as any)?.type;

          // Handle aggregated subagent text
          if (partType === "aggregated-subagent-text") {
            const agentInfo = getAgentInfo(part.subAgentName);
            return (
              <div
                key={`subagent-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  index
                }`}
                className="ml-4"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs mt-1">{agentInfo.icon}</span>
                  <div className="flex-1">
                    <div className="text-xs text-gray-400 mb-1">{agentInfo.displayName}</div>
                    <div className="text-gray-300 whitespace-pre-wrap">{part.text}</div>
                  </div>
                </div>
              </div>
            );
          }

          // Check if this is a subagent data event (non text-delta ones)
          if (isSubAgentDataEvent(part)) {
            const { subAgentName, originalType, text } = part.data;

            // Handle other text events if needed
            if (originalType === "text" && text && text.trim()) {
              const agentInfo = getAgentInfo(subAgentName);
              return (
                <div
                  key={`subagent-${
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    index
                  }`}
                  className="ml-4"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs mt-1">{agentInfo.icon}</span>
                    <div className="flex-1">
                      <div className="text-xs text-gray-400 mb-1">{agentInfo.displayName}</div>
                      <div className="text-gray-300 whitespace-pre-wrap">{text}</div>
                    </div>
                  </div>
                </div>
              );
            }

            // Skip other subagent event types (text-start, text-end, etc.)
            return null;
          }

          // Step boundaries
          if (partType === "step-start") {
            return (
              <div
                key={`step-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  index
                }`}
                className="flex items-center gap-2 text-xs text-gray-500 my-2"
              >
                <div className="flex-1 h-px bg-gray-700" />
                <span>→ step</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>
            );
          }

          // Tool parts
          if (isToolUIPart(part)) {
            const toolName = getToolName(part);
            // @ts-expect-error input/output may vary
            const input = "input" in part ? part.input : "args" in part ? part.args : undefined;
            const output =
              "output" in part ? part.output : "result" in part ? part.result : undefined;
            const state = "state" in part ? part.state : undefined;

            return (
              <div
                key={`tool-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  index
                }`}
                className="ml-4 p-2 bg-gray-800/30 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>🔧</span>
                  <span className="font-mono">{toolName}</span>
                  {state && <span className="text-gray-500">({state})</span>}
                </div>
                {input && (
                  <details className="mt-1">
                    <summary className="text-xs text-blue-400 cursor-pointer">Input</summary>
                    <pre className="text-xs text-gray-300 mt-1 p-1 bg-black/20 rounded overflow-x-auto">
                      {JSON.stringify(input, null, 2)}
                    </pre>
                  </details>
                )}
                {output && (
                  <details className="mt-1">
                    <summary className="text-xs text-green-400 cursor-pointer">Output</summary>
                    <pre className="text-xs text-gray-300 mt-1 p-1 bg-black/20 rounded overflow-x-auto">
                      {JSON.stringify(output, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            );
          }

          // Text parts
          if (part && typeof part === "object" && "type" in part && part.type === "text") {
            // Safe check for text property
            if ("text" in part && typeof part.text === "string") {
              const text = part.text;
              if (text?.trim()) {
                return (
                  <div
                    key={`text-${
                      // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                      index
                    }`}
                    className="text-gray-300 whitespace-pre-wrap"
                  >
                    {text}
                  </div>
                );
              }
            }
          }

          return null;
        })}
      </div>
    );
  };

  return (
    <div className="bg-[#1b1b1b] border-2 border-[#333333] rounded-xl shadow-xl overflow-hidden max-w-5xl mx-auto">
      <div className="bg-[#333333] p-6">
        <h2 className="text-white text-2xl font-bold">Text Processing Agents</h2>
        <p className="text-gray-400 text-sm mt-1">
          Supervisor delegates to specialized text agents
        </p>
      </div>

      {/* Chat Messages */}
      <div ref={messagesContainerRef} className="p-6 max-h-[600px] overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-md lg:max-w-2xl px-4 py-2 rounded-lg ${
                  message.role === "user"
                    ? "bg-[#333333] text-white"
                    : "bg-gray-800 text-gray-300 border border-gray-700"
                }`}
              >
                <div className="text-sm">
                  {message.role === "assistant" && (
                    <div className="flex items-center mb-2">
                      <div className="w-2 h-2 bg-[#24f2ff] rounded-full mr-2" />
                      <span className="text-xs text-gray-400">Assistant</span>
                    </div>
                  )}
                  {message.role === "user" ? (
                    <div className="whitespace-pre-wrap">
                      {(() => {
                        const filtered = message.parts?.filter((part) => {
                          const isValid = part && typeof part === "object" && part.type === "text";
                          return isValid;
                        });

                        const texts = filtered?.map((part) => {
                          if ("text" in part && typeof part.text === "string") {
                            return part.text;
                          }
                          return "";
                        });

                        return texts?.join("");
                      })()}
                    </div>
                  ) : (
                    renderMessage(message)
                  )}
                </div>
              </div>
            </div>
          ))}
          {error && <div className="text-red-400">An error occurred: {error.message}</div>}
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
            placeholder="Enter text to process..."
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-[#24f2ff] focus:border-[#24f2ff] transition-colors"
          />
          <button
            type="submit"
            disabled={status !== "ready"}
            className="bg-[#333333] hover:bg-[#444444] focus:ring-4 focus:ring-[#333333]/50 text-white font-medium rounded-lg px-6 py-3 transition-all duration-200 ease-in-out focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
