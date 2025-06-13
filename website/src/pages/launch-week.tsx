import React from "react";
import Layout from "@theme/Layout";
import CodeBlock from "@theme/CodeBlock";
import { DotPattern } from "../components/ui/dot-pattern";
import { BoltIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

// Day component props type
const Day1 = () => (
  <div className="mb-16 sm:mb-24 lg:mb-32 last:mb-0 relative">
    <div className="absolute left-4 w-4 h-4 bg-emerald-500 rounded-full border-4 border-black z-10 hidden lg:block" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center lg:ml-16 transition-all duration-500">
      <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
        <div className="space-y-3 sm:space-y-4">
          <div className="text-emerald-500 text-xs sm:text-sm font-mono uppercase tracking-wider">
            DAY 1 | MONDAY, JUNE 16, 2025
          </div>
          <div className="flex items-baseline justify-start">
            <div className="flex mr-2 items-center border-2 border-solid border-[#00d992] rounded-full p-1">
              <BoltIcon className="w-3 h-3 landing-xs:w-3 landing-xs:h-3 landing-sm:w-4 landing-sm:h-4 landing-md:w-5 landing-md:h-5 landing-lg:w-6 landing-lg:h-6 text-[#00d992]" />
            </div>
            <span className="text-xl landing-xs:text-lg landing-sm:text-2xl landing-md:text-3xl landing-lg:text-4xl font-bold">
              <span className="text-[#00d992]">volt</span>
              <span className="text-gray-500">ops</span>
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            Framework Agnostic LLM Observability
          </h2>
        </div>
        <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-lg">
          Universal tracing and monitoring that works with various AI Agent
          frameworks, or vanilla JS/Python.
        </p>
        <div className="pt-2 sm:pt-4 text-left">
          <a
            href="https://voltagent.dev/voltops-llm-observability/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-400/10 text-emerald-400 no-underline border border-emerald-400/50 hover:bg-emerald-400/20 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base cursor-pointer inline-flex items-center"
          >
            Details
            <ChevronRightIcon className="w-4 h-4 ml-2" />
          </a>
        </div>
      </div>
      <div className="flex justify-center px-4 sm:px-0">
        <div className="rounded-md border-solid p-1 border-2 border-emerald-600 flex items-center justify-center relative overflow-hidden">
          <img
            src="https://cdn.voltagent.dev/docs/voltop-docs/dashboard/dashboard.png"
            alt="Feature Preview"
            className="object-cover w-full h-full rounded-md border border-gray-800"
          />
        </div>
      </div>
    </div>
  </div>
);

const Day2 = () => (
  <div className="mb-16 sm:mb-24 lg:mb-32 last:mb-0 relative">
    <div className="absolute left-4 w-4 h-4 bg-emerald-500 rounded-full border-4 border-black z-10 hidden lg:block" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center lg:ml-16 transition-all duration-500">
      <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
        <div className="space-y-3 sm:space-y-4">
          <div className="text-emerald-500 text-xs sm:text-sm font-mono uppercase tracking-wider">
            DAY 2 | TUESDAY, JUNE 17, 2025
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            No More Hallucination in Subagents
          </h2>
        </div>
        <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-lg">
          Advanced context management ensures your AI agents stay on track and
          provide accurate responses.
        </p>
        <div className="pt-2 sm:pt-4">
          <button
            type="button"
            className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/50 hover:bg-emerald-400/20 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base cursor-pointer"
          >
            Read Docs
          </button>
        </div>
      </div>
      <div className="flex justify-center px-4 sm:px-0">
        <div className="w-full">
          <div className="bg-gray-900 border border-gray-800 rounded-xl sm:rounded-2xl overflow-hidden">
            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full" />
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full" />
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full" />
                <span className="ml-2 sm:ml-3 text-gray-400 text-xs sm:text-sm font-mono">
                  validation.ts
                </span>
              </div>
            </div>
            <div className="text-xs sm:text-sm">
              <CodeBlock language="typescript" showLineNumbers={false}>
                {`// Enhanced agent validation
const agent = await trace.addAgent({
  name: "Support Agent",
  instructions: "You are a customer support agent...",
  validation: {
    requireSources: true,
    factCheck: true,
    confidenceThreshold: 0.8
  },

`}
              </CodeBlock>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Day3 = () => (
  <div className="mb-16 sm:mb-24 lg:mb-32 last:mb-0 relative">
    <div className="absolute left-4 w-4 h-4 bg-emerald-500 rounded-full border-4 border-black z-10 hidden lg:block" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center lg:ml-16 transition-all duration-500">
      <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
        <div className="space-y-3 sm:space-y-4">
          <div className="text-emerald-500 text-xs sm:text-sm font-mono uppercase tracking-wider">
            DAY 3 | WEDNESDAY, JUNE 18, 2025
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            Volt Agent UI
          </h2>
        </div>
        <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-lg">
          Beautiful, responsive UI components that integrate seamlessly with
          Vercel AI SDK. Build conversational interfaces in minutes.
        </p>
        <div className="pt-2 sm:pt-4">
          <button
            type="button"
            className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/50 hover:bg-emerald-400/20 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base cursor-pointer"
          >
            Read Docs
          </button>
        </div>
      </div>
      <div className="flex justify-center px-4 sm:px-0">
        <div className="w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-800 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-emerald-400/20" />
          <div className="text-center z-10">
            <div className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4">
              🎨
            </div>
            <div className="text-gray-400 text-xs sm:text-sm">
              Feature Preview
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Day4 = () => (
  <div className="mb-16 sm:mb-24 lg:mb-32 last:mb-0 relative">
    <div className="absolute left-4 w-4 h-4 bg-emerald-500 rounded-full border-4 border-black z-10 hidden lg:block" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center lg:ml-16 transition-all duration-500">
      <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
        <div className="space-y-3 sm:space-y-4">
          <div className="text-emerald-500 text-xs sm:text-sm font-mono uppercase tracking-wider">
            DAY 4 | THURSDAY, JUNE 19, 2025
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            Custom API Routes
          </h2>
        </div>
        <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-lg">
          Create custom endpoints for your agents with built-in authentication,
          rate limiting, and monitoring.
        </p>
        <div className="pt-2 sm:pt-4">
          <button
            type="button"
            className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/50 hover:bg-emerald-400/20 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base cursor-pointer"
          >
            Read Docs
          </button>
        </div>
      </div>
      <div className="flex justify-center px-4 sm:px-0">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="bg-gray-900 border border-gray-800 rounded-xl sm:rounded-2xl overflow-hidden">
            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full" />
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full" />
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full" />
                <span className="ml-2 sm:ml-3 text-gray-400 text-xs sm:text-sm font-mono">
                  routes.ts
                </span>
              </div>
            </div>
            <div className="text-xs sm:text-sm">
              <CodeBlock language="typescript" showLineNumbers={false}>
                {`// app/api/agents/[agentId]/route.ts
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
}`}
              </CodeBlock>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Day5 = () => (
  <div className="mb-16 sm:mb-24 lg:mb-32 last:mb-0 relative">
    <div className="absolute left-4 w-4 h-4 bg-emerald-500 rounded-full border-4 border-black z-10 hidden lg:block" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center lg:ml-16 transition-all duration-500">
      <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
        <div className="space-y-3 sm:space-y-4">
          <div className="text-emerald-500 text-xs sm:text-sm font-mono uppercase tracking-wider">
            DAY 5 | FRIDAY, JUNE 20, 2025
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            MCP & Showcase
          </h2>
        </div>
        <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-lg">
          Model Context Protocol integration and a comprehensive showcase of
          real-world implementations and use cases.
        </p>
        <div className="pt-2 sm:pt-4">
          <button
            type="button"
            className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/50 hover:bg-emerald-400/20 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base cursor-pointer"
          >
            Read Docs
          </button>
        </div>
      </div>
      <div className="flex justify-center px-4 sm:px-0">
        <div className="w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-800 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-emerald-400/20" />
          <div className="text-center z-10">
            <div className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4">
              🚀
            </div>
            <div className="text-gray-400 text-xs sm:text-sm">
              Feature Preview
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const LaunchWeek = () => {
  return (
    <Layout
      title="Launch Week"
      description="5 days of exciting new features and improvements to VoltAgent"
    >
      <div className="min-h-screen flex flex-col justify-center items-center">
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
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto px-4">
              5 days of features to transform how you build and monitor AI
              agents.
            </p>
          </div>
          {/* Feature Items */}
          <div className="max-w-6xl mx-auto relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-emerald-500/30 hidden lg:block" />
            <Day1 />
            <Day2 />
            <Day3 />
            <Day4 />
            <Day5 />
            {/* Footer CTA */}
          </div>
        </div>
        <div className="text-center mx-auto my-12 sm:my-20  w-full max-w-xs sm:max-w-lg lg:max-w-2xl p-4 sm:p-8 lg:p-10 border-solid border-2 border-emerald-400/50 rounded-xl sm:rounded-2xl lg:rounded-3xl relative overflow-hidden backdrop-blur-sm">
          <div className="relative z-10">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-400 mb-3 sm:mb-4 lg:mb-6">
              Ready to Get Started?
            </h3>
            <p className="text-sm sm:text-base lg:text-lg text-gray-300 mb-5 sm:mb-6 lg:mb-8 max-w-xl mx-auto px-2 sm:px-4">
              Join developers building the future of AI agents
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-5 justify-center items-center w-full">
              <button
                type="button"
                className="w-full sm:w-auto bg-emerald-400/10 text-emerald-400 border border-emerald-400/50 hover:bg-emerald-400/20 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-300 text-sm"
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
