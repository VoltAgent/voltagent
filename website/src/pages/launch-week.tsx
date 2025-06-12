import React from "react";
import Layout from "@theme/Layout";
import CodeBlock from "@theme/CodeBlock";
import { DotPattern } from "../components/ui/dot-pattern";
import { BoltIcon } from "@heroicons/react/24/solid";

const LaunchWeek = () => {
  const launchItems = [
    {
      day: 1,
      title: "Framework Agnostic Observability",
      description:
        "Universal tracing and monitoring that works with any framework - React, Vue, Angular, or vanilla JavaScript. No more vendor lock-in.",
      type: "image",
      content: "/img/framework-agnostic.png", // placeholder image path
      date: "Monday, June 16, 2025",
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
    },
    {
      day: 3,
      title: "Volt Agent UI",
      description:
        "Beautiful, responsive UI components that integrate seamlessly with Vercel AI SDK. Build conversational interfaces in minutes.",
      type: "image",
      content: "/img/volt-agent-ui.png", // placeholder image path
      date: "Wednesday, June 18, 2025",
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
    },
    {
      day: 5,
      title: "MCP & Showcase",
      description:
        "Model Context Protocol integration and a comprehensive showcase of real-world implementations and use cases.",
      type: "image",
      content: "/img/mcp-showcase.png", // placeholder image path
      date: "Friday, June 20, 2025",
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
        <div className="container mx-auto px-6 py-20">
          <div className="text-center mb-24">
            <div className="flex items-center justify-center">
              <div className="flex items-center border-solid border-4 mb-5 border-main-emerald rounded-full  p-2">
                <BoltIcon className="w-10 h-10  text-main-emerald" />
              </div>
            </div>
            <div className="text-5xl mb-3 font-bold  text-emerald-400 ">
              Launch Week #1
            </div>
            <div className=" text-emerald-400 font-semibold text-lg mb-3">
              June 16-20, 2025
            </div>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              5 days of features to transform how you build and monitor AI
              agents.
            </p>
          </div>

          {/* Feature Items */}
          <div className="max-w-6xl mx-auto relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-emerald-500/30 hidden lg:block" />

            {launchItems.map((item) => (
              <div key={item.day} className="mb-32 last:mb-0 relative">
                {/* Timeline Dot */}
                <div className="absolute left-4 w-4 h-4 bg-emerald-500 rounded-full border-4 border-black z-10 hidden lg:block" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center lg:ml-16">
                  {/* Text Content - Always on Left */}
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="text-emerald-500 text-sm font-mono uppercase tracking-wider">
                        DAY {item.day} | {item.date.toUpperCase()}
                      </div>

                      <h2 className="text-4xl font-bold text-white leading-tight">
                        {item.title}
                      </h2>
                    </div>

                    <p className="text-lg text-gray-400 leading-relaxed max-w-lg">
                      {item.description}
                    </p>

                    <div className="pt-4">
                      <button
                        type="button"
                        className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        Read Docs
                      </button>
                    </div>
                  </div>

                  {/* Visual Content - Always on Right */}
                  <div className="flex justify-center">
                    {item.type === "image" ? (
                      <div className="w-80 h-80 bg-gray-900 rounded-3xl border border-gray-800 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-emerald-400/20" />
                        <div className="text-center z-10">
                          <div className="text-4xl mb-4">
                            {item.day === 1 && "🔍"}
                            {item.day === 3 && "🎨"}
                            {item.day === 5 && "🚀"}
                          </div>
                          <div className="text-gray-400 text-sm">
                            Feature Preview
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full max-w-md">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                          <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-500 rounded-full" />
                              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                              <div className="w-3 h-3 bg-green-500 rounded-full" />
                              <span className="ml-3 text-gray-400 text-sm font-mono">
                                {item.day === 2 ? "validation.ts" : "routes.ts"}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm">
                            <CodeBlock
                              language="typescript"
                              showLineNumbers={false}
                            >
                              {item.content}
                            </CodeBlock>
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
          <div className="text-center mt-32 p-12 bg-gray-900 border border-gray-800 rounded-3xl">
            <h3 className="text-3xl font-bold text-white mb-6">
              Ready to Get Started?
            </h3>
            <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
              Join thousands of developers building the future of AI agents
            </p>
            <div className="flex gap-6 justify-center flex-wrap">
              <button
                type="button"
                className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 px-8 py-4 rounded-xl font-semibold transition-colors"
              >
                Get Started Free
              </button>
              <button
                type="button"
                className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 px-8 py-4 rounded-xl font-semibold transition-colors"
              >
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LaunchWeek;
