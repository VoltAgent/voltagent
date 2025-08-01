import CodeBlock from "@theme/CodeBlock";
import React, { useState } from "react";

const sessionExamples = [
  {
    id: "basic",
    name: "Basic Session Creation",
    description:
      "Create a session by adding conversationId to group related traces together.",
    examples: {
      python: `async with sdk.trace(
    agentId="support-agent-v1",
    input={"query": "How to reset password?"},
    userId="user-123",
    conversationId="conv-456",
    tags=["support", "password-reset"],
    metadata={
        "priority": "high",
        "source": "web-chat",
    },
) as trace:
    print(f"Trace created: {trace.id}")`,
      vercel: `const result = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "How to reset password?",
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "support-agent-v1",
      userId: "user-123",
      conversationId: "conv-456", // Session identifier
      instructions: "You are a customer support agent"
    }
  }
});`,
      javascript: `const trace = await sdk.trace({
  name: "Customer Support Query",
  agentId: "support-agent-v1",
  input: { query: "How to reset password?" },
  userId: "user-123",
  conversationId: "conv-456",
  tags: ["support", "password-reset"],
  metadata: {
    priority: "high",
    source: "web-chat",
  },
});`,
    },
    details:
      "Start by adding a conversationId to any trace creation. All traces sharing the same conversationId will be automatically grouped into a session for replay and analysis.",
  },
  {
    id: "multi-turn",
    name: "Multi-Turn Conversation",
    description:
      "Create multiple traces within the same session for conversation flow tracking.",
    examples: {
      python: `# First interaction - Session begins
async with sdk.trace(
    agentId="support-agent-v1", 
    input={"query": "How to reset password?"},
    conversationId="conv-456"
) as trace1:
    pass

# Second interaction - Same session continues  
async with sdk.trace(
    agentId="support-agent-v1",
    input={"query": "I didn't receive the reset email"},
    conversationId="conv-456"  # Same session ID
) as trace2:
    pass`,
      vercel: `// First message in conversation
await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "How to reset password?",
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "support-agent",
      conversationId: "conv-456"
    }
  }
});

// Follow-up message in same conversation
await generateText({
  model: openai("gpt-4o-mini"), 
  prompt: "I didn't receive the reset email",
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "support-agent",
      conversationId: "conv-456" // Same session
    }
  }
});`,
      javascript: `const conversationId = "conv-456";

// First interaction
const agent1 = new Agent({
  conversationId,
  instructions: "Help with password reset"
});
await agent1.run("How to reset password?");

// Second interaction - same session
const agent2 = new Agent({
  conversationId, // Same conversation ID
  instructions: "Continue helping user"
});
await agent2.run("I didn't receive the reset email");`,
    },
    details:
      "Use the same conversationId across multiple traces to create a conversation thread. This enables session replay and complete user journey visibility.",
  },
  {
    id: "session-naming",
    name: "Session ID Best Practices",
    description:
      "Use meaningful, unique identifiers for better session organization and filtering.",
    examples: {
      python: `import uuid
from datetime import datetime

# ✅ Good: Descriptive and unique
conversationId = f"support_{datetime.now().strftime('%Y%m%d')}_{userId}_{uuid.uuid4().hex[:8]}"
conversationId = f"chat_session_{userId}_{int(time.time())}"
conversationId = f"workflow_order_{orderId}"

# ❌ Avoid: Generic or reused IDs
conversationId = "session1"
conversationId = "chat"`,
      vercel: `// ✅ Good: Meaningful identifiers
const conversationId = \`support_\${new Date().toISOString().split('T')[0]}_user-123\`;
const conversationId = \`chat_\${userId}_\${Date.now()}\`;
const conversationId = \`workflow_order_\${orderId}\`;

// ❌ Avoid: Generic IDs
const conversationId = "session1";
const conversationId = "chat";`,
      javascript: `// ✅ Good: Structured naming
const conversationId = \`support_\${Date.now()}_\${userId}\`;
const conversationId = \`meeting_\${projectId}_\${timestamp}\`;
const conversationId = \`workflow_\${workflowType}_\${id}\`;

// Used in agent creation
const agent = new Agent({
  conversationId,
  name: "Support Agent"
});`,
    },
    details:
      "Use descriptive naming patterns that include context like date, user ID, or workflow type. This makes sessions easier to find, filter, and analyze in your dashboard.",
  },
];

const SessionExplorer = () => {
  const [selectedExampleId, setSelectedExampleId] = useState<string>("basic");
  const [selectedSDK, setSelectedSDK] = useState<string>("javascript");

  const selectedExample = sessionExamples.find(
    (example) => example.id === selectedExampleId,
  );

  const sdkOptions = [
    { id: "javascript", name: "JS/TS SDK" },
    { id: "python", name: "Python SDK" },
    { id: "vercel", name: "Vercel AI SDK" },
  ];

  return (
    <div
      className="my-5 rounded-lg border-solid border-zinc-800 bg-gray-900 p-5 text-gray-100 shadow-lg"
      style={{ backgroundColor: "#1a1a1a" }}
    >
      <h3 className="mb-5 mt-0 border-b border-gray-700 pb-2.5 text-xl text-gray-300">
        Session Usage Patterns
      </h3>
      <div className="mb-5 flex flex-wrap gap-2.5">
        {sessionExamples.map((example) => (
          <div
            key={example.id}
            className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ease-in-out ${
              selectedExampleId === example.id
                ? "bg-emerald-400/10 text-emerald-400  border-solid border border-emerald-400/20 "
                : "border-solid border border-emerald-400/20 text-emerald-300 hover:bg-emerald-800/30 hover:text-emerald-100"
            }`}
            onClick={() => setSelectedExampleId(example.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedExampleId(example.id);
              }
            }}
            role="button"
            tabIndex={0}
          >
            {example.name}
          </div>
        ))}
      </div>

      {selectedExample && (
        <div
          className="mt-5 rounded-md border border-gray-700 bg-gray-800 p-4 text-gray-200"
          style={{ backgroundColor: "#242424" }}
        >
          <h4 className="mb-2 mt-0 text-lg text-emerald-300">
            {selectedExample.name}
          </h4>
          <p className="leading-relaxed text-gray-200 mb-4">
            {selectedExample.description}
          </p>

          {/* SDK Tabs */}
          <div className="mb-4">
            <div className="flex gap-1">
              {sdkOptions.map((sdk) => (
                <div
                  key={sdk.id}
                  className={`cursor-pointer px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors duration-200 ${
                    selectedSDK === sdk.id
                      ? "bg-gray-900 text-emerald-300 border-b-2 border-emerald-500"
                      : "bg-gray-600 text-gray-400 hover:text-gray-200 hover:bg-gray-500"
                  }`}
                  onClick={() => setSelectedSDK(sdk.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedSDK(sdk.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {sdk.name}
                </div>
              ))}
            </div>
          </div>

          {/* Code Example */}
          <div>
            <h5 className="mb-2 text-base text-emerald-200">Example:</h5>
            <CodeBlock
              language={
                selectedSDK === "javascript"
                  ? "typescript"
                  : selectedSDK === "python"
                    ? "python"
                    : "javascript"
              }
              showLineNumbers
            >
              {selectedExample.examples[selectedSDK]}
            </CodeBlock>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionExplorer;
