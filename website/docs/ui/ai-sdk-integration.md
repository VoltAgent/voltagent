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
              memory: {
                userId,
                conversationId,
              },

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
              memory: {
                userId: 'user-123'
              }
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
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());

  const createTransport = useCallback(() => {
    return new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_API_URL}/agents/assistant/chat`,
      prepareSendMessagesRequest({ messages }) {
        const lastMessage = messages[messages.length - 1];

        return {
          body: {
            input: [lastMessage],
            options: {
              memory: {
                userId,
                conversationId,
              },
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
    stop();
    setMessages([]);
    setConversationId(crypto.randomUUID());
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

| Option                                                     | Type              | Description                                                                    |
| ---------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| `memory`                                                   | object            | Runtime memory envelope (preferred)                                            |
| `memory.userId`                                            | string            | User identifier for memory persistence                                         |
| `memory.conversationId`                                    | string            | Conversation thread ID                                                         |
| `context`                                                  | object            | Dynamic context (converted to Map internally)                                  |
| `memory.options.contextLimit`                              | number            | Number of previous messages to include from memory                             |
| `memory.options.readOnly`                                  | boolean           | Read memory context but skip all memory writes for this call                   |
| `memory.options.conversationPersistence.mode`              | string            | `"step"` (default) or `"finish"`                                               |
| `memory.options.conversationPersistence.debounceMs`        | number            | Debounce window in milliseconds (default: `200`)                               |
| `memory.options.conversationPersistence.flushOnToolResult` | boolean           | Flush immediately on `tool-result`/`tool-error` in step mode (default: `true`) |
| `memory.options.messageMetadataPersistence`                | boolean \| object | Persist assistant `message.metadata` fields such as usage and finish reason    |
| `memory.options.messageMetadataPersistence.usage`          | boolean           | Persist token usage under `message.metadata.usage`                             |
| `memory.options.messageMetadataPersistence.finishReason`   | boolean           | Persist the model finish reason under `message.metadata.finishReason`          |
| `userId`                                                   | string            | Deprecated: use `memory.userId`                                                |
| `conversationId`                                           | string            | Deprecated: use `memory.conversationId`                                        |
| `contextLimit`                                             | number            | Deprecated: use `memory.options.contextLimit`                                  |
| `semanticMemory`                                           | object            | Deprecated: use `memory.options.semanticMemory`                                |
| `conversationPersistence.mode`                             | string            | Deprecated: use `memory.options.conversationPersistence.mode`                  |
| `conversationPersistence.debounceMs`                       | number            | Deprecated: use `memory.options.conversationPersistence.debounceMs`            |
| `conversationPersistence.flushOnToolResult`                | boolean           | Deprecated: use `memory.options.conversationPersistence.flushOnToolResult`     |
| `messageMetadataPersistence`                               | boolean \| object | Deprecated: use `memory.options.messageMetadataPersistence`                    |

Example:

```ts
options: {
  memory: {
    userId,
    conversationId,
    options: {
      readOnly: false,
      messageMetadataPersistence: {
        usage: true,
        finishReason: true,
      },
      conversationPersistence: {
        mode: "step",
        debounceMs: 200,
        flushOnToolResult: true,
      },
    },
  },
}
```

When both top-level legacy memory fields and `memory` envelope fields are provided, `memory` values are used.

Set `memory.options.readOnly: true` to load memory context without persisting new messages for that request.

Set `memory.options.messageMetadataPersistence` to persist selected assistant metadata into memory-backed `UIMessage.metadata`. For example, enabling `usage` and `finishReason` makes those fields visible when you later fetch messages from memory, not just in the live UI stream.

REST API example:

```bash
curl -X POST http://localhost:3141/agents/assistant/text \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello",
    "options": {
      "memory": {
        "userId": "user-1",
        "conversationId": "conv-1",
        "options": {
          "messageMetadataPersistence": {
            "usage": true,
            "finishReason": true
          }
        }
      }
    }
  }'
```

Then fetch the saved messages:

```bash
curl "http://localhost:3141/api/memory/conversations/conv-1/messages?agentId=assistant&userId=user-1"
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

| Option                                            | Type    | Description                                 |
| ------------------------------------------------- | ------- | ------------------------------------------- |
| `memory.options.semanticMemory`                   | object  | Configuration for semantic search           |
| `memory.options.semanticMemory.enabled`           | boolean | Enable semantic retrieval for this call     |
| `memory.options.semanticMemory.semanticLimit`     | number  | Maximum similar messages to retrieve        |
| `memory.options.semanticMemory.semanticThreshold` | number  | Minimum similarity score                    |
| `memory.options.semanticMemory.mergeStrategy`     | string  | `"prepend"` or `"append"` or `"interleave"` |

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

- Include `options.memory.userId`
- Use consistent `options.memory.conversationId`
- Check agent memory configuration

### CORS errors

- Configure CORS on VoltAgent server
- Use proxy in development
