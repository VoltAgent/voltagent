import React, { useState } from "react";

const tagExamples = [
  {
    id: "basic",
    name: "Basic Categorization",
    description:
      "Simple tag usage for categorizing traces by function and priority.",
    examples: {
      typescript: `const trace = await sdk.trace({
  name: "Customer Support Query",
  agentId: "support-agent-v1",
  input: { query: "How to reset password?" },
  userId: "user-123",
  conversationId: "conv-456",
  tags: ["support", "password-reset", "high-priority"],
  metadata: {
    priority: "high",
    source: "web-chat"
  }
});`,
      python: `async with sdk.trace(
    agentId="support-agent-v1",
    input={"query": "How to reset password?"},
    userId="user-123",
    conversationId="conv-456",
    tags=["support", "password-reset", "high-priority"],
    metadata={
        "priority": "high",
        "source": "web-chat"
    }
) as trace:
    # Your support agent logic here
    pass`,
      vercel: `const result = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "How to reset password?",
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "support-agent-v1",
      userId: "user-123",
      conversationId: "conv-456",
      tags: ["support", "password-reset", "high-priority"]
    }
  }
});`,
    },
    details:
      "Start with basic functional tags to categorize your traces. Include priority levels and main feature areas for easy filtering and analysis.",
  },
  {
    id: "hierarchical",
    name: "Hierarchical Tags",
    description:
      "Organized tag structure using prefixes for better categorization.",
    examples: {
      typescript: `const trace = await sdk.trace({
  name: "Content Generation",
  agentId: "content-writer",
  input: { topic: "Product announcement" },
  userId: "marketing-team",
  tags: [
    "feature:content",
    "team:marketing", 
    "priority:medium",
    "status:in-progress"
  ],
  metadata: {
    department: "marketing",
    contentType: "blog-post"
  }
});`,
      python: `async with sdk.trace(
    agentId="content-writer",
    input={"topic": "Product announcement"},
    userId="marketing-team",
    tags=[
        "feature:content",
        "team:marketing",
        "priority:medium", 
        "status:in-progress"
    ],
    metadata={
        "department": "marketing",
        "contentType": "blog-post"
    }
) as trace:
    pass`,
      vercel: `const result = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "Write a product announcement",
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "content-writer",
      userId: "marketing-team",
      tags: [
        "feature:content",
        "team:marketing",
        "priority:medium",
        "status:in-progress"
      ]
    }
  }
});`,
    },
    details:
      "Use hierarchical tags with prefixes (feature:, team:, priority:) to create structured categorization that scales with your organization.",
  },
  {
    id: "environment",
    name: "Environment & Deployment",
    description:
      "Tag traces by environment, region, and deployment stage for better operations.",
    examples: {
      typescript: `const trace = await sdk.trace({
  name: "API Request Processing",
  agentId: "api-handler",
  input: { endpoint: "/api/users", method: "GET" },
  userId: "system",
  tags: [
    "production",
    "us-east-1",
    "api",
    "backend",
    "customer-facing"
  ],
  metadata: {
    region: "us-east-1",
    environment: "production",
    service: "user-api"
  }
});`,
      python: `async with sdk.trace(
    agentId="api-handler",
    input={"endpoint": "/api/users", "method": "GET"},
    userId="system",
    tags=[
        "production",
        "us-east-1", 
        "api",
        "backend",
        "customer-facing"
    ],
    metadata={
        "region": "us-east-1",
        "environment": "production",
        "service": "user-api"
    }
) as trace:
    pass`,
      vercel: `const result = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "Process user data request",
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "api-handler",
      userId: "system",
      tags: [
        "production",
        "us-east-1",
        "api", 
        "backend",
        "customer-facing"
      ]
    }
  }
});`,
    },
    details:
      "Environment tags help separate production from staging, track regional performance, and identify customer-facing vs internal operations.",
  },
  {
    id: "dynamic",
    name: "Dynamic Tagging",
    description:
      "Generate tags programmatically based on request context and user attributes.",
    examples: {
      typescript: `const generateTags = (user, request) => {
  const tags = ["support"];
  
  // Add user tier
  tags.push(\`tier:\${user.tier}\`);
  
  // Add priority based on tier
  if (user.tier === "premium") tags.push("high-priority");
  
  // Add category
  tags.push(\`category:\${request.category}\`);
  
  // Add urgency
  if (request.urgent) tags.push("urgent");
  
  return tags;
};

const trace = await sdk.trace({
  name: "Dynamic Support Request",
  agentId: "smart-support",
  tags: generateTags(user, request),
  userId: user.id,
  metadata: { 
    generatedAt: new Date().toISOString()
  }
});`,
      python: `def generate_tags(user, request):
    tags = ["support"]
    
    # Add user tier
    tags.append(f"tier:{user['tier']}")
    
    # Add priority based on tier
    if user["tier"] == "premium":
        tags.append("high-priority")
    
    # Add category
    tags.append(f"category:{request['category']}")
    
    # Add urgency
    if request.get("urgent"):
        tags.append("urgent")
    
    return tags

async with sdk.trace(
    agentId="smart-support",
    tags=generate_tags(user, request),
    userId=user["id"],
    metadata={
        "generatedAt": datetime.now().isoformat()
    }
) as trace:
    pass`,
      vercel: `const generateTags = (user, request) => {
  const tags = ["support"];
  
  tags.push(\`tier:\${user.tier}\`);
  if (user.tier === "premium") tags.push("high-priority");
  tags.push(\`category:\${request.category}\`);
  if (request.urgent) tags.push("urgent");
  
  return tags;
};

const result = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "Handle support request",
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "smart-support",
      userId: user.id,
      tags: generateTags(user, request)
    }
  }
});`,
    },
    details:
      "Dynamic tagging automatically creates relevant tags based on user attributes, request context, and business logic for consistent categorization.",
  },
];

const TagExplorer = () => {
  const [selectedExampleId, setSelectedExampleId] = useState<string>("basic");
  const [selectedSDK, setSelectedSDK] = useState<string>("typescript");

  const selectedExample = tagExamples.find(
    (example) => example.id === selectedExampleId,
  );

  const sdkOptions = [
    { id: "typescript", name: "JS/TS SDK" },
    { id: "python", name: "Python SDK" },
    { id: "vercel", name: "Vercel AI SDK" },
  ];

  return (
    <div className="my-5 rounded-lg border-2 border-emerald-500 bg-gray-800 p-5 text-gray-100 shadow-lg">
      <div className="mb-5 flex flex-wrap gap-2.5">
        {tagExamples.map((example) => (
          <div
            key={example.id}
            className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ease-in-out ${
              selectedExampleId === example.id
                ? "bg-emerald-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
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
        <div className="mt-5 rounded-md border border-gray-600 bg-gray-700 p-4 text-gray-200">
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
          <div className="mb-4">
            <h5 className="mb-2 text-base text-emerald-200">Example:</h5>
            <pre className="bg-gray-900 rounded-md p-3 text-sm text-green-300 overflow-x-auto border border-gray-600">
              <code>{selectedExample.examples[selectedSDK]}</code>
            </pre>
          </div>
          <p className="leading-relaxed text-gray-200">
            {selectedExample.details}
          </p>
        </div>
      )}
    </div>
  );
};

export default TagExplorer;
