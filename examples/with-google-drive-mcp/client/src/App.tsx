import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import Layout from "./components/Layout";
import VoltLogo from "./components/VoltLogo";
import { useAuth } from "./context/AuthContext";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const { userId, logout, isAuthenticated } = useAuth();
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestedPrompts = [
    "List my Google Drive folders",
    "Summarize the document named 'Project Proposal'",
    "Create a new document named 'Meeting Notes'",
  ];

  // Scroll to bottom of messages
  const prevMessagesLengthRef = useRef(messages.length);

  useEffect(() => {
    if (prevMessagesLengthRef.current !== messages.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      prevMessagesLengthRef.current = messages.length;
    }
  }, [messages]);

  const handleLogout = useCallback(() => {
    logout();
    setMessages([]);
    setStreamError(null);
  }, [logout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !userId) return;

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);

    // Create a placeholder for the assistant's response
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setInput("");
    setIsStreaming(true);
    setStreamError(null);

    // Start the SSE connection
    try {
      const response = await fetch("http://localhost:3000/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: input,
          userId: userId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body is null");

      const decoder = new TextDecoder();
      let assistantContent = "";

      // Process the stream
      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const eventChunks = chunk.split("\n\n");

          for (const eventChunk of eventChunks) {
            if (!eventChunk.trim()) continue;
            if (!eventChunk.startsWith("data: ")) continue;

            try {
              const eventData = JSON.parse(eventChunk.substring(6));

              if (eventData.type === "text") {
                assistantContent += eventData.text;
                // Update the assistant message with new content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId ? { ...msg, content: assistantContent } : msg,
                  ),
                );
              } else if (eventData.type === "completion") {
                // Final message
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg,
                  ),
                );
                setIsStreaming(false);
              } else if (eventData.type === "error") {
                setStreamError(eventData.error);
                setIsStreaming(false);
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: `Error: ${eventData.error}`, isStreaming: false }
                      : msg,
                  ),
                );
              }
            } catch (err) {
              console.error("Error parsing SSE data:", err, eventChunk);
            }
          }
        }
      };

      processStream().catch((err) => {
        console.error("Error processing stream:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setStreamError(errorMessage);
        setIsStreaming(false);
        // Update the message to show error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: `Stream error: ${errorMessage}`, isStreaming: false }
              : msg,
          ),
        );
      });
    } catch (err) {
      console.error("Error starting stream:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setStreamError(errorMessage);
      setIsStreaming(false);
      // Update the message to show error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: `Error: ${errorMessage}`, isStreaming: false }
            : msg,
        ),
      );
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <Layout userId={userId} handleLogout={handleLogout}>
      {streamError && (
        <div className="bg-red-900/30 text-red-400 p-2 text-sm text-center border-b border-red-900">
          Error: {streamError}
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#121212]">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-[#71717a] my-8 p-8 border border-dashed border-[#333333] rounded-lg">
              <VoltLogo className="mx-auto mb-4 scale-150" />
              <p className="text-lg text-[#d4d4d8]">
                Connected as{" "}
                <span className="font-mono bg-[#27272a] px-2 py-0.5 rounded text-sm">{userId}</span>
              </p>
              <p className="text-sm mt-4">Ask questions about your Google Drive files</p>

              {/* Suggested Prompts inside welcome message */}
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSuggestionClick(prompt)}
                    type="button"
                    className="bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] text-sm py-1.5 px-3 rounded-full border border-[#333333] transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-[#27272a] text-[#e4e4e7] border border-[#333333] rounded-bl-none"
                  }`}
                >
                  <div className="break-words">
                    {message.role === "user" ? (
                      message.content
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>
                          {message.content || (message.isStreaming ? "Thinking..." : "")}
                        </ReactMarkdown>
                      </div>
                    )}
                    {message.isStreaming && (
                      <span className="inline-block ml-1 animate-pulse">▌</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-[#1a1a1a] border-t border-[#333333] p-4">
        <div className="max-w-3xl mx-auto">
          {/* Suggested Prompts in input area removed and moved into welcome message above */}

          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isStreaming || !isAuthenticated}
              className="flex-1 p-2.5 rounded-md bg-[#27272a] text-white border border-[#333333] focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-[#1f1f1f] disabled:text-[#71717a]"
              placeholder={
                isStreaming
                  ? "Waiting for response..."
                  : isAuthenticated
                    ? "Message Google Drive Assistant..."
                    : "Loading..."
              }
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim() || !isAuthenticated}
              className="bg-indigo-600 text-white p-2.5 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-800 disabled:opacity-70"
            >
              {isStreaming ? (
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <title>Loading</title>
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
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <title>Send</title>
                  <path
                    fillRule="evenodd"
                    d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
      {/* Main content ends here */}
    </Layout>
  );
}

export default App;
