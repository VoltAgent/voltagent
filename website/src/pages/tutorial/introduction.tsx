import Link from "@docusaurus/Link";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import CodeBlock from "@theme/CodeBlock";
import type React from "react";
import { useState } from "react";
import { DiscordLogo } from "../../../static/img/logos/discord";
import { GitHubLogo } from "../../../static/img/logos/github";
import { MobileAgentCode } from "../../components/tutorial";
import { TutorialLayout } from "../../components/tutorial/TutorialLayout";

export default function TutorialIntroduction() {
  const [highlightedSection, setHighlightedSection] = useState<string | null>("agent");
  const isMobile = useMediaQuery("(max-width: 1023px)");

  // Function to define code sections
  const getHighlightClasses = (section: string) => {
    const baseHighlightClass = "transition-all duration-300 ease-in-out";

    return highlightedSection === section
      ? `bg-gradient-to-r from-emerald-600/40 to-emerald-500/20 border-l-2 border-solid border-t-0 border-r-0 border-b-0 border-emerald-500 pl-2 rounded-sm shadow-lg text-foreground ${baseHighlightClass}`
      : `text-muted-foreground ${baseHighlightClass}`;
  };

  // Handlers for mouse over and click
  const handleMouseEnter = (section: string) => {
    setHighlightedSection(section);
  };

  const handleMouseLeave = () => {
    setHighlightedSection(null);
  };

  const handleClick = (section: string) => {
    setHighlightedSection(section === highlightedSection ? null : section);
  };

  return (
    <TutorialLayout
      currentStep={1}
      totalSteps={5}
      stepTitle="Introduction: Build AI Agents That Actually Work"
      stepDescription="Learn to create production-ready AI agents with tools, memory, and real-world integrations. No fluff, just working code."
      nextStepUrl="/tutorial/chatbot-problem"
    >
      <div className="space-y-24">
        {/* Video Introduction - Modern Design */}
        <div className="relative">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5 rounded-3xl blur-3xl -z-10" />

          <div className="relative">
            <div className="max-w-4xl mx-auto">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-purple-500/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-300" />
                <div className="relative w-full h-0 pb-[56.25%] rounded-xl overflow-hidden border border-solid border-white/10 bg-black/40 backdrop-blur-sm">
                  <iframe
                    src="https://www.youtube.com/embed/CZ07r351T1k"
                    title="VoltAgent Introduction - Build AI Agents That Actually Work"
                    className="absolute top-0 left-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why Do You Need VoltAgent? */}
        <div className="relative mb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-emerald-500/5 rounded-3xl blur-3xl -z-10" />

          <div className="mb-8">
            <h2 className="text-[21.6px] font-medium text-white mb-3">
              Why Do You Need VoltAgent?
            </h2>
            <p className="text-sm landing-md:text-base text-gray-400 leading-relaxed max-w-3xl">
              Building AI agents from scratch is like building a web app without React or Express.
              You'll spend months writing boilerplate instead of focusing on your actual business
              logic.
            </p>
          </div>

          <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-6">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-300" />
              <div className="relative border border-solid border-red-500/20 bg-red-500/[0.03] backdrop-blur-sm rounded-xl p-6 hover:border-red-500/30 transition-colors">
                <h3 className="text-[18px] font-medium text-red-300 mb-4">Without a Framework</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <XMarkIcon className="w-5 h-5 text-red-400 mt-1" />
                    <span className="text-gray-300">Manual API calls to OpenAI/Claude</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <XMarkIcon className="w-5 h-5 text-red-400 mt-1" />
                    <span className="text-gray-300">Custom conversation state management</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <XMarkIcon className="w-5 h-5 text-red-400 mt-1" />
                    <span className="text-gray-300">Manual tool integration and execution</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <XMarkIcon className="w-5 h-5 text-red-400 mt-1" />
                    <span className="text-gray-300">
                      No debugging, monitoring, or observability
                    </span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <XMarkIcon className="w-5 h-5 text-red-400 mt-1" />
                    <span className="text-gray-300">Complex agent coordination logic</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-300" />
              <div className="relative border border-solid border-emerald-500/20 bg-emerald-500/[0.03] backdrop-blur-sm rounded-xl p-6 hover:border-emerald-500/30 transition-colors">
                <h3 className="text-[18px] font-medium text-emerald-300 mb-4">With VoltAgent</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <CheckIcon className="w-5 h-5 text-emerald-400 mt-1" />
                    <span className="text-gray-300">Unified API for all LLM providers</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckIcon className="w-5 h-5 text-emerald-400 mt-1" />
                    <span className="text-gray-300">Built-in conversation memory</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckIcon className="w-5 h-5 text-emerald-400 mt-1" />
                    <span className="text-gray-300">Tool system with automatic execution</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckIcon className="w-5 h-5 text-emerald-400 mt-1" />
                    <span className="text-gray-300">VoltOps: Real-time debugging & monitoring</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckIcon className="w-5 h-5 text-emerald-400 mt-1" />
                    <span className="text-gray-300">Multi-agent coordination out of the box</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What is VoltAgent? */}
        <div className="relative mb-20">
          {/* Section container with border and gradient */}
          <div className="relative border  border-solid border-white/10 rounded-2xl p-8 landing-md:p-10 bg-white/[0.02] backdrop-blur-sm to-transparent backdrop-blur-sm">
            {/* Accent line */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 via-purple-500 to-transparent rounded-l-2xl" />

            <h2 className="text-[21.6px] font-medium text-white mb-3">What is VoltAgent?</h2>
            <p className="text-sm landing-md:text-base text-gray-400 leading-relaxed mb-8">
              VoltAgent is a <strong className="text-white">TypeScript-first framework</strong> for
              building AI agents. Think of it as the "Express.js for AI agents" - it handles the
              plumbing so you can focus on building.
            </p>

            <div className="border-solid border border-white/10 bg-white/[0.02] backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-[18px] font-medium text-white mb-4 flex items-center gap-2">
                Core Philosophy
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-3 h-3 bg-main-emerald rounded-full mt-2" />
                  <div>
                    <strong className="text-foreground text-base">Modular:</strong>
                    <span className="text-muted-foreground ml-1">Use only what you need</span>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-3 h-3 bg-main-emerald rounded-full mt-2" />
                  <div>
                    <strong className="text-foreground text-base">Developer-First:</strong>
                    <span className="text-muted-foreground ml-1">
                      Made for how developers actually work
                    </span>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-3 h-3 bg-main-emerald rounded-full mt-2" />
                  <div>
                    <strong className="text-foreground text-base">Production-Ready:</strong>
                    <span className="text-muted-foreground ml-1">
                      Monitoring, scaling, and deployment built-in
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started Section */}
        <div className="relative mb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 rounded-3xl blur-3xl -z-10" />

          {/* Section container with border */}
          <div className="relative border border-solid border-white/10 rounded-2xl p-8 landing-md:p-10 bg-white/[0.02] backdrop-blur-sm to-transparent backdrop-blur-sm">
            {/* Accent line */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 via-cyan-500 to-transparent rounded-l-2xl" />
            <h2 className="text-[21.6px] font-medium text-foreground">
              Getting Started in 60 Seconds
            </h2>
            <p className="text-landing-sm landing-md:text-base text-muted-foreground leading-relaxed">
              Create a new VoltAgent project and have a working AI agent in under a minute:
            </p>

            <div className=" ">
              <h3 className="text-[18px] font-medium text-main-emerald mb-4">Step-by-Step Setup</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 landing-md:space-x-4">
                  <div className="flex-shrink-0 w-7 h-7 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center">
                    <span className=" font-bold text-xs landing-md:text-sm">1</span>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-2 pt-1 text-xs landing-md:text-base">
                      Create Your Project
                    </p>
                    <CodeBlock language="bash" className="w-[315px]">
                      npm create voltagent-app@latest
                    </CodeBlock>
                  </div>
                </div>

                <div className="flex items-start space-x-3 landing-md:space-x-4">
                  <div className="flex-shrink-0 w-7 h-7 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center">
                    <span className=" font-bold text-xs landing-md:text-base">2</span>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-2 pt-1 text-xs landing-md:text-base">
                      Navigate to Project
                    </p>
                    <CodeBlock language="bash" className="w-[315px]">
                      cd my-voltagent-app
                    </CodeBlock>
                  </div>
                </div>

                <div className="flex items-start space-x-3 landing-md:space-x-4">
                  <div className="flex-shrink-0 w-7 h-7 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center">
                    <span className=" font-bold text-xs landing-md:text-base">3</span>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-2 pt-1 text-xs landing-md:text-base">
                      Add Your API Key
                    </p>
                    <p className="text-muted-foreground text-xs mb-2 landing-md:text-sm">
                      Create or edit the{" "}
                      <code className="bg-muted px-2 py-1 rounded text-amber-300">.env</code> file
                      and add your OpenAI API key:
                    </p>
                    <CodeBlock language="bash" className="w-[315px]">
                      OPENAI_API_KEY=your-api-key-here
                    </CodeBlock>
                    <p className="text-xs text-muted-foreground mt-2">
                      Get your API key from{" "}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-main-emerald hover:underline"
                      >
                        OpenAI Platform
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 landing-md:space-x-4">
                  <div className="flex-shrink-0 w-7 h-7 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center">
                    <span className=" font-bold text-xs landing-md:text-base">4</span>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-2 pt-1 text-xs landing-md:text-base">
                      Start Your Agent
                    </p>
                    <CodeBlock language="bash" className="w-[315px]">
                      npm run dev{" "}
                    </CodeBlock>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-300" />
              <div className="relative bg-emerald-500/5 border border-solid border-emerald-500/30 backdrop-blur-sm rounded-xl p-6">
                <h4 className="text-[18px] text-emerald-400 font-medium mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Success! Your agent is running
                </h4>
                <p className="text-gray-400 text-sm mb-4">You should see this in your terminal:</p>

                <pre className="text-[#f2f2f2] text-xs bg-black font-mono leading-relaxed">
                  <code>{`══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server:  http://localhost:3141
  ✓ Swagger UI:   http://localhost:3141/ui

  Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════`}</code>
                </pre>

                <p className="text-gray-400 text-sm">
                  Visit{" "}
                  <a
                    href="https://console.voltagent.dev"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 underline transition-colors"
                  >
                    console.voltagent.dev
                  </a>{" "}
                  to find your agent and start chatting:
                </p>

                {/* Demo GIF */}
                <div className="mt-4 rounded-lg overflow-hidden border border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm">
                  <img
                    src="https://cdn.voltagent.dev/docs/tutorial/voltagent-voltops-demo.gif"
                    alt="VoltOps Dashboard Demo - How to find your agent and start chatting"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>

                <p className="text-gray-400 text-sm mt-4">
                  The code below shows exactly what you just created.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* your agent code - Interactive Version */}
        <div className="relative mb-20">
          {/* Section container with border */}
          <div className="relative border border-solid border-white/10 rounded-2xl p-8 landing-md:p-10 bg-white/[0.02] backdrop-blur-sm to-transparent backdrop-blur-sm">
            {/* Accent line */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 via-pink-500 to-transparent rounded-l-2xl" />
            <h2 className="text-[21.6px] font-medium text-foreground">Your Agent Code</h2>
            <p className="text-landing-sm landing-md:text-base mb-12 text-muted-foreground leading-relaxed">
              This is what gets generated for you. Hover over the explanations to see how each part
              works.
            </p>

            {/* Interactive Code Section - Wider Container */}
            <div className="max-w-7xl mx-auto">
              {isMobile ? (
                <MobileAgentCode isVisible={true} />
              ) : (
                <div className="flex items-center justify-between gap-8">
                  {/* Code Section - Left Side */}
                  <div className="w-[55%] border border-solid border-[#30363d] rounded-lg bg-[#010409] min-h-[520px] flex flex-col">
                    <pre className="text-left flex-1 bg-transparent p-0 text-xs md:text-sm font-mono m-0">
                      <div className="flex h-full">
                        <div className="py-5 px-2 text-right text-[#8b949e] select-none border-r border-[#30363d] min-w-[40px] text-xs">
                          <div>1</div>
                          <div>2</div>
                          <div>3</div>
                          <div>4</div>
                          <div>5</div>
                          <div>6</div>
                          <div>7</div>
                          <div>8</div>
                          <div>9</div>
                          <div>10</div>
                          <div>11</div>
                          <div>12</div>
                          <div>13</div>
                          <div>14</div>
                          <div>15</div>
                          <div>16</div>
                          <div>17</div>
                          <div>18</div>
                          <div>19</div>
                          <div>20</div>
                        </div>
                        <code className="py-5 px-3 block text-xs flex-1 text-[#e6edf3]">
                          {/* Imports */}
                          <span className={`block ${getHighlightClasses("imports")}`}>
                            <span className="text-[#ff7b72]">import</span>
                            <span className="text-[#e6edf3]">
                              {" "}
                              {"{"} VoltAgent, Agent {"}"}{" "}
                            </span>
                            <span className="text-[#ff7b72]">from</span>
                            <span className="text-[#a5d6ff]"> "@voltagent/core"</span>
                            <span className="text-[#e6edf3]">;</span>
                            <br />

                            <span className="text-[#ff7b72]">import</span>
                            <span className="text-[#e6edf3]">
                              {" "}
                              {"{"} openai {"}"}{" "}
                            </span>
                            <span className="text-[#ff7b72]">from</span>
                            <span className="text-[#a5d6ff]"> "@ai-sdk/openai"</span>
                            <span className="text-[#e6edf3]">;</span>
                            <br />
                            <br />
                          </span>

                          {/* Agent Creation */}
                          <span className={`block ${getHighlightClasses("agent")}`}>
                            <span className="text-[#8b949e]">{"// Define a simple agent"}</span>
                            <br />
                            <span className="text-[#ff7b72]">const</span>
                            <span className="text-[#e6edf3]"> agent = </span>
                            <span className="text-[#ff7b72]">new</span>
                            <span className="text-[#d2a8ff]"> Agent</span>
                            <span className="text-[#e6edf3]">{"({"}</span>
                            <br />
                          </span>

                          {/* Agent Name */}
                          <span className={`block ${getHighlightClasses("name")}`}>
                            <span className="ml-4 text-[#e6edf3]">name: </span>
                            <span className="text-[#a5d6ff]">"my-agent"</span>
                            <span className="text-[#e6edf3]">,</span>
                            <br />
                          </span>

                          {/* Agent Instructions & Provider */}
                          <span className={`block ${getHighlightClasses("behavior")}`}>
                            <span className="ml-4 text-[#e6edf3]">instructions: </span>
                            <span className="text-[#a5d6ff]">
                              "A helpful assistant that answers questions without using tools"
                            </span>
                            <span className="text-[#e6edf3]">,</span>
                            <br />
                          </span>

                          {/* Model Selection */}
                          <span className={`block ${getHighlightClasses("model")}`}>
                            <span className="ml-4 text-[#e6edf3]">model: </span>
                            <span className="text-[#d2a8ff]">openai</span>
                            <span className="text-[#e6edf3]">(</span>
                            <span className="text-[#a5d6ff]">"gpt-4o-mini"</span>
                            <span className="text-[#e6edf3]">),</span>
                            <br />
                          </span>

                          <span className={`block ${getHighlightClasses("agent")}`}>
                            <span className="text-[#e6edf3]">{"});"}</span>
                            <br />
                            <br />
                          </span>

                          {/* Server Setup */}
                          <span className={`block ${getHighlightClasses("server")}`}>
                            <span className="text-[#8b949e]">
                              {"// Initialize VoltAgent with your agent(s)"}
                            </span>
                            <br />
                            <span className="text-[#ff7b72]">new</span>
                            <span className="text-[#d2a8ff]"> VoltAgent</span>
                            <span className="text-[#e6edf3]">{"({"}</span>
                            <br />
                            <span className="ml-4 text-[#e6edf3]">
                              agents: {"{"} agent {"}"},
                            </span>
                            <br />
                            <span className="text-[#e6edf3]">{"});"}</span>
                            <br />
                            <br />
                            <br />
                            <br />
                            <span className="text-[#8b949e]">
                              {"// Your agent is now running!"}
                            </span>
                            <br />
                            <span className="text-[#8b949e]">
                              {"// Visit console.voltagent.dev to interact"}
                            </span>
                          </span>
                        </code>
                      </div>
                    </pre>
                  </div>

                  {/* Explanation Cards - Right Side */}
                  <div className="flex w-[45%] flex-col gap-4">
                    {/* Card 1 - Agent Creation */}
                    <div className="relative h-full">
                      <div
                        className={`h-[100px] p-3 rounded-lg ${
                          highlightedSection === "agent"
                            ? "border border-solid border-emerald-400 bg-emerald-400/10"
                            : "border border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04]"
                        } flex flex-col cursor-pointer transition-all duration-300`}
                        onMouseEnter={() => handleMouseEnter("agent")}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleClick("agent")}
                      >
                        <div
                          className={`text-base font-semibold mb-3 ${
                            highlightedSection === "agent" ? "text-emerald-500" : "text-foreground"
                          }`}
                        >
                          "I need an AI agent"
                        </div>
                        <div className="text-muted-foreground text-xs leading-relaxed">
                          The Agent class is your AI's personality container. It defines who your AI
                          is and how it should behave.
                        </div>
                      </div>
                    </div>

                    {/* Card 2 - Naming */}
                    <div className="relative h-full">
                      <div
                        className={`h-[100px] p-3 rounded-lg ${
                          highlightedSection === "name"
                            ? "border border-emerald-400 bg-emerald-400/10"
                            : "border border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04]"
                        } flex flex-col cursor-pointer transition-all duration-300`}
                        onMouseEnter={() => handleMouseEnter("name")}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleClick("name")}
                      >
                        <div
                          className={`text-base font-semibold mb-3 ${
                            highlightedSection === "name" ? "text-emerald-500" : "text-foreground"
                          }`}
                        >
                          "What to call it?"
                        </div>
                        <div className="text-muted-foreground text-xs leading-relaxed">
                          Give it a descriptive name. Think of it like naming a function - choose
                          something that tells you what this agent does.
                        </div>
                      </div>
                    </div>

                    {/* Card 3 - Behavior */}
                    <div className="relative h-full">
                      <div
                        className={`h-[100px] p-3 rounded-lg ${
                          highlightedSection === "behavior"
                            ? "border border-emerald-400 bg-emerald-400/10"
                            : "border border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04]"
                        } flex flex-col cursor-pointer transition-all duration-300`}
                        onMouseEnter={() => handleMouseEnter("behavior")}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleClick("behavior")}
                      >
                        <div
                          className={`text-base font-semibold mb-3 ${
                            highlightedSection === "behavior"
                              ? "text-emerald-500"
                              : "text-foreground"
                          }`}
                        >
                          "How should it behave?"
                        </div>
                        <div className="text-muted-foreground text-xs leading-relaxed">
                          Instructions define your agent's personality and behavior. The LLM
                          provider handles the AI communication layer.
                        </div>
                      </div>
                    </div>

                    {/* Card 4 - Model Selection */}
                    <div className="relative h-full">
                      {/* biome-ignore lint/a11y/useKeyWithClickEvents: ignore */}
                      <div
                        className={`h-[100px] p-3 rounded-lg ${
                          highlightedSection === "model"
                            ? "border border-solid border-emerald-400 bg-emerald-400/10"
                            : "border border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04]"
                        } flex flex-col cursor-pointer transition-all duration-300`}
                        onMouseEnter={() => handleMouseEnter("model")}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleClick("model")}
                      >
                        <div
                          className={`text-base font-semibold mb-3 ${
                            highlightedSection === "model" ? "text-emerald-500" : "text-foreground"
                          }`}
                        >
                          "Which AI to use?"
                        </div>
                        <div className="text-muted-foreground text-xs leading-relaxed">
                          Choose your AI model like a database. gpt-4o-mini is fast and cheap, gpt-4
                          is more powerful for complex reasoning.
                        </div>
                      </div>
                    </div>

                    {/* Card 5 - Server */}
                    <div className="relative h-full">
                      {/* biome-ignore lint/a11y/useKeyWithClickEvents: ignore */}
                      <div
                        className={`h-[100px] p-3 rounded-lg ${
                          highlightedSection === "server"
                            ? "border border-emerald-400 bg-emerald-400/10"
                            : "border border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04]"
                        } flex flex-col cursor-pointer transition-all duration-300`}
                        onMouseEnter={() => handleMouseEnter("server")}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleClick("server")}
                      >
                        <div
                          className={`text-base font-semibold mb-3 ${
                            highlightedSection === "server" ? "text-emerald-500" : "text-foreground"
                          }`}
                        >
                          "How to make it accessible?"
                        </div>
                        <div className="text-muted-foreground text-xs leading-relaxed">
                          VoltAgent is your server - like Express.js but for AI agents. Handles
                          HTTP, WebSocket, and connects to VoltOps.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!isMobile && (
              <div className="  mt-8">
                <h4 className="text-[18px] text-main-emerald font-medium mb-2">The Result</h4>
                <p className="text-muted-foreground mb-0 text-xs landing-md:text-base">
                  In just 15 lines of code, you've created a production-ready AI agent with
                  monitoring, debugging, and a web interface. That's the power of VoltAgent - less
                  boilerplate, more building.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* VoltOps Integration */}
        <div className="relative mb-20">
          <div className="relative border border-solid border-white/10 rounded-2xl p-8 landing-md:p-10 bg-white/[0.02] backdrop-blur-sm to-transparent backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 via-blue-500 to-transparent rounded-l-2xl" />
            <h2 className="text-[21.6px] font-medium text-foreground">
              Meet VoltOps: Your Agent Console
            </h2>
            <p className="text-landing-sm landing-md:text-base text-muted-foreground leading-relaxed">
              VoltOps is your agent's dashboard. When you start your agent, it automatically
              connects to
              <a
                href="https://console.voltagent.dev"
                target="_blank"
                rel="noreferrer"
                className="text-main-emerald hover:underline mx-2"
              >
                console.voltagent.dev
              </a>{" "}
              where you can chat with it in real-time.
            </p>

            <div className=" ">
              <h3 className="text-[18px] font-medium text-main-emerald mb-4">What You'll See</h3>
              <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-main-emerald rounded-full" />
                  <span className="text-muted-foreground">Real-time chat interface</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-main-emerald rounded-full" />
                  <span className="text-muted-foreground">Agent performance metrics</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-main-emerald rounded-full" />
                  <span className="text-muted-foreground">Conversation logs and debugging</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-main-emerald rounded-full" />
                  <span className="text-muted-foreground">Live code updates</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Path */}
        <div className="relative mb-20">
          <div className="relative border border-solid border-white/10 rounded-2xl p-8 landing-md:p-10 bg-white/[0.02] backdrop-blur-sm to-transparent backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 via-red-500 to-transparent rounded-l-2xl" />
            <h2 className="text-[21.6px] font-medium text-foreground text-left">
              Your Learning Journey
            </h2>
            <p className="text-landing-sm landing-md:text-base text-muted-foreground text-left leading-relaxed mb-8">
              We'll build your agent step by step, each tutorial adding one crucial capability:
            </p>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex items-start space-x-3 bg-white/[0.02] backdrop-blur-sm rounded-lg p-3 border border-solid border-white/10">
                <div className="w-8 h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    The Chatbot Problem
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-0">
                    Why simple chatbots fail and what makes AI agents different. Learn the
                    fundamental concepts before diving into code.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-3 bg-white/[0.02] backdrop-blur-sm rounded-lg p-3 border border-solid border-white/10">
                <div className="w-8 h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    Tools: Give Your Agent Superpowers
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-0">
                    Create custom tools that let your agent actually do things: send emails, manage
                    databases, call APIs, and more.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-3 bg-white/[0.02] backdrop-blur-sm rounded-lg p-3 border border-solid border-white/10">
                <div className="w-8 h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    Memory: Remember Every Conversation
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-0">
                    Add persistent memory so your agent remembers users, past conversations, and
                    builds context over time.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start space-x-3 bg-white/[0.02] backdrop-blur-sm rounded-lg p-3 border border-solid border-white/10">
                <div className="w-8 h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    MCP: Connect to Everything
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-0">
                    Use Model Context Protocol to connect your agent to GitHub, Slack, databases,
                    and any external system you need.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex items-start space-x-3 bg-white/[0.02] backdrop-blur-sm rounded-lg p-3 border border-solid border-white/10">
                <div className="w-8 h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  5
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    Subagents: Build Agent Teams
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-0">
                    Create specialized agents that work together to handle complex workflows and
                    enterprise use cases.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prerequisites */}
        <div className="relative mb-20">
          <div className="relative border border-solid border-white/10 rounded-2xl p-8 landing-md:p-10 bg-white/[0.02] backdrop-blur-sm to-transparent backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 via-purple-500 to-transparent rounded-l-2xl" />
            <h2 className="text-[21.6px] font-medium text-foreground text-left">
              What You Need to Know
            </h2>
            <p className="text-landing-sm landing-md:text-base text-muted-foreground text-left leading-relaxed">
              This tutorial assumes basic familiarity with:
            </p>

            <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-4 landing-md:gap-6">
              <div className="rounded-lg p-4 landing-md:p-6 border border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm">
                <h3 className="text-[18px] font-medium text-foreground mb-3 landing-md:mb-4">
                  Required
                </h3>
                <div className="space-y-2 landing-md:space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-main-emerald" />
                    <span className="text-landing-sm landing-md:text-base text-muted-foreground">
                      Basic TypeScript/JavaScript
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-main-emerald" />
                    <span className="text-landing-sm landing-md:text-base text-muted-foreground">
                      Node.js and npm
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-main-emerald" />
                    <span className="text-landing-sm landing-md:text-base text-muted-foreground">
                      Understanding of APIs
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4 landing-md:p-6 border border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm">
                <h3 className="text-[18px] font-medium text-foreground mb-3 landing-md:mb-4">
                  Helpful (But Not Required)
                </h3>
                <div className="space-y-2 landing-md:space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 landing-md:w-3 landing-md:h-3 rounded-full bg-muted" />
                    <span className="text-landing-sm landing-md:text-base text-muted-foreground">
                      Experience with AI/LLMs
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 landing-md:w-3 landing-md:h-3 rounded-full bg-muted" />
                    <span className="text-landing-sm landing-md:text-base text-muted-foreground">
                      Database knowledge
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 landing-md:w-3 landing-md:h-3 rounded-full bg-muted" />
                    <span className="text-landing-sm landing-md:text-base text-muted-foreground">
                      DevOps experience
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started - Minimal CTA */}
        <div className="mt-16">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-xl blur opacity-50" />
            <div className="relative bg-emerald-500/5 border border-solid border-emerald-500/20 backdrop-blur-sm rounded-xl p-6 text-center">
              <h3 className="text-[18px] text-emerald-300 font-medium mb-2">
                Ready to Build AI Agents?
              </h3>
              <p className="text-sm text-gray-400 mb-5 max-w-xl mx-auto">
                Transform from chatbot builder to AI agent architect in just 5 tutorials
              </p>
              <Link
                to="/tutorial/chatbot-problem"
                className="inline-flex items-center px-6 py-2.5 bg-emerald-500/10 text-emerald-400 border border-solid border-emerald-500/30 font-medium rounded-lg hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all duration-200 no-underline text-sm"
              >
                Start Tutorial Journey →
              </Link>

              <div className="mt-4 text-xs text-gray-500">
                <span>4 more steps • 15 min • Production-ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Community & Resources - Minimized */}
        <div className="text-center mt-8">
          <div className="flex flex-col landing-md:flex-row gap-2 items-center justify-center text-xs text-muted-foreground">
            <span>Questions?</span>
            <a
              href="https://github.com/voltagent/voltagent"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-muted-foreground hover:text-main-emerald transition-colors no-underline"
            >
              <GitHubLogo className="w-3 h-3 mr-1" />
              GitHub
            </a>
            <span className="text-muted-foreground">•</span>
            <a
              href="https://s.voltagent.dev/discord"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-muted-foreground hover:text-main-emerald transition-colors no-underline"
            >
              <DiscordLogo className="w-3 h-3 mr-1" />
              Discord
            </a>
          </div>
        </div>
      </div>
    </TutorialLayout>
  );
}
