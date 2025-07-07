import type React from "react";
import { TutorialLayout } from "../../components/tutorial/TutorialLayout";
import CodeBlock from "@theme/CodeBlock";
import { ColorModeProvider } from "@docusaurus/theme-common/internal";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function SubagentsTutorial() {
  return (
    <TutorialLayout
      currentStep={5}
      totalSteps={5}
      stepTitle="Subagents: Building Agent Teams"
      stepDescription="Create specialized agents that work together to solve complex problems"
      prevStepUrl="/tutorial/mcp"
    >
      <div className="space-y-8">
        {/* The Problem */}
        <div className="space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            The Problem: One Agent Can't Do Everything
          </h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            You've built an agent with tools and memory, but as requirements
            grow, you realize one agent trying to do everything becomes a
            nightmare to maintain.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="border-solid border-red-500 rounded-lg p-4 md:p-6 bg-gray-800/50">
              <h3 className="text-lg md:text-xl font-semibold text-red-500 mb-3 md:mb-4">
                Single Agent Problems
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-4 h-4 md:w-5 md:h-5 text-red-500 mt-1" />
                  <span className="text-sm md:text-base text-gray-300">
                    Conflicting instructions
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-4 h-4 md:w-5 md:h-5 text-red-500 mt-1" />
                  <span className="text-sm md:text-base text-gray-300">
                    Too many tools to manage
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-4 h-4 md:w-5 md:h-5 text-red-500 mt-1" />
                  <span className="text-sm md:text-base text-gray-300">
                    Mixed responsibilities
                  </span>
                </div>
              </div>
            </div>

            <div className="border-solid border-emerald-500 rounded-lg p-4 md:p-6 bg-gray-800/50">
              <h3 className="text-lg md:text-xl font-semibold text-emerald-500 mb-3 md:mb-4">
                Subagent Benefits
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-4 h-4 md:w-5 md:h-5 text-emerald-500 mt-1" />
                  <span className="text-sm md:text-base text-gray-300">
                    Specialized expertise
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-4 h-4 md:w-5 md:h-5 text-emerald-500 mt-1" />
                  <span className="text-sm md:text-base text-gray-300">
                    Clean separation of concerns
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-4 h-4 md:w-5 md:h-5 text-emerald-500 mt-1" />
                  <span className="text-sm md:text-base text-gray-300">
                    Easier to maintain and debug
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real World Example */}
        <div className="space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Real-World Example: Customer Support Team
          </h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            Let's build a customer support system with specialized agents
            working together.
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="src/index.ts">
              {`import { VoltAgent, Agent, createTool } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Technical Support Agent
const techSupportAgent = new Agent({
  name: "tech-support",
  instructions: \`You are a technical support specialist. You handle:
  - Bug reports and technical issues
  - System troubleshooting
  - Performance problems
  - Integration questions
  
  Be precise and ask for specific details like error messages, steps to reproduce, and system information.\`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [
    createTool({
      name: "check_system_status",
      description: "Check if our systems are operational",
      parameters: z.object({
        service: z.string().describe("Service name to check")
      }),
      execute: async ({ service }) => {
        // Mock system status check
        return { status: "operational", uptime: "99.9%" };
      },
    }),
    createTool({
      name: "create_bug_report",
      description: "Create a bug report in our system",
      parameters: z.object({
        title: z.string(),
        description: z.string(),
        severity: z.enum(["low", "medium", "high", "critical"])
      }),
      execute: async ({ title, description, severity }) => {
        console.log("Creating bug report:", { title, description, severity });
        return { ticketId: "BUG-" + Date.now(), status: "created" };
      },
    })
  ]
});

// Billing Support Agent
const billingSupportAgent = new Agent({
  name: "billing-support",
  instructions: \`You are a billing support specialist. You handle:
  - Payment issues
  - Subscription questions
  - Invoice inquiries
  - Refund requests
  
  Be empathetic and always verify customer identity before discussing account details.\`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [
    createTool({
      name: "lookup_subscription",
      description: "Look up customer subscription details",
      parameters: z.object({
        email: z.string().describe("Customer email address")
      }),
      execute: async ({ email }) => {
        // Mock subscription lookup
        return { 
          plan: "Pro", 
          status: "active",
          nextBilling: "2024-02-01",
          amount: "$49/month"
        };
      },
    }),
    createTool({
      name: "process_refund",
      description: "Process a refund for a customer",
      parameters: z.object({
        email: z.string(),
        amount: z.number(),
        reason: z.string()
      }),
      execute: async ({ email, amount, reason }) => {
        console.log("Processing refund:", { email, amount, reason });
        return { refundId: "REF-" + Date.now(), status: "processed" };
      },
    })
  ]
});

// Supervisor Agent - Coordinates the team
const supervisorAgent = new Agent({
  name: "supervisor",
  instructions: \`You are a customer support supervisor. Your job is to:
  1. Understand what the customer needs
  2. Route them to the right specialist (tech-support or billing-support)
  3. Coordinate between agents if needed
  4. Ensure the customer gets complete help
  
  Always start by understanding the customer's issue, then delegate to the appropriate specialist.\`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [techSupportAgent, billingSupportAgent],
});

new VoltAgent({
  agents: {
    supervisor: supervisorAgent,
    "tech-support": techSupportAgent,
    "billing-support": billingSupportAgent,
  },
});`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* How It Works */}
        <div className="space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            How Subagents Work
          </h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            The supervisor agent automatically knows how to use subagents based
            on the conversation context. Here's what happens:
          </p>

          <div className="bg-gray-800/50 rounded-lg p-4 md:p-6 border-solid border border-gray-700">
            <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
              Conversation Flow
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs md:text-sm font-bold">
                  1
                </div>
                <div>
                  <strong className="text-white text-sm md:text-base">
                    Customer:
                  </strong>
                  <span className="text-gray-300 ml-2 text-sm md:text-base">
                    "I'm having trouble with my API calls failing"
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs md:text-sm font-bold">
                  2
                </div>
                <div>
                  <strong className="text-white text-sm md:text-base">
                    Supervisor:
                  </strong>
                  <span className="text-gray-300 ml-2 text-sm md:text-base">
                    Routes to tech-support agent automatically
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs md:text-sm font-bold">
                  3
                </div>
                <div>
                  <strong className="text-white text-sm md:text-base">
                    Tech Support:
                  </strong>
                  <span className="text-gray-300 ml-2 text-sm md:text-base">
                    Uses check_system_status tool and provides technical help
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs md:text-sm font-bold">
                  4
                </div>
                <div>
                  <strong className="text-white text-sm md:text-base">
                    Customer:
                  </strong>
                  <span className="text-gray-300 ml-2 text-sm md:text-base">
                    "Thanks! Also, I need to cancel my subscription"
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-xs md:text-sm font-bold">
                  5
                </div>
                <div>
                  <strong className="text-white text-sm md:text-base">
                    Supervisor:
                  </strong>
                  <span className="text-gray-300 ml-2 text-sm md:text-base">
                    Now routes to billing-support agent for the subscription
                    issue
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Example */}
        <div className="space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Advanced Example: Content Creation Team
          </h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            Let's build a more sophisticated example - a content creation team
            with multiple specialized agents.
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="src/content-team.ts">
              {`import { VoltAgent, Agent, createTool } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Research Agent
const researchAgent = new Agent({
  name: "researcher",
  instructions: \`You are a research specialist. You:
  - Gather information on topics
  - Fact-check claims
  - Find relevant sources and statistics
  - Identify key trends and insights
  
  Always provide credible sources and be thorough in your research.\`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4"),
  tools: [
    createTool({
      name: "search_web",
      description: "Search for information on the web",
      parameters: z.object({
        query: z.string().describe("Search query")
      }),
      execute: async ({ query }) => {
        // Mock web search
        return {
          results: [
            { title: "Relevant article about " + query, url: "https://example.com" }
          ]
        };
      },
    })
  ]
});

// Writer Agent
const writerAgent = new Agent({
  name: "writer",
  instructions: \`You are a skilled content writer. You:
  - Create engaging, well-structured content
  - Adapt tone and style to the target audience
  - Write clear, compelling copy
  - Follow content guidelines and best practices
  
  Use research provided by the research agent to create accurate, informative content.\`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4"),
  tools: [
    createTool({
      name: "save_draft",
      description: "Save a content draft",
      parameters: z.object({
        title: z.string(),
        content: z.string(),
        type: z.enum(["blog", "email", "social", "documentation"])
      }),
      execute: async ({ title, content, type }) => {
        console.log("Saving draft:", { title, type });
        return { draftId: "DRAFT-" + Date.now(), status: "saved" };
      },
    })
  ]
});

// Editor Agent
const editorAgent = new Agent({
  name: "editor",
  instructions: \`You are a content editor. You:
  - Review and improve content quality
  - Check for grammar, clarity, and consistency
  - Ensure content meets brand guidelines
  - Provide constructive feedback
  
  Be thorough but constructive in your feedback.\`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4"),
  tools: [
    createTool({
      name: "publish_content",
      description: "Publish approved content",
      parameters: z.object({
        draftId: z.string(),
        platform: z.enum(["blog", "website", "social", "email"])
      }),
      execute: async ({ draftId, platform }) => {
        console.log("Publishing content:", { draftId, platform });
        return { publishId: "PUB-" + Date.now(), status: "published" };
      },
    })
  ]
});

// Content Manager - Coordinates the team
const contentManager = new Agent({
  name: "content-manager",
  instructions: \`You are a content manager coordinating a team of specialists:
  - Researcher: Gathers information and sources
  - Writer: Creates the actual content
  - Editor: Reviews and polishes content
  
  Your job is to:
  1. Understand content requirements
  2. Coordinate the team to create high-quality content
  3. Ensure proper workflow (research → write → edit → publish)
  4. Make sure all requirements are met
  
  Always start with research, then writing, then editing before publishing.\`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4"),
  subAgents: [researchAgent, writerAgent, editorAgent],
});

new VoltAgent({
  agents: {
    "content-manager": contentManager,
    researcher: researchAgent,
    writer: writerAgent,
    editor: editorAgent,
  },
});`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* Best Practices */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Best Practices for Subagents
          </h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            Here are the key principles for designing effective agent teams:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-solid border-emerald-500 rounded-lg p-6 bg-gray-800/50">
              <h3 className="text-xl font-semibold text-emerald-500 mb-4">
                Do This
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Single Responsibility:</strong> Each agent should
                    have one clear job
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Clear Instructions:</strong> Define exactly what
                    each agent does
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Proper Tools:</strong> Give agents only the tools
                    they need
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Logical Hierarchy:</strong> Supervisor coordinates,
                    specialists execute
                  </span>
                </div>
              </div>
            </div>

            <div className="border-solid border-red-500 rounded-lg p-4 md:p-6 bg-gray-800/50">
              <h3 className="text-lg md:text-xl font-semibold text-red-500 mb-3 md:mb-4">
                Avoid This
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Overlapping Roles:</strong> Agents with similar or
                    conflicting jobs
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Too Many Layers:</strong> Agents managing other
                    agents managing agents
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Circular Dependencies:</strong> Agents that depend
                    on each other
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Generic Agents:</strong> Agents that try to do
                    everything
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testing Your Team */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Testing Your Agent Team
          </h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            Once you've built your agent team, test it with realistic scenarios
            to make sure the coordination works smoothly.
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="test-scenarios.ts">
              {`// Test the customer support team
const testCustomerSupport = async () => {
  console.log("Testing customer support team...");
  
  // Scenario 1: Technical issue
  const techIssue = await supervisorAgent.generateText(
    "Hi, I'm getting 500 errors when calling your API. Can you help?",
    { userId: "customer123" }
  );
  
  // Scenario 2: Billing question
  const billingQuestion = await supervisorAgent.generateText(
    "I need to upgrade my plan and get an invoice for last month",
    { userId: "customer123" }
  );
  
  // Scenario 3: Mixed issues
  const mixedIssue = await supervisorAgent.generateText(
    "I'm having API issues AND I need to cancel my subscription",
    { userId: "customer123" }
  );
  
  console.log("All scenarios handled successfully!");
};

// Test the content creation team
const testContentTeam = async () => {
  console.log("Testing content creation team...");
  
  const contentRequest = await contentManager.generateText(
    "I need a blog post about 'The Future of AI in Healthcare' - 1000 words, professional tone, for our company blog",
    { userId: "marketing123" }
  );
  
  console.log("Content creation workflow completed!");
};

// Run tests
testCustomerSupport();
testContentTeam();`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* What's Next */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">What's Next?</h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            Congratulations! You've built a complete AI agent system with:
          </p>

          <div className="bg-gray-800/50 rounded-lg p-6 border-solid border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">
              Your Agent Journey
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                <span className="text-gray-300">
                  <strong>Step 1:</strong> Built your first agent
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                <span className="text-gray-300">
                  <strong>Step 2:</strong> Added tools to make it useful
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                <span className="text-gray-300">
                  <strong>Step 3:</strong> Implemented memory for conversations
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                <span className="text-gray-300">
                  <strong>Step 4:</strong> Connected to external systems with
                  MCP
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                <span className="text-gray-300">
                  <strong>Step 5:</strong> Created specialized agent teams
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-500/10 border-solid border border-blue-500/20 rounded-lg p-6">
            <h4 className="text-blue-400 font-semibold mb-2">
              Ready to Build Something Amazing?
            </h4>
            <p className="text-gray-300 mb-4">
              You now have all the tools to build production-ready AI agents.
              Whether you're creating a customer support system, content
              creation team, or something completely new, you're ready to go.
            </p>
            <div className="flex space-x-4">
              <a
                href="/docs"
                className="inline-flex items-center px-4 py-2 bg-blue-500 no-underline text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Read Full Documentation
              </a>
              <a
                href="https://github.com/voltagent/voltagent"
                className="inline-flex items-center px-4 py-2 border no-underline border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </TutorialLayout>
  );
}
