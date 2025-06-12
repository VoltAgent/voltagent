import React from "react";
import Layout from "@theme/Layout";
import CodeBlock from "@theme/CodeBlock";
import { DotPattern } from "../components/ui/dot-pattern";
import { BoltIcon } from "@heroicons/react/24/solid";

const LaunchWeek = () => {
  const launchItems = [
    {
      day: 1,
      title: "Framework Agnostic LLM Observability",
      description:
        "Universal tracing and monitoring that works with any AI Agent framework, or vanilla JS/Python.",
      type: "image",
      content: "/img/framework-agnostic.png", // placeholder image path
      date: "Monday, June 16, 2025",
      revealed: true, // Only Day 1 is revealed initially
    },
    {
      day: 2,
      title: "No More Hallucination in Subagents",
      description:
        "Advanced validation and context management ensures your AI agents stay on track and provide accurate responses.",
      type: "code",
      content: `// Enhanced agent validation
const agent = await trace.addAgent({
  name: "Support Agent",
  instructions: "You are a customer support agent...",
  validation: {
    requireSources: true,
    factCheck: true,
    confidenceThreshold: 0.8
  },
  metadata: {
    modelParameters: {
      model: "gpt-4",
      temperature: 0.1 // Lower temperature for accuracy
    }
  }
});

// Automatic hallucination detection
const response = await agent.generate({
  input: "What's our refund policy?",
  validateAgainst: ["knowledge_base", "policy_docs"],
  onHallucination: "flag_for_review"
});`,
      date: "Tuesday, June 17, 2025",
      revealed: false,
    },
    {
      day: 3,
      title: "Volt Agent UI",
      description:
        "Beautiful, responsive UI components that integrate seamlessly with Vercel AI SDK. Build conversational interfaces in minutes.",
      type: "image",
      content: "/img/volt-agent-ui.png", // placeholder image path
      date: "Wednesday, June 18, 2025",
      revealed: false,
    },
    {
      day: 4,
      title: "Custom API Routes",
      description:
        "Create custom endpoints for your agents with built-in authentication, rate limiting, and monitoring.",
      type: "code",
      content: `// app/api/agents/[agentId]/route.ts
import { VoltAgent } from '@voltagent/sdk';
import { auth } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const user = await auth(request);
  
  const agent = new VoltAgent({
    agentId: params.agentId,
    userId: user.id,
    rateLimit: {
      requests: 100,
      window: '1h'
    },
    monitoring: {
      traces: true,
      metrics: true,
      alerts: true
    }
  });

  const { message } = await request.json();
  
  const response = await agent.chat({
    message,
    context: {
      userTier: user.tier,
      sessionId: request.headers.get('session-id')
    }
  });

  return Response.json(response);
}`,
      date: "Thursday, June 19, 2025",
      revealed: false,
    },
    {
      day: 5,
      title: "MCP & Showcase",
      description:
        "Model Context Protocol integration and a comprehensive showcase of real-world implementations and use cases.",
      type: "image",
      content: "/img/mcp-showcase.png", // placeholder image path
      date: "Friday, June 20, 2025",
      revealed: false,
    },
  ];

  return (
    <Layout
      title="Launch Week"
      description="5 days of exciting new features and improvements to VoltAgent"
    >
      <div className="min-h-screen ">
        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />
        {/* Header */}
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="text-center mb-16 sm:mb-24">
            <div className="flex items-center justify-center">
              <div className="flex items-center border-solid border-4 mb-5 border-main-emerald rounded-full p-2">
                <BoltIcon className="w-8 h-8 sm:w-10 sm:h-10 text-main-emerald" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl lg:text-5xl mb-3 font-bold text-emerald-400">
              Launch Week #1
            </div>
            <div className="text-emerald-400 font-semibold text-base sm:text-lg mb-3">
              June 16-20, 2025
            </div>

            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto px-4">
              5 days of features to transform how you build and monitor AI
              agents.
            </p>
          </div>

          {/* Feature Items */}
          <div className="max-w-6xl mx-auto relative">
            {/* Timeline Line - Hidden on mobile */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-emerald-500/30 hidden lg:block" />

            {launchItems.map((item) => (
              <div
                key={item.day}
                className="mb-16 sm:mb-24 lg:mb-32 last:mb-0 relative"
              >
                {/* Timeline Dot - Hidden on mobile */}
                <div
                  className={`absolute left-4 w-4 h-4 ${
                    item.revealed ? "bg-emerald-500" : "bg-gray-600"
                  } rounded-full border-4 border-black z-10 hidden lg:block`}
                />

                <div
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center lg:ml-16 transition-all duration-500 ${
                    !item.revealed ? "opacity-50 blur-sm" : ""
                  }`}
                >
                  {/* Text Content - Always on Left */}
                  <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="text-emerald-500 text-xs sm:text-sm font-mono uppercase tracking-wider">
                        DAY {item.day} | {item.date.toUpperCase()}
                      </div>

                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
                        {item.revealed ? item.title : "Stay Tuned..."}
                      </h2>
                    </div>

                    <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-lg">
                      {item.revealed
                        ? item.description
                        : "Something exciting is coming. Stay tuned for the announcement!"}
                    </p>

                    <div className="pt-2 sm:pt-4">
                      <button
                        type="button"
                        className={`${
                          item.revealed
                            ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20"
                            : "bg-gray-700/50 text-gray-500 border border-gray-600/20 cursor-not-allowed"
                        } px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base`}
                        disabled={!item.revealed}
                      >
                        {item.revealed ? "Read Docs" : "Stay Tuned"}
                      </button>
                    </div>
                  </div>

                  {/* Visual Content - Always on Right */}
                  <div className="flex justify-center px-4 sm:px-0">
                    {item.revealed ? (
                      item.type === "image" ? (
                        <div className="w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-800 flex items-center justify-center relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-emerald-400/20" />
                          <div className="text-center z-10">
                            <div className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4">
                              {item.day === 1 && "🔍"}
                              {item.day === 3 && "🎨"}
                              {item.day === 5 && "🚀"}
                            </div>
                            <div className="text-gray-400 text-xs sm:text-sm">
                              Feature Preview
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full max-w-sm sm:max-w-md">
                          <div className="bg-gray-900 border border-gray-800 rounded-xl sm:rounded-2xl overflow-hidden">
                            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border-b border-gray-700">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full" />
                                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full" />
                                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full" />
                                <span className="ml-2 sm:ml-3 text-gray-400 text-xs sm:text-sm font-mono">
                                  {item.day === 2
                                    ? "validation.ts"
                                    : "routes.ts"}
                                </span>
                              </div>
                            </div>
                            <div className="text-xs sm:text-sm">
                              <CodeBlock
                                language="typescript"
                                showLineNumbers={false}
                              >
                                {item.content}
                              </CodeBlock>
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      // Coming Soon placeholder
                      <div className="w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-700 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-600/10 to-gray-500/10" />
                        <div className="text-center z-10">
                          <div className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4">
                            🤫
                          </div>
                          <div className="text-gray-500 text-xs sm:text-sm">
                            Stay Tuned
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="text-center mt-16 sm:mt-24 lg:mt-32 p-6 sm:p-8 lg:p-12 bg-gray-900/80 border-2 border-emerald-400/50 rounded-2xl sm:rounded-3xl relative overflow-hidden backdrop-blur-sm mx-4 sm:mx-0">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10" />
            <div className="relative z-10">
              <h3 className="text-2xl sm:text-3xl font-bold text-emerald-400 mb-4 sm:mb-6">
                Ready to Get Started?
              </h3>
              <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
                Join developers building the future of AI agents
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
                <button
                  type="button"
                  className="w-full sm:w-auto bg-emerald-500 text-white hover:bg-emerald-600 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg text-sm"
                >
                  Get Started
                </button>
                <button
                  type="button"
                  className="w-full sm:w-auto bg-emerald-400/10 text-emerald-400 border border-emerald-400/50 hover:bg-emerald-400/20 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-300 text-sm"
                >
                  View Documentation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LaunchWeek;
