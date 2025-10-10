"use client";

import { useChat } from "@ai-sdk/react";
import type { ClientSideToolResult } from "@voltagent/core";
import {
  type ChatOnToolCallCallback,
  DefaultChatTransport,
  type TextUIPart,
  type UIDataTypes,
  type UIMessage,
  type UIMessagePart,
  type UITools,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useCallback, useEffect, useMemo, useState } from "react";

function isTextPart(part: UIMessagePart<UIDataTypes, UITools>): part is TextUIPart {
  return part.type === "text";
}

function stateIsCalling(state?: string) {
  return state === "input-streaming" || state === "input-available";
}

function ToolStatus({ children }: { children: React.ReactNode }) {
  return <div className="tool-status">{children}</div>;
}

function LocationTool({
  state,
}: {
  state?: string;
}) {
  if (stateIsCalling(state)) return <ToolStatus>Getting location...</ToolStatus>;
  return <ToolStatus>getLocation: {state}</ToolStatus>;
}

function ReadClipboardTool({
  callId,
  state,
  addToolResult,
}: {
  callId: string;
  state?: string;
  addToolResult: (res: ClientSideToolResult) => void;
}) {
  if (stateIsCalling(state)) {
    return (
      <div className="tool-card">
        <p>Allow access to your clipboard?</p>
        <button
          type="button"
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              addToolResult({
                tool: "readClipboard",
                toolCallId: callId,
                output: { content: text },
              });
            } catch {
              addToolResult({
                state: "output-error",
                tool: "readClipboard",
                toolCallId: callId,
                errorText: "Clipboard access denied",
              });
            }
          }}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() =>
            addToolResult({
              state: "output-error",
              tool: "readClipboard",
              toolCallId: callId,
              errorText: "Access denied",
            })
          }
        >
          No
        </button>
      </div>
    );
  }
  // Let the agent render the content afterwards
  return <ToolStatus>readClipboard: {state}</ToolStatus>;
}

function WeatherTool({
  state,
  input,
}: {
  state?: string;
  input?: { city: string };
}) {
  if (stateIsCalling(state)) {
    return <ToolStatus>Getting weather for {input?.city}...</ToolStatus>;
  }
  return <ToolStatus>getWeather: {state}</ToolStatus>;
}

function ToolUIPartRenderer({
  part,
  index,
  addToolResult,
}: {
  part: UIMessagePart<UIDataTypes, UITools>;
  index: number;
  addToolResult: (res: ClientSideToolResult) => void;
}) {
  if (!isToolUIPart(part)) return null;

  const { state, input } = part;
  const toolName = getToolName(part);
  const callId = part.toolCallId ?? `${toolName}-${index}`;

  switch (toolName) {
    case "getLocation":
      return <LocationTool state={state} />;
    case "readClipboard":
      return <ReadClipboardTool callId={callId} state={state} addToolResult={addToolResult} />;
    case "getWeather":
      return <WeatherTool state={state} input={input as { city: string }} />;
    default:
      return (
        <ToolStatus>
          {toolName}: {state}
        </ToolStatus>
      );
  }
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ClientSideToolResult | null>(null);

  const handleToolCall: ChatOnToolCallCallback<UIMessage<unknown, UIDataTypes, UITools>> =
    useCallback(async ({ toolCall }) => {
      // Only handles getLocation automatically; others handled via UI
      if (toolCall.toolName !== "getLocation") return;

      if (!navigator.geolocation) {
        setResult({
          state: "output-error",
          tool: "getLocation",
          toolCallId: toolCall.toolCallId,
          errorText: "navigator.geolocation not available in your browser",
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const payload: ClientSideToolResult = {
            tool: "getLocation",
            toolCallId: toolCall.toolCallId,
            output: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
          };
          setResult(payload);
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
    }, []);

  const { messages, sendMessage, addToolResult, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: handleToolCall,
  });

  useEffect(() => {
    if (!result) return;
    addToolResult(result);
  }, [result, addToolResult]);

  const examplePrompts = useMemo(
    () => [
      { id: 1, emoji: "📍", text: "Get my location", prompt: "What's my current location?" },
      { id: 2, emoji: "📋", text: "Read clipboard", prompt: "What's in my clipboard?" },
      { id: 3, emoji: "🌤️", text: "Check weather", prompt: "What's the weather in San Francisco?" },
    ],
    [],
  );

  return (
    <div className="container">
      <h1>VoltAgent Client-Side Tools</h1>

      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            {message.parts.map((part, index) => {
              if (isTextPart(part)) {
                return part.text ? (
                  <div key={`${message.id}-${part.text.slice(0, 5)}`} className="message-content">
                    {part.text}
                  </div>
                ) : null;
              }
              return (
                <ToolUIPartRenderer
                  key={`${message.id}-${index}`}
                  part={part}
                  index={index}
                  addToolResult={addToolResult}
                />
              );
            })}
          </div>
        ))}

        {status === "submitted" && (
          <div className="message assistant">
            <span className="loading" />
            <span className="loading" />
            <span className="loading" />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text || status === "streaming") return;
          sendMessage({ text });
          setInput("");
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          disabled={status === "streaming"}
        />
        <button type="submit" disabled={status === "streaming" || !input.trim()}>
          Send
        </button>
      </form>

      <div className="examples">
        <p>Try these examples:</p>
        {examplePrompts.map((example) => (
          <button key={example.id} onClick={() => setInput(example.prompt)}>
            {example.emoji} {example.text}
          </button>
        ))}
      </div>
    </div>
  );
}
