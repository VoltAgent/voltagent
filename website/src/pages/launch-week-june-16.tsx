import React from "react";
import Layout from "@theme/Layout";
import CodeBlock from "@theme/CodeBlock";
import { DotPattern } from "../components/ui/dot-pattern";
import { BoltIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

// Day component props type
interface DayProps {
  enabled: boolean;
  date: string;
  title: React.ReactNode;
  description: string;
  detailsLink?: string;
  children?: React.ReactNode;
}

const DayComponent: React.FC<DayProps> = ({
  enabled,
  date,
  title,
  description,
  detailsLink,
  children,
}) => (
  <div
    className={`mb-8 sm:mb-16 lg:mb-24 last:mb-0 relative ${
      !enabled ? "blur-sm pointer-events-none opacity-50" : ""
    }`}
  >
    <div className="absolute left-2 sm:left-4 w-3 h-3 sm:w-4 sm:h-4 bg-emerald-500 rounded-full border-2 sm:border-4 border-black z-10 hidden lg:block" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 lg:gap-20 items-center lg:ml-16 transition-all duration-500">
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-4 sm:px-6 lg:px-0">
        <div className="space-y-2 sm:space-y-3 lg:space-y-4">
          <div className="text-emerald-500 text-xs sm:text-sm font-mono uppercase tracking-wider">
            {date}
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white leading-tight">
            {enabled ? title : "Coming Soon"}
          </h2>
        </div>
        <p className="text-sm sm:text-base lg:text-lg text-gray-400 leading-relaxed max-w-lg">
          {enabled
            ? description
            : "Stay tuned for exciting new features and improvements."}
        </p>
        {enabled && detailsLink && (
          <div className="pt-2 sm:pt-4 text-left">
            <a
              href={detailsLink}
              target="_blank norefeeer"
              className="bg-emerald-400/10 text-emerald-400 no-underline border border-emerald-400/50 hover:bg-emerald-400/20 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-lg font-medium transition-colors text-xs sm:text-sm lg:text-base cursor-pointer inline-flex items-center"
            >
              Details
              <ChevronRightIcon className="w-3 h-3 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
            </a>
          </div>
        )}
      </div>
      <div className="flex justify-center px-4 sm:px-6 lg:px-0">
        {enabled ? (
          children
        ) : (
          <div className="w-full h-48 sm:h-60 lg:h-72 bg-gray-900 rounded-xl sm:rounded-2xl lg:rounded-3xl border border-gray-800 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-emerald-400/20" />
            <div className="text-center z-10">
              <div className="flex items-center justify-center">
                <div className="flex items-center border-solid border-2 sm:border-3 lg:border-4 mb-3 sm:mb-4 lg:mb-5 border-main-emerald rounded-full p-1.5 sm:p-2">
                  <BoltIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-main-emerald" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

const Day1 = () => (
  <DayComponent
    enabled={false}
    date="DAY 1 | MONDAY, JUNE 16, 2025"
    title={
      <>
        <div className="flex items-baseline justify-start mb-2">
          <div className="flex mr-2 items-center border-2 border-solid border-[#00d992] rounded-full p-1">
            <BoltIcon className="w-3 h-3 landing-xs:w-3 landing-xs:h-3 landing-sm:w-4 landing-sm:h-4 landing-md:w-5 landing-md:h-5 landing-lg:w-6 landing-lg:h-6 text-[#00d992]" />
          </div>
          <span className="text-xl landing-xs:text-lg landing-sm:text-2xl landing-md:text-3xl landing-lg:text-4xl font-bold">
            <span className="text-[#00d992]">volt</span>
            <span className="text-gray-500">ops</span>
          </span>
        </div>
        Framework Agnostic LLM Observability
      </>
    }
    description="Universal tracing and monitoring that works with various AI Agent frameworks, or vanilla JS/Python."
    detailsLink="https://voltagent.dev/voltops-llm-observability/"
  >
    <div className="rounded-md border-solid p-1 border-2 border-emerald-600 flex items-center justify-center relative overflow-hidden">
      <img
        src="https://cdn.voltagent.dev/docs/voltop-docs/dashboard/dashboard.png"
        alt="Feature Preview"
        className="object-cover w-full h-full rounded-md border border-gray-800"
      />
    </div>
  </DayComponent>
);

const Day2 = () => (
  <DayComponent
    enabled={false}
    date="DAY 2 | TUESDAY, JUNE 17, 2025"
    title="Enhanced Streaming with fullStream"
    description="For more detailed streaming information including tool calls, reasoning steps, and completion status, you can use the fullStream property available in the response."
    detailsLink="#"
  >
    <div className="w-full">
      <div className="bg-gray-900 border-solid border-gray-800 rounded-xl sm:rounded-md overflow-hidden flex flex-col h-full">
        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full" />
            <span className="ml-2 sm:ml-3 text-gray-400 text-xs sm:text-sm font-mono">
              streaming.ts
            </span>
          </div>
        </div>
        <div className="text-xs sm:text-sm flex-1 h-full">
          <CodeBlock
            language="typescript"
            showLineNumbers={false}
            className="!m-0 !p-0 h-full [&>pre]:!m-0 [&>pre]:!p-4 [&>pre]:h-full"
          >
            {`// Enhanced streaming with fullStream
const response = await agent.chat({
  messages: [{ role: "user", content: "Analyze this data" }],
  stream: true,
  fullStream: true, // Enable detailed streaming
});

for await (const chunk of response) {
  if (chunk.type === 'tool_call') {
    console.log('Tool being called:', chunk.tool);
  } else if (chunk.type === 'reasoning') {
    console.log('Agent reasoning:', chunk.thought);
  } else if (chunk.type === 'completion') {
    console.log('Progress:', chunk.progress);
  }
}`}
          </CodeBlock>
        </div>
      </div>
    </div>
  </DayComponent>
);

const Day3 = () => (
  <DayComponent
    enabled={false}
    date="DAY 3 | WEDNESDAY, JUNE 18, 2025"
    title="Agent UI"
    description="Beautiful UI components that integrate with Vercel AI SDK. Build conversational interfaces in minutes."
    detailsLink="#"
  >
    <div className="w-full">
      <div className="bg-gray-900 border-solid border-gray-800 rounded-xl sm:rounded-md overflow-hidden flex flex-col h-full">
        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full" />
            <span className="ml-2 sm:ml-3 text-gray-400 text-xs sm:text-sm font-mono">
              chat.tsx
            </span>
          </div>
        </div>
        <div className="text-xs sm:text-sm flex-1 h-full">
          <CodeBlock
            language="typescript"
            showLineNumbers={false}
            className="!m-0 !p-0 h-full [&>pre]:!m-0 [&>pre]:!p-4 [&>pre]:h-full"
          >
            {`import { ChatUI } from '@voltagent/ui'

export default function Chat() {
  return (
    <ChatUI
      theme="dark"
      messages={messages}
      onSend={handleSend}
      suggestions={[
        "How can I help you?",
        "Tell me more about your project"
      ]}
      tools={[
        {
          name: "search",
          description: "Search through docs"
        }
      ]}
      streaming={true}
      className="h-[600px] w-full"
    />
  )
}`}
          </CodeBlock>
        </div>
      </div>
    </div>
  </DayComponent>
);

const Day4 = () => (
  <DayComponent
    enabled={false}
    date="DAY 4 | THURSDAY, JUNE 19, 2025"
    title="Custom API Routes"
    description="Create custom endpoints for your agents with built-in authentication, rate limiting, and monitoring."
    detailsLink="#"
  >
    <div className="w-full">
      <div className="bg-gray-900 border-solid border-gray-800 rounded-xl sm:rounded-md overflow-hidden flex flex-col h-full">
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
        <div className="text-xs sm:text-sm flex-1 h-full">
          <CodeBlock
            language="typescript"
            showLineNumbers={false}
            className="!m-0 !p-0 h-full [&>pre]:!m-0 [&>pre]:!p-4 [&>pre]:h-full"
          >
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
`}
          </CodeBlock>
        </div>
      </div>
    </div>
  </DayComponent>
);

const Day5 = () => (
  <DayComponent
    enabled={false}
    date="DAY 5 | FRIDAY, JUNE 20, 2025"
    title="MCP & Showcase"
    description="Model Context Protocol integration and a comprehensive showcase of real-world implementations and use cases."
    detailsLink="#"
  >
    <div className="w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-800 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-emerald-400/20" />
      <div className="text-center z-10">
        <div className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4">🚀</div>
        <div className="text-gray-400 text-xs sm:text-sm">Feature Preview</div>
      </div>
    </div>
  </DayComponent>
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
              <a
                href="https://voltagent.dev/docs/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-emerald-400/10 text-emerald-400 no-underline border border-emerald-400/50 hover:bg-emerald-400/20 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-300 text-sm cursor-pointer"
              >
                View Documentation
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LaunchWeek;
