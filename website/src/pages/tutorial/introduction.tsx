import type React from "react";
import { TutorialLayout } from "../../components/tutorial/TutorialLayout";
import CodeBlock from "@theme/CodeBlock";
import { ColorModeProvider } from "@docusaurus/theme-common/internal";

export default function TutorialIntroduction() {
  return (
    <TutorialLayout
      currentStep={1}
      totalSteps={5}
      stepTitle="Why VoltAgent? Your First Agent"
      stepDescription="Understanding the need for AI agent frameworks and creating your first agent"
      nextStepUrl="/tutorial/chatbot-problem"
    >
      <div className="space-y-8">
        {/* Why Do You Need VoltAgent? */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Why Do You Need VoltAgent?
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Building AI agents from scratch is like building a web app without
            React or Express. You'll spend months writing boilerplate instead of
            focusing on your actual business logic.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-red-300 mb-4">
                Without a Framework
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-1">❌</span>
                  <span className="text-gray-300">
                    Manual API calls to OpenAI/Claude
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-1">❌</span>
                  <span className="text-gray-300">
                    Custom conversation state management
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-1">❌</span>
                  <span className="text-gray-300">
                    Manual tool integration and execution
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-1">❌</span>
                  <span className="text-gray-300">
                    No debugging, monitoring, or observability
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-1">❌</span>
                  <span className="text-gray-300">
                    Complex agent coordination logic
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-green-300 mb-4">
                With VoltAgent
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 mt-1">✅</span>
                  <span className="text-gray-300">
                    Unified API for all LLM providers
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 mt-1">✅</span>
                  <span className="text-gray-300">
                    Built-in conversation memory
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 mt-1">✅</span>
                  <span className="text-gray-300">
                    Tool system with automatic execution
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 mt-1">✅</span>
                  <span className="text-gray-300">
                    VoltOps: Real-time debugging & monitoring
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 mt-1">✅</span>
                  <span className="text-gray-300">
                    Multi-agent coordination out of the box
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What is VoltAgent? */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">What is VoltAgent?</h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            VoltAgent is a <strong>TypeScript-first framework</strong> for
            building AI agents. Think of it as the "Express.js for AI agents" -
            it handles the plumbing so you can focus on building.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">
              Core Philosophy
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-3 h-3 bg-[#00d992] rounded-full mt-2"></div>
                <div>
                  <strong className="text-white text-lg">Modular:</strong>
                  <p className="text-gray-300 mt-1">Use only what you need</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-3 h-3 bg-[#00d992] rounded-full mt-2"></div>
                <div>
                  <strong className="text-white text-lg">
                    Developer-First:
                  </strong>
                  <p className="text-gray-300 mt-1">
                    Built by developers, for developers
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-3 h-3 bg-[#00d992] rounded-full mt-2"></div>
                <div>
                  <strong className="text-white text-lg">
                    Production-Ready:
                  </strong>
                  <p className="text-gray-300 mt-1">
                    Monitoring, scaling, and deployment built-in
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Your First Agent */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Your First Agent: Hello World
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Let's create your first agent with just a few lines of code. This
            agent will introduce itself when you chat with it.
          </p>

          <div className="bg-[#00d992]/10 rounded-lg p-6 border border-[#00d992]/20">
            <h3 className="text-xl font-semibold text-[#00d992] mb-4">
              3-Step Setup
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <span className="text-[#00d992] font-mono font-bold text-lg">
                  1.
                </span>
                <div>
                  <code className="text-[#00d992] bg-gray-900 px-3 py-2 rounded">
                    npm create voltagent-app@latest my-agent
                  </code>
                  <p className="text-gray-400 text-sm mt-1">
                    Creates a new VoltAgent project with all the boilerplate
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <span className="text-[#00d992] font-mono font-bold text-lg">
                  2.
                </span>
                <div>
                  <p className="text-gray-300 mb-2">
                    Get your OpenAI API key and add it to{" "}
                    <code className="text-blue-400 bg-gray-900 px-2 py-1 rounded">
                      .env
                    </code>
                  </p>
                  <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-blue-400 text-sm font-medium">
                        Get API Key:
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">
                      Visit{" "}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        className="text-blue-400 hover:underline"
                      >
                        platform.openai.com/api-keys
                      </a>{" "}
                      → Create API Key → Copy it
                    </p>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-green-400 text-sm font-medium">
                        Add to .env:
                      </span>
                    </div>
                    <code className="text-orange-400 bg-gray-900 px-2 py-1 rounded text-sm">
                      OPENAI_API_KEY=sk-your-key-here
                    </code>
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <span className="text-[#00d992] font-mono font-bold text-lg">
                  3.
                </span>
                <div>
                  <code className="text-[#00d992] bg-gray-900 px-3 py-2 rounded">
                    npm run dev
                  </code>
                  <p className="text-gray-400 text-sm mt-2 mb-3">
                    Starts the server. You'll see this in your terminal:
                  </p>
                  <div className="bg-black rounded-lg p-4 border border-gray-600 font-mono text-sm">
                    <div className="text-green-400">
                      ══════════════════════════════════════════════════
                    </div>
                    <div className="text-white font-bold">
                      {" "}
                      VOLTAGENT SERVER STARTED SUCCESSFULLY
                    </div>
                    <div className="text-green-400">
                      ══════════════════════════════════════════════════
                    </div>
                    <div className="text-blue-400">
                      {" "}
                      ✓ HTTP Server: http://localhost:3141
                    </div>
                    <div className="text-gray-400 mt-2"></div>
                    <div className="text-yellow-400">
                      {" "}
                      VoltOps Platform: https://console.voltagent.dev
                    </div>
                    <div className="text-green-400">
                      ══════════════════════════════════════════════════
                    </div>
                    <div className="text-gray-300">
                      [VoltAgent] All packages are up to date
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mt-3">
                    Click the{" "}
                    <a
                      href="https://console.voltagent.dev"
                      target="_blank"
                      className="text-[#00d992] hover:underline font-medium"
                    >
                      console.voltagent.dev
                    </a>{" "}
                    link to test your agent!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Demo GIF */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">
            See VoltOps in Action
          </h3>
          <p className="text-gray-300 mb-4">
            After running{" "}
            <code className="text-[#00d992] bg-gray-900 px-2 py-1 rounded">
              npm run dev
            </code>
            , this is what you'll see in VoltOps console:
          </p>
          <div className="rounded-lg overflow-hidden border border-gray-600">
            <img
              src="https://cdn.voltagent.dev/docs/tutorial/voltagent-voltops-demo.gif"
              alt="VoltOps Demo - Testing your agent in real-time"
              className="w-full h-auto"
            />
          </div>
          <p className="text-gray-400 text-sm mt-3 text-center">
            Real-time agent testing and debugging in VoltOps console
          </p>
        </div>

        {/* Code Example */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">Your Agent Code</h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            This is what gets generated for you. Simple, clean, and ready to
            extend.
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="src/index.ts">
              {`import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Create your first agent
const myFirstAgent = new Agent({
  name: "HelloAgent",
  description: "A simple agent that introduces itself",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: "You are a friendly assistant. Always greet users warmly."
});

// Start VoltAgent server
new VoltAgent({
  agents: { myFirstAgent },
});`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* Developer Journey */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            The Developer Journey
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Let's walk through what you're actually thinking when building this
            agent.
          </p>

          <div className="space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-lg border-l-4 border-blue-500">
              <h4 className="text-blue-400 font-semibold mb-3 flex items-center">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
                  1
                </div>
                "I need an AI agent"
              </h4>
              <p className="text-gray-300 mb-3">
                You start with the{" "}
                <span className="text-blue-400 font-mono">Agent</span> class -
                think of it as your AI's personality container. It's where you
                define who your AI is and how it should behave.
              </p>
              <div className="bg-gray-900 rounded p-3">
                <code className="text-blue-400">new Agent(config)</code>
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border-l-4 border-green-500">
              <h4 className="text-green-400 font-semibold mb-3 flex items-center">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
                  2
                </div>
                "What should I call it?"
              </h4>
              <p className="text-gray-300 mb-3">
                Give it a name - this is how you'll reference it later. Think of
                it like naming a function or variable. Choose something
                descriptive that tells you what this agent does.
              </p>
              <div className="bg-gray-900 rounded p-3">
                <code className="text-green-400">name: "HelloAgent"</code>
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border-l-4 border-purple-500">
              <h4 className="text-purple-400 font-semibold mb-3 flex items-center">
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
                  3
                </div>
                "How should it behave?"
              </h4>
              <p className="text-gray-300 mb-3">
                The{" "}
                <span className="text-purple-400 font-mono">instructions</span>{" "}
                are like giving directions to a human colleague. Be specific
                about personality, tone, and behavior. This is your agent's core
                personality.
              </p>
              <div className="bg-gray-900 rounded p-3">
                <code className="text-purple-400">
                  instructions: "You are a friendly assistant..."
                </code>
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border-l-4 border-orange-500">
              <h4 className="text-orange-400 font-semibold mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
                  4
                </div>
                "Which AI should power this?"
              </h4>
              <p className="text-gray-300 mb-3">
                Choose your AI model like you'd choose a database.{" "}
                <span className="text-orange-400 font-mono">gpt-4o-mini</span>{" "}
                is fast and cheap for simple tasks.{" "}
                <span className="text-orange-400 font-mono">gpt-4</span> is more
                powerful for complex reasoning.
              </p>
              <div className="bg-gray-900 rounded p-3">
                <code className="text-orange-400">
                  model: openai("gpt-4o-mini")
                </code>
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border-l-4 border-red-500">
              <h4 className="text-red-400 font-semibold mb-3 flex items-center">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
                  5
                </div>
                "How do I make it accessible?"
              </h4>
              <p className="text-gray-300 mb-3">
                <span className="text-red-400 font-mono">VoltAgent</span> is
                your server - like Express.js but for AI agents. It handles HTTP
                requests, WebSocket connections, and automatically connects to
                VoltOps for debugging.
              </p>
              <div className="bg-gray-900 rounded p-3">
                <code className="text-red-400">
                  new VoltAgent(serverConfig)
                </code>
              </div>
            </div>
          </div>

          <div className="bg-[#00d992]/10 rounded-lg p-6 border border-[#00d992]/20">
            <h4 className="text-[#00d992] font-semibold mb-2">The Result</h4>
            <p className="text-gray-300">
              In just 10 lines of code, you've created a production-ready AI
              agent with monitoring, debugging, and a web interface. That's the
              power of VoltAgent - less boilerplate, more building.
            </p>
          </div>
        </div>

        {/* VoltOps Integration */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Meet VoltOps: Your Agent Console
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            VoltOps is your agent's dashboard. When you start your agent, it
            automatically connects to
            <a
              href="https://console.voltagent.dev"
              target="_blank"
              className="text-[#00d992] hover:underline mx-2"
            >
              console.voltagent.dev
            </a>{" "}
            where you can chat with it in real-time.
          </p>

          <div className="bg-[#00d992]/10 rounded-lg p-6 border border-[#00d992]/20">
            <h3 className="text-xl font-semibold text-[#00d992] mb-4">
              What You'll See
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                <span className="text-gray-300">Real-time chat interface</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                <span className="text-gray-300">Agent performance metrics</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                <span className="text-gray-300">
                  Conversation logs and debugging
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                <span className="text-gray-300">Live code updates</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TutorialLayout>
  );
}
