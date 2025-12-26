import { useChat } from "@ai-sdk/react";
import type { ClientSideToolResult } from "@voltagent/core";
import {
  type ChatOnToolCallCallback,
  DefaultChatTransport,
  type UIMessage,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

function ChatMessageView({ m }: { m: UIMessage }) {
  const renderContent = (content: any) => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      // Collect text from parts like { type: 'text', text: '...' } or strings
      const textParts: string[] = [];
      for (const part of content) {
        if (typeof part === "string") {
          textParts.push(part);
        } else if (part && typeof part === "object") {
          if (typeof (part as any).text === "string") {
            textParts.push((part as any).text);
          } else if (typeof (part as any).content === "string") {
            textParts.push((part as any).content);
          }
        }
      }
      if (textParts.length > 0) return textParts.join("");
      // Fallback: show structured content for non-text parts (e.g., tool calls)
      return <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(content, null, 2)}</pre>;
    }
    // Unknown shape fallback
    return <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(content, null, 2)}</pre>;
  };

  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        background: m.role === "assistant" ? "#f4f6ff" : "#f6f6f6",
        marginBottom: 8,
      }}
    >
      <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{m.role}</div>
      <div>{renderContent(m.content || m.parts)}</div>
    </div>
  );
}
const agentId = "ai-agent";
const port = "3141";

export default function App() {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [userId] = useState("user-123");
  const [conversationId] = useState("test-conversation-10");
  const [result, setResult] = useState<ClientSideToolResult | null>(null);

  const handleToolCall = useCallback<ChatOnToolCallCallback>(async ({ toolCall }) => {
    if (toolCall.toolName === "getLocation") {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setResult({
            tool: "getLocation",
            toolCallId: toolCall.toolCallId,
            output: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
          });
        },
        (error) => {
          setResult({
            state: "output-error",
            tool: "getLocation",
            toolCallId: toolCall.toolCallId,
            errorText: error.message,
          });
        },
      );
    }
  }, []);

  const { messages, sendMessage, addToolResult } = useChat({
    transport: new DefaultChatTransport({
      api: `http://localhost:${port}/agents/${agentId}/chat`,
      prepareSendMessagesRequest({ messages }) {
        const input = [messages[messages.length - 1]];
        return {
          body: {
            input,
            options: {
              userId,
              conversationId,
              temperature: 0.7,
              maxSteps: 10,
            },
          },
        };
      },
    }),
    onToolCall: handleToolCall,
    onFinish: () => {
      console.log("Message completed");
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  useEffect(() => {
    if (!result) return;
    console.log("Adding tool result:", result);
    addToolResult(result);
  }, [result, addToolResult]);

  // use local state for input control
  const value = input;
  return (
    <div
      style={{
        fontFamily: "Inter, ui-sans-serif, system-ui",
        maxWidth: 720,
        margin: "40px auto",
        padding: 16,
      }}
    >
      <h1>VoltAgent + AI SDK useChat</h1>
      <p style={{ color: "#444" }}>
        This example streams UI messages from VoltAgent's SSE endpoint that is compatible with the
        AI SDK's useChat hook.
      </p>

      <div>
        {messages.map((m) => (
          <ChatMessageView key={m.id} m={m as UIMessage} />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = value?.trim();
          if (text) {
            // AI SDK's sendMessage expects a UIMessage-like object in this version
            sendMessage({ role: "user", content: text } as any);
            setInput("");
          }
          // focus input afterwards
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        style={{ display: "flex", gap: 8, marginTop: 16 }}
      >
        <input
          ref={inputRef}
          name="input"
          value={value}
          onChange={(e) => {
            setInput(e.target.value);
          }}
          placeholder="Type a message..."
          style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd" }}
        />
        <button type="submit" disabled={!value?.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
