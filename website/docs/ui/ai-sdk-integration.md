---
title: AI SDK UI Integration
sidebar_label: AI SDK UI
---

# AI SDK UI Integration

VoltAgent works with Vercel's AI SDK UI hooks for building chat interfaces. This guide shows how to integrate VoltAgent with `useChat`.

## Prerequisites

```bash
npm install ai @ai-sdk/react
# or
pnpm add ai @ai-sdk/react
```

## Endpoints

VoltAgent provides two streaming endpoints:

- `/agents/:id/chat` - UI message stream (useChat compatible)
- `/agents/:id/stream` - Raw fullStream events

Use `/chat` for UI integration with useChat.
Use `/stream` when you need low-level events such as `reasoning-start`, `reasoning-delta`, and `reasoning-end`.

## Basic Implementation

```typescript
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback } from 'react';

function ChatComponent() {
  const agentId = 'your-agent-id';
  const apiUrl = 'http://localhost:3141';

  const createTransport = useCallback(() => {
    return new DefaultChatTransport({
      api: `${apiUrl}/agents/${agentId}/chat`,
      prepareSendMessagesRequest({ messages }) {
        // VoltAgent expects the last message
        const lastMessage = messages[messages.length - 1];

        return {
          body: {
            input: [lastMessage], // Array of UIMessage
            options: {}
          }
        };
      }
    });
  }, [apiUrl, agentId]);

  const {
    messages,
    sendMessage,
    isLoading,
    stop
  } = useChat({
    transport: createTransport()
  });

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}
    </div>
  );
}
```

## With Memory and Context

```typescript
function ChatWithMemory() {
  const [userId] = useState("user-123");
  const [conversationId] = useState(() => crypto.randomUUID());

  const createTransport = useCallback(() => {
    return new DefaultChatTransport({
      api: `${apiUrl}/agents/${agentId}/chat`,
      prepareSendMessagesRequest({ messages }) {
        const lastMessage = messages[messages.length - 1];

        return {
          body: {
            input: [lastMessage],
            options: {
              // Memory
              userId,
              conversationId,

              // Model parameters
              temperature: 0.7,
              maxOutputTokens: 4000,
              maxSteps: 10,

              // Context
              context: {
                role: "admin",
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
            },
          },
        };
      },
    });
  }, [userId, conversationId]);

  const { messages, sendMessage } = useChat({
    transport: createTransport(),
  });

  // Your UI...
}
```

## File Attachments

```typescript
function ChatWithFiles() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createTransport = useCallback(() => {
    return new DefaultChatTransport({
      api: `${apiUrl}/agents/${agentId}/chat`,
      prepareSendMessagesRequest({ messages }) {
        const lastMessage = messages[messages.length - 1];

        return {
          body: {
            input: [lastMessage],
            options: {
              userId: 'user-123'
            }
          }
        };
      }
    });
  }, []);

  const { messages, sendMessage: sendAIMessage } = useChat({
    transport: createTransport()
  });

  const handleSubmit = async (text: string) => {
    // Send with files using AI SDK's native format
    await sendAIMessage({
      text,
      ...(selectedFiles && { files: selectedFiles })
    });

    // Clear files after sending
    setSelectedFiles(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => setSelectedFiles(e.target.files)}
      />

      {/* Show selected files */}
      {selectedFiles && Array.from(selectedFiles).map((file, i) => (
        <div key={i}>{file.name}</div>
      ))}

      {/* Your chat UI... */}
    </div>
  );
}
```

## Handling Stream States

```typescript
function StreamingChat() {
  const { messages, status, stop } = useChat({
    transport: createTransport()
  });

  // status: 'idle' | 'streaming' | 'submitted' | 'error'

  return (
    <div>
      {status === 'submitted' && <div>Sending...</div>}
      {status === 'streaming' && (
        <div>
          Agent is typing...
          <button onClick={stop}>Stop</button>
        </div>
      )}

      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

## Tool Calls Display

```typescript
function MessageWithTools({ message }) {
  const toolInvocations = message.toolInvocations;

  return (
    <div>
      <p>{message.content}</p>

      {toolInvocations?.map((invocation, i) => (
        <div key={i}>
          <strong>Tool: {invocation.toolName}</strong>
          <pre>{JSON.stringify(invocation.args, null, 2)}</pre>
          {invocation.result && (
            <div>Result: {JSON.stringify(invocation.result)}</div>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Complete Example

```typescript
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback, useState, useRef } from 'react';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const [userId] = useState('user-123');
  const [conversationId] = useState(() => crypto.randomUUID());

  const createTransport = useCallback(() => {
    return new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_API_URL}/agents/assistant/chat`,
      prepareSendMessagesRequest({ messages }) {
        const lastMessage = messages[messages.length - 1];

        return {
          body: {
            input: [lastMessage],
            options: {
              userId,
              conversationId,
              temperature: 0.7,
              maxSteps: 10
            }
          }
        };
      }
    });
  }, [userId, conversationId]);

  const {
    messages,
    sendMessage,
    stop,
    status,
    setMessages
  } = useChat({
    transport: createTransport(),
    onFinish: () => {
      console.log('Message completed');
    },
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    await sendMessage(input);
    setInput('');
  };

  const resetConversation = () => {
    setMessages([]);
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            <strong>{message.role}:</strong>
            <div>{message.content}</div>
          </div>
        ))}

        {status === 'streaming' && (
          <div className="typing-indicator">Agent is typing...</div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={status === 'streaming'}
        />

        <button type="submit" disabled={!input.trim() || status === 'streaming'}>
          Send
        </button>

        {status === 'streaming' && (
          <button type="button" onClick={stop}>
            Stop
          </button>
        )}

        <button type="button" onClick={resetConversation}>
          Clear
        </button>
      </form>
    </div>
  );
}
```

## Request Options

### VoltAgent Specific

| Option                                      | Type    | Description                                                                    |
| ------------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| `userId`                                    | string  | User identifier for memory persistence                                         |
| `conversationId`                            | string  | Conversation thread ID                                                         |
| `context`                                   | object  | Dynamic context (converted to Map internally)                                  |
| `contextLimit`                              | number  | Number of previous messages to include from memory                             |
| `conversationPersistence.mode`              | string  | `"step"` (default) or `"finish"`                                               |
| `conversationPersistence.debounceMs`        | number  | Debounce window in milliseconds (default: `200`)                               |
| `conversationPersistence.flushOnToolResult` | boolean | Flush immediately on `tool-result`/`tool-error` in step mode (default: `true`) |

Example:

```ts
options: {
  userId,
  conversationId,
  conversationPersistence: {
    mode: "step",
    debounceMs: 200,
    flushOnToolResult: true,
  },
}
```

### AI SDK Core Options

| Option             | Type     | Default | Description                            |
| ------------------ | -------- | ------- | -------------------------------------- |
| `temperature`      | number   | 0.7     | Controls randomness (0-1)              |
| `maxOutputTokens`  | number   | 4000    | Maximum tokens to generate             |
| `maxTokens`        | number   | -       | Alias for maxOutputTokens              |
| `maxSteps`         | number   | 5       | Maximum tool-use iterations            |
| `topP`             | number   | -       | Nucleus sampling (0-1)                 |
| `topK`             | number   | -       | Sample from top K options              |
| `frequencyPenalty` | number   | 0       | Repeat penalty for words/phrases (0-2) |
| `presencePenalty`  | number   | 0       | Repeat penalty for information (0-2)   |
| `seed`             | number   | -       | Random seed for deterministic results  |
| `stopSequences`    | string[] | -       | Sequences that halt generation         |
| `maxRetries`       | number   | 2       | Number of retry attempts               |

### Provider-Specific Options

| Option                                    | Type     | Description                                        |
| ----------------------------------------- | -------- | -------------------------------------------------- |
| `providerOptions`                         | object   | Provider-specific settings                         |
| `providerOptions.openai.reasoningEffort`  | string   | OpenAI reasoning effort (e.g. `"low"`, `"medium"`) |
| `providerOptions.openai.textVerbosity`    | string   | OpenAI verbosity (`"low"`, `"medium"`, `"high"`)   |
| `providerOptions.anthropic.sendReasoning` | boolean  | Include Anthropic reasoning metadata               |
| `providerOptions.google.thinkingConfig`   | object   | Gemini thinking budget/configuration               |
| `providerOptions.xai.reasoningEffort`     | string   | xAI reasoning effort                               |
| `providerOptions.extraOptions`            | object   | Additional provider-specific options               |
| `providerOptions.onStepFinish`            | function | Callback when a step completes                     |

### Semantic Memory Options

| Option                            | Type   | Description                       |
| --------------------------------- | ------ | --------------------------------- |
| `semanticSearchOptions`           | object | Configuration for semantic search |
| `semanticSearchOptions.maxChunks` | number | Maximum chunks to retrieve        |
| `semanticSearchOptions.minScore`  | number | Minimum similarity score          |

## useChat Hook Options

| Option            | Type                 | Description              |
| ----------------- | -------------------- | ------------------------ |
| `transport`       | DefaultChatTransport | Required for VoltAgent   |
| `onFinish`        | (message) => void    | Stream complete callback |
| `onError`         | (error) => void      | Error handler            |
| `initialMessages` | UIMessage[]          | Pre-load messages        |

## Troubleshooting

### Agent not found

- Check agent ID matches registered agent
- Verify API URL
- Ensure agent is running

### Stream not working

- Use `/chat` endpoint, not `/stream`
- Check transport configuration
- Verify request body format

### Messages not persisting

- Include `userId` in options
- Use consistent `conversationId`
- Check agent memory configuration

### CORS errors

- Configure CORS on VoltAgent server
- Use proxy in development
