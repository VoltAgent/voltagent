import type React from "react";
import { TutorialLayout } from "../../components/tutorial/TutorialLayout";
import CodeBlock from "@theme/CodeBlock";
import { ColorModeProvider } from "@docusaurus/theme-common/internal";
import {
  CheckIcon,
  XMarkIcon,
  BoltIcon,
  DocumentTextIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";

export default function TutorialIntroduction() {
  return (
    <TutorialLayout
      currentStep={1}
      totalSteps={5}
      stepTitle="Introduction: Build AI Agents That Actually Work"
      stepDescription="Learn the fundamentals of creating production-ready AI agents"
      nextStepUrl="/tutorial/chatbot-problem"
    >
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">
            Build AI Agents That Actually Work
          </h1>
          <p className="text-base md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Learn to create production-ready AI agents with tools, memory, and
            real-world integrations. No fluff, just working code.
          </p>
        </div>

        {/* Why Do You Need VoltAgent? */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Why Do You Need VoltAgent?
          </h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            Building AI agents from scratch is like building a web app without
            React or Express. You'll spend months writing boilerplate instead of
            focusing on your actual business logic.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-solid border-red-500 rounded-lg p-6 bg-gray-800/50">
              <h3 className="text-xl font-semibold text-red-500 mb-4">
                Without a Framework
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-5 h-5 text-red-500 mt-1" />
                  <span className="text-gray-300">
                    Manual API calls to OpenAI/Claude
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-5 h-5 text-red-500 mt-1" />
                  <span className="text-gray-300">
                    Custom conversation state management
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-5 h-5 text-red-500 mt-1" />
                  <span className="text-gray-300">
                    Manual tool integration and execution
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-5 h-5 text-red-500 mt-1" />
                  <span className="text-gray-300">
                    No debugging, monitoring, or observability
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-5 h-5 text-red-500 mt-1" />
                  <span className="text-gray-300">
                    Complex agent coordination logic
                  </span>
                </div>
              </div>
            </div>

            <div className="border-solid border-emerald-500 rounded-lg p-6 bg-gray-800/50">
              <h3 className="text-xl font-semibold text-emerald-500 mb-4">
                With VoltAgent
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-5 h-5 text-emerald-500 mt-1" />
                  <span className="text-gray-300">
                    Unified API for all LLM providers
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-5 h-5 text-emerald-500 mt-1" />
                  <span className="text-gray-300">
                    Built-in conversation memory
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-5 h-5 text-emerald-500 mt-1" />
                  <span className="text-gray-300">
                    Tool system with automatic execution
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-5 h-5 text-emerald-500 mt-1" />
                  <span className="text-gray-300">
                    VoltOps: Real-time debugging & monitoring
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-5 h-5 text-emerald-500 mt-1" />
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
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            VoltAgent is a <strong>TypeScript-first framework</strong> for
            building AI agents. Think of it as the "Express.js for AI agents" -
            it handles the plumbing so you can focus on building.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-6 border-solid border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">
              Core Philosophy
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-3 h-3 bg-[#00d992] rounded-full mt-2" />
                <div>
                  <strong className="text-white text-lg">Modular:</strong>
                  <span className="text-gray-300 ml-1">
                    Use only what you need
                  </span>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-3 h-3 bg-[#00d992] rounded-full mt-2" />
                <div>
                  <strong className="text-white text-lg">
                    Developer-First:
                  </strong>
                  <span className="text-gray-300 ml-1">
                    Built by developers, for developers
                  </span>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-3 h-3 bg-[#00d992] rounded-full mt-2" />
                <div>
                  <strong className="text-white text-lg">
                    Production-Ready:
                  </strong>
                  <span className="text-gray-300 ml-1">
                    Monitoring, scaling, and deployment built-in
                  </span>
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
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            Let's create your first agent with just a few lines of code. This
            agent will introduce itself when you chat with it.
          </p>

          <div className="rounded-lg p-6 border-solid border-emerald-500 bg-gray-800/50">
            <h3 className="text-xl font-semibold text-[#00d992] mb-6">
              3-Step Setup
            </h3>
            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-[#00d992] rounded-full flex items-center justify-center">
                  <span className="text-[#1d1d1d] font-bold text-sm">1</span>
                </div>
                <div className="flex flex-col">
                  <code className="text-[#00d992] font-mono p-3  text-sm">
                    npm create voltagent-app@latest my-agent
                  </code>
                  <p className="text-gray-400 mt-2 mb-0 text-sm">
                    Creates a new VoltAgent project with all the boilerplate
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-[#00d992] rounded-full flex items-center justify-center">
                  <span className="text-[#1d1d1d] font-bold text-sm">2</span>
                </div>
                <div className="flex flex-col">
                  <p className="text-gray-300 mb-4">
                    Get your OpenAI API key and add it to{" "}
                    <code className="text-[#00d992] px-2 py-1 rounded text-sm">
                      .env
                    </code>
                  </p>
                  <div className="bg-gray-800/50 rounded-lg p-4 border-solid border-gray-700 space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#00d992] rounded-full mt-2" />
                      <div>
                        <span className="text-[#00d992] text-sm font-medium">
                          Get API Key:
                        </span>
                        <p className="text-gray-300 text-sm mt-1 mb-0">
                          Visit{" "}
                          <a
                            href="https://platform.openai.com/api-keys"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#00d992] hover:underline"
                          >
                            platform.openai.com/api-keys
                          </a>{" "}
                          → Create API Key → Copy it
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#00d992] rounded-full mt-2" />
                      <div>
                        <span className="text-[#00d992] text-sm font-medium mr-2">
                          Add to .env:
                        </span>
                        <code className="text-[#00d992] text-sm">
                          OPENAI_API_KEY=sk-your-key-here
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-[#00d992] rounded-full flex items-center justify-center">
                  <span className="text-[#1d1d1d] font-bold text-sm">3</span>
                </div>
                <div className="flex flex-col">
                  <code className="text-[#00d992] font-mono text-sm p-3">
                    npm run dev
                  </code>
                  <p className="text-gray-400 mt-2 text-sm mb-4">
                    Starts the server. You'll see this in your terminal:
                  </p>
                  <div className="bg-black rounded-lg p-4 border border-gray-600 font-mono text-sm">
                    <div className="text-green-400">
                      ══════════════════════════════════════════════════
                    </div>
                    <div className="text-white font-bold">
                      VOLTAGENT SERVER STARTED SUCCESSFULLY
                    </div>
                    <div className="text-green-400">
                      ══════════════════════════════════════════════════
                    </div>
                    <div className="text-blue-400">
                      ✓ HTTP Server: http://localhost:3141
                    </div>
                    <div className="text-yellow-400 mt-2">
                      VoltOps Platform: https://console.voltagent.dev
                    </div>
                    <div className="text-green-400">
                      ══════════════════════════════════════════════════
                    </div>
                    <div className="text-gray-300">
                      [VoltAgent] All packages are up to date
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mt-3 mb-0">
                    Click the{" "}
                    <a
                      href="https://console.voltagent.dev"
                      target="_blank"
                      rel="noreferrer"
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
        <div className="bg-gray-800/50 rounded-lg p-6 border-solid border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">
            See VoltOps in Action
          </h3>
          <p className="text-gray-300 mb-4">
            After running{" "}
            <code className="text-[#00d992] px-2 py-1 rounded">
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
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
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
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            Let's walk through what you're actually thinking when building this
            agent.
          </p>

          <div className="space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-lg border-l-4 border-solid border-0 border-blue-500">
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
              <div className="rounded p-3">
                <code className="text-blue-400 p-3">new Agent(config)</code>
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border-solid border-l-4 border-0 border-green-500">
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
              <div className="rounded p-3">
                <code className="text-green-400 p-3">name: "HelloAgent"</code>
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border-solid border-l-4 border-0 border-purple-500">
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
              <div className="rounded p-3">
                <code className="text-purple-400 p-3">
                  instructions: "You are a friendly assistant..."
                </code>
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border-l-4 border-solid border-0 border-orange-500">
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
              <div className="rounded p-3">
                <code className="text-orange-400 p-3">
                  model: openai("gpt-4o-mini")
                </code>
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border-l-4 border-solid border-0 border-red-500">
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
              <div className="rounded p-3">
                <code className="text-red-400 p-3">
                  new VoltAgent(serverConfig)
                </code>
              </div>
            </div>
          </div>

          <div className="rounded-lg p-6 border-solid border-emerald-500 bg-gray-800/50">
            <h4 className="text-[#00d992] font-semibold mb-2">The Result</h4>
            <p className="text-gray-300 mb-0">
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
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            VoltOps is your agent's dashboard. When you start your agent, it
            automatically connects to
            <a
              href="https://console.voltagent.dev"
              target="_blank"
              rel="noreferrer"
              className="text-[#00d992] hover:underline mx-2"
            >
              console.voltagent.dev
            </a>{" "}
            where you can chat with it in real-time.
          </p>

          <div className="rounded-lg p-6 border-solid border-emerald-500 bg-gray-800/50">
            <h3 className="text-xl font-semibold text-[#00d992] mb-4">
              What You'll See
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                <span className="text-gray-300">Real-time chat interface</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                <span className="text-gray-300">Agent performance metrics</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                <span className="text-gray-300">
                  Conversation logs and debugging
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                <span className="text-gray-300">Live code updates</span>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Path */}
        <div className="space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center">
            Your Learning Journey
          </h2>
          <p className="text-sm md:text-base text-gray-300 text-center leading-relaxed">
            We'll build your agent step by step, each tutorial adding one
            crucial capability:
          </p>

          <div className="space-y-4 md:space-y-6">
            {/* Step 1 */}
            <div className="flex items-start space-x-4 bg-gray-800/50 rounded-lg p-4 md:p-6 border-solid border border-gray-700">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm md:text-base font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
                  The Chatbot Problem
                </h3>
                <p className="text-sm md:text-base text-gray-300 leading-relaxed mb-0">
                  Why simple chatbots fail and what makes AI agents different.
                  Learn the fundamental concepts before diving into code.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start space-x-4 bg-gray-800/50 rounded-lg p-4 md:p-6 border-solid border border-gray-700">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-green-500 rounded-full flex items-center justify-center text-white text-sm md:text-base font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
                  Tools: Give Your Agent Superpowers
                </h3>
                <p className="text-sm md:text-base text-gray-300 leading-relaxed mb-0">
                  Create custom tools that let your agent actually do things:
                  send emails, manage databases, call APIs, and more.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start space-x-4 bg-gray-800/50 rounded-lg p-4 md:p-6 border-solid border border-gray-700">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm md:text-base font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
                  Memory: Remember Every Conversation
                </h3>
                <p className="text-sm md:text-base text-gray-300 leading-relaxed mb-0">
                  Add persistent memory so your agent remembers users, past
                  conversations, and builds context over time.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start space-x-4 bg-gray-800/50 rounded-lg p-4 md:p-6 border-solid border border-gray-700">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm md:text-base font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
                  MCP: Connect to Everything
                </h3>
                <p className="text-sm md:text-base text-gray-300 leading-relaxed mb-0">
                  Use Model Context Protocol to connect your agent to GitHub,
                  Slack, databases, and any external system you need.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex items-start space-x-4 bg-gray-800/50 rounded-lg p-4 md:p-6 border-solid border border-gray-700">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-red-500 rounded-full flex items-center justify-center text-white text-sm md:text-base font-bold flex-shrink-0">
                5
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
                  Subagents: Build Agent Teams
                </h3>
                <p className="text-sm md:text-base text-gray-300 leading-relaxed mb-0">
                  Create specialized agents that work together to handle complex
                  workflows and enterprise use cases.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Prerequisites */}
        <div className="space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center">
            What You Need to Know
          </h2>
          <p className="text-sm md:text-base text-gray-300 text-center leading-relaxed">
            This tutorial assumes basic familiarity with:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-gray-800/50 rounded-lg p-4 md:p-6 border-solid border border-gray-700">
              <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                Required
              </h3>
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckIcon className="w-4 h-4 md:w-5 md:h-5 text-[#00d992]" />
                  <span className="text-sm md:text-base text-gray-300">
                    Basic TypeScript/JavaScript
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckIcon className="w-4 h-4 md:w-5 md:h-5 text-[#00d992]" />
                  <span className="text-sm md:text-base text-gray-300">
                    Node.js and npm
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckIcon className="w-4 h-4 md:w-5 md:h-5 text-[#00d992]" />
                  <span className="text-sm md:text-base text-gray-300">
                    Understanding of APIs
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 md:p-6 border-solid border border-gray-700">
              <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                Helpful (But Not Required)
              </h3>
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-gray-600" />
                  <span className="text-sm md:text-base text-gray-300">
                    Experience with AI/LLMs
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-gray-600" />
                  <span className="text-sm md:text-base text-gray-300">
                    Database knowledge
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-gray-600" />
                  <span className="text-sm md:text-base text-gray-300">
                    DevOps experience
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center">
            Ready to Start Building?
          </h2>
          <p className="text-sm md:text-base text-gray-300 text-center leading-relaxed">
            Each tutorial builds on the previous one, so we recommend following
            them in order. You can always jump ahead if you're already familiar
            with certain concepts.
          </p>

          <div className="bg-[#00d992]/10 border-solid border border-[#00d992]/20 rounded-lg p-4 md:p-6 text-center">
            <h4 className="text-lg md:text-xl text-[#00d992] font-semibold mb-3 md:mb-4">
              ⚡ Start Building Now
            </h4>
            <p className="text-sm md:text-base text-gray-300 mb-4 md:mb-6">
              Ready to build AI agents that actually work? Let's start with
              understanding why most chatbots fail and what makes agents
              different.
            </p>
            <a
              href="/tutorial/chatbot-problem"
              className="inline-flex items-center px-6 py-3 bg-[#00d992] text-black font-semibold rounded-lg hover:bg-[#00c085] transition-all duration-300 shadow-lg hover:shadow-xl no-underline text-sm md:text-base"
            >
              Start Tutorial →
            </a>
          </div>
        </div>
      </div>
    </TutorialLayout>
  );
}
