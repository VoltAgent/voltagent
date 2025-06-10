import React, { useState } from "react";

const metadataUsageData = [
  {
    id: "basic",
    name: "Basic Agent ID",
    description:
      "Simple agent identification for better tracking and organization.",
    examples: {
      vercel: `experimental_telemetry: {
  isEnabled: true,
  metadata: {
    agentId: "weather-assistant",
    instructions: "You are a helpful weather assistant"
  }
}`,
      typescript: `const trace = await sdk.trace({
  name: "Customer Support Query",
  agentId: "support-agent-v1",
  input: { query: "How to reset password?" },
  metadata: {
    priority: "high",
    source: "web-chat"
  }
});`,
      python: `async with sdk.trace(
    agentId="support-agent-v1",
    input={"query": "How to reset password?"},
    metadata={
        "priority": "high",
        "source": "web-chat"
    }
) as trace:`,
    },
    details:
      "Start with a meaningful agent identifier to distinguish different AI workflows in your dashboard. The agentId helps you filter and analyze specific agent types.",
  },
  {
    id: "user-session",
    name: "User & Session Context",
    description:
      "Track user interactions and conversation flows across multiple turns.",
    examples: {
      vercel: `experimental_telemetry: {
  isEnabled: true,
  metadata: {
    agentId: "weather-assistant",
    userId: "demo-user",
    conversationId: "weather-chat"
  }
}`,
      typescript: `const trace = await sdk.trace({
  name: "Customer Support Query",
  agentId: "support-agent-v1",
  userId: "user-123",
  conversationId: "conv-456",
  tags: ["support", "password-reset"]
});`,
      python: `async with sdk.trace(
    agentId="support-agent-v1",
    userId="user-123",
    conversationId="conv-456",
    tags=["support", "password-reset"]
) as trace:`,
    },
    details:
      "User and session metadata enables user behavior analysis, conversation grouping, and multi-turn interaction tracking. Essential for customer support and conversational AI applications.",
  },
  {
    id: "organizational",
    name: "Organizational Context",
    description:
      "Categorize traces by business units, projects, and environments.",
    examples: {
      vercel: `experimental_telemetry: {
  isEnabled: true,
  metadata: {
    agentId: "weather-assistant",
    userId: "demo-user",
    conversationId: "weather-chat",
    tags: ["weather", "demo", "production"]
  }
}`,
      typescript: `const trace = await sdk.trace({
  name: "Customer Support Query",
  agentId: "support-agent-v1",
  tags: ["support", "password-reset"],
  metadata: {
    priority: "high",
    source: "web-chat"
  }
});`,
      python: `async with sdk.trace(
    agentId="support-agent-v1",
    tags=["support", "password-reset"],
    metadata={
        "priority": "high",
        "source": "web-chat"
    }
) as trace:`,
    },
    details:
      "Organizational metadata helps teams filter traces by business context, track costs by department, and analyze performance across different projects and environments.",
  },
  {
    id: "multi-agent",
    name: "Multi-Agent Relationships",
    description:
      "Establish hierarchical relationships between coordinating agents.",
    examples: {
      vercel: `// Parent Agent
experimental_telemetry: {
  metadata: {
    agentId: "planning-agent",
    userId: "team-lead",
    conversationId: "meeting-organization"
  }
}

// Child Agent  
experimental_telemetry: {
  metadata: {
    agentId: "execution-agent",
    parentAgentId: "planning-agent",
    conversationId: "meeting-organization"
  }
}`,
      typescript: `const agent = await trace.addAgent({
  name: "Support Agent",
  input: { query: "User needs password reset help" },
  instructions: "You are a customer support agent...",
  metadata: {
    modelParameters: {
      model: "gpt-4"
    }
  }
});

const policyChecker = await agent.addAgent({
  name: "Policy Checker",
  input: {
    userId: "user-123",
    requestType: "password-reset",
  },
  instructions: "You are responsible for verifying customer requests against company policies.",
  metadata: {
    modelParameters: {
      model: "gpt-4",
    },
  },
});


`,
      python: `agent = await trace.add_agent({
    "name": "Support Agent", 
    "input": {"query": "User needs password reset help"},
    "instructions": "You are a customer support agent...",
    "metadata": {
        "modelParameters": {
            "model": "gpt-4"
        }
    }
})


policy_checker = await agent.add_agent({
    "name": "Policy Checker",
    "input": {
        "user_id": "user-123",
        "request_type": "password-reset",
    },
    "instructions": "You are responsible for verifying customer requests against company policies.",
    "metadata": {
        "modelParameters": {
            "model": "gpt-4",
        },
    },
})    
`,
    },
    details:
      "Multi-agent metadata creates clear hierarchies and workflow relationships. Use parentAgentId to show delegation, workflowId to group related agents, and stage to track workflow progress.",
  },
  {
    id: "technical",
    name: "LLM Model Parameters",
    description:
      "Track model parameters and technical settings for optimization.",
    examples: {
      vercel: `experimental_telemetry: {
  isEnabled: true,
  metadata: {
    agentId: "weather-assistant",
    instructions: "You are a helpful weather assistant",
    userId: "demo-user",
    conversationId: "weather-chat",
    tags: ["weather", "demo", "production"]
  }
}`,
      typescript: `const agent = await trace.addAgent({
  name: "Support Agent",
  metadata: {
    modelParameters: {
      model: "gpt-4",
      temperature: 0.7,
      maxTokens: 1000
    },
    role: "customer-support",
    department: "customer-success"
  }
});`,
      python: `metadata = {
    "modelParameters": {
        "model": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 1000
    },
    "user_session": "session_abc123",
    "priority": "high",
    "department": "customer-success"
}`,
    },
    details:
      "Technical metadata helps optimize model performance, track different configurations, and correlate AI behavior with specific parameter settings. Essential for prompt engineering and model tuning.",
  },
];

const MetadataUsageExplorer = () => {
  const [selectedUsageId, setSelectedUsageId] = useState<string | null>(
    "basic",
  );
  const [selectedSDK, setSelectedSDK] = useState<string>("typescript");

  const selectedUsage = metadataUsageData.find(
    (usage) => usage.id === selectedUsageId,
  );

  const sdkOptions = [
    { id: "typescript", name: "JS/TS SDK" },
    { id: "vercel", name: "Vercel AI SDK" },
    { id: "python", name: "Python SDK" },
  ];

  return (
    <div className="my-5 rounded-lg border-2 border-emerald-500 bg-gray-800 p-5 text-gray-100 shadow-lg">
      <h3 className="mb-5 mt-0 border-b-2 border-emerald-600 pb-2.5 text-xl text-gray-300">
        Metadata Usage Patterns
      </h3>
      <div className="mb-5 flex flex-wrap gap-2.5">
        {metadataUsageData.map((usage) => (
          <div
            key={usage.id}
            className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ease-in-out ${
              selectedUsageId === usage.id
                ? "bg-emerald-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
            }`}
            onClick={() => setSelectedUsageId(usage.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedUsageId(usage.id);
              }
            }}
            role="button"
            tabIndex={0}
          >
            {usage.name}
          </div>
        ))}
      </div>

      {selectedUsage && (
        <div className="mt-5 rounded-md border border-gray-600 bg-gray-700 p-4 text-gray-200">
          <h4 className="mb-2 mt-0 text-lg text-emerald-300">
            {selectedUsage.name}
          </h4>
          <p className="leading-relaxed text-gray-200 mb-4">
            {selectedUsage.description}
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
            <pre className="bg-gray-900 rounded-md p-3 text-sm text-green-300 overflow-x-auto border border-gray-600">
              <code>{selectedUsage.examples[selectedSDK]}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetadataUsageExplorer;
