"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect } from "react";

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, addToolResult, isLoading } = useChat({
    maxSteps: 5,

    // Automatic client-side tool execution
    async onToolCall({ toolCall }) {
      // Handle automatic tools
      if (toolCall.toolName === "getLocation") {
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            resolve({ error: "Geolocation not supported" });
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              });
            },
            (error) => {
              resolve({ error: error.message });
            },
          );
        });
      }
    },
  });

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  // Example prompts
  const examplePrompts = [
    { emoji: "📍", text: "Get my location", prompt: "What's my current location?" },
    { emoji: "📋", text: "Read clipboard", prompt: "What's in my clipboard?" },
    { emoji: "🌤️", text: "Check weather", prompt: "What's the weather in San Francisco?" },
  ];

  return (
    <div className="container">
      <h1>VoltAgent Client-Side Tools</h1>

      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            {message.parts.map((part, index) => {
              switch (part.type) {
                case "text":
                  return part.text ? (
                    <div key={index} className="message-content">
                      {part.text}
                    </div>
                  ) : null;

                case "tool-invocation": {
                  const callId = part.toolInvocation.toolCallId;
                  const toolName = part.toolInvocation.toolName;
                  const state = part.toolInvocation.state;

                  // Automatic tools (getLocation)
                  if (toolName === "getLocation") {
                    switch (state) {
                      case "call":
                        return (
                          <div key={callId} className="tool-status">
                            Getting location...
                          </div>
                        );
                      case "result":
                        return (
                          <div key={callId} className="tool-status">
                            Location: {JSON.stringify(part.toolInvocation.result)}
                          </div>
                        );
                    }
                  }

                  // Interactive tool (readClipboard)
                  if (toolName === "readClipboard") {
                    switch (state) {
                      case "call":
                        return (
                          <div key={callId} className="tool-card">
                            <p>Allow access to your clipboard?</p>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const text = await navigator.clipboard.readText();
                                  addToolResult({
                                    toolCallId: callId,
                                    result: { content: text },
                                  });
                                } catch (error) {
                                  addToolResult({
                                    toolCallId: callId,
                                    result: { error: "Clipboard access denied" },
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
                                  toolCallId: callId,
                                  result: { error: "Access denied" },
                                })
                              }
                            >
                              No
                            </button>
                          </div>
                        );
                      case "result":
                        // Don't show result UI - agent will display the content
                        return null;
                    }
                  }

                  // Server-side tool (getWeather)
                  if (toolName === "getWeather") {
                    switch (state) {
                      case "call":
                        return (
                          <div key={callId} className="tool-status">
                            Getting weather for {part.toolInvocation.args?.city}...
                          </div>
                        );
                      case "result":
                        return null; // Agent will display the weather info
                    }
                  }

                  // Default case for unknown tools
                  return (
                    <div key={callId} className="tool-status">
                      {toolName}: {state}
                    </div>
                  );
                }

                default:
                  return null;
              }
            })}
          </div>
        ))}

        {isLoading && (
          <div className="message assistant">
            <span className="loading"></span>
            <span className="loading"></span>
            <span className="loading"></span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask me anything..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>

      <div className="examples">
        <p>Try these examples:</p>
        {examplePrompts.map((example, i) => (
          <button
            key={i}
            onClick={() => {
              const event = {
                target: { value: example.prompt },
              } as React.ChangeEvent<HTMLInputElement>;
              handleInputChange(event);
            }}
          >
            {example.emoji} {example.text}
          </button>
        ))}
      </div>
    </div>
  );
}
