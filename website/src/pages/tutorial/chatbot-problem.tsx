import { ColorModeProvider } from "@docusaurus/theme-common/internal";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import CodeBlock from "@theme/CodeBlock";
import type React from "react";
import { useState } from "react";
import { MobileToolCode } from "../../components/tutorial";
import { TutorialLayout } from "../../components/tutorial/TutorialLayout";

export default function ChatbotProblemTutorial() {
  const [highlightedSection, setHighlightedSection] = useState<string | null>("tool_definition");
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
      currentStep={2}
      totalSteps={5}
      stepTitle="The Chatbot Problem: Why Basic Agents Are Useless"
      stepDescription="Understanding the limitations of basic agents and why they need tools"
      prevStepUrl="/tutorial/introduction"
      nextStepUrl="/tutorial/memory"
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
                    src="https://www.youtube.com/embed/QVLUGG2ZhTI"
                    title="VoltAgent Chatbot Problem Tutorial - Why Basic Agents Are Useless"
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

        {/* The Problem */}
        <div className="relative mb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 rounded-3xl blur-3xl -z-10" />

          <div className="relative border border-solid border-white/10 rounded-2xl p-8 landing-md:p-10 bg-white/[0.02] backdrop-blur-sm to-transparent backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 via-orange-500 to-transparent rounded-l-2xl" />

            <h2 className="text-[21.6px] font-medium text-foreground mb-3">
              Why Most Chatbots Fail
            </h2>
            <p className="text-sm landing-md:text-base text-muted-foreground leading-relaxed mb-8">
              You've probably interacted with dozens of chatbots. Most of them are frustrating,
              limited, and feel like talking to a very sophisticated answering machine. Here's why:
            </p>

            <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-4 landing-md:gap-6">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-300" />
                <div className="relative border border-solid border-red-500/20 bg-red-500/[0.03] backdrop-blur-sm rounded-xl p-4 landing-md:p-6 hover:border-red-500/30 transition-colors">
                  <h3 className="text-[20px] font-medium text-red-300 mb-3 landing-md:mb-4">
                    Traditional Chatbots
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-400 mt-1" />
                      <span className="text-sm landing-md:text-base text-muted-foreground">
                        Pre-scripted responses only
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-400 mt-1" />
                      <span className="text-sm landing-md:text-base text-muted-foreground">
                        Can't perform real actions
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-400 mt-1" />
                      <span className="text-sm landing-md:text-base text-muted-foreground">
                        No memory between conversations
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-400 mt-1" />
                      <span className="text-sm landing-md:text-base text-muted-foreground">
                        Break with unexpected inputs
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-300" />
                <div className="relative border border-solid border-emerald-500/20 bg-emerald-500/[0.03] backdrop-blur-sm rounded-xl p-4 landing-md:p-6 hover:border-emerald-500/30 transition-colors">
                  <h3 className="text-[20px] font-medium text-emerald-300 mb-3 landing-md:mb-4">
                    AI Agents
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-400 mt-1" />
                      <span className="text-sm landing-md:text-base text-muted-foreground">
                        Understand context and intent
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-400 mt-1" />
                      <span className="text-sm landing-md:text-base text-muted-foreground">
                        Use tools to take real actions
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-400 mt-1" />
                      <span className="text-sm landing-md:text-base text-muted-foreground">
                        Remember and learn from interactions
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-400 mt-1" />
                      <span className="text-sm landing-md:text-base text-muted-foreground">
                        Handle complex, multi-step tasks
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real World Example */}
        <div className="relative mb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-yellow-500/5 rounded-3xl blur-3xl -z-10" />

          <div className="relative border border-solid border-white/10 rounded-2xl p-8 landing-md:p-10 bg-white/[0.02] backdrop-blur-sm to-transparent backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 via-yellow-500 to-transparent rounded-l-2xl" />

            <h2 className="text-[21.6px] font-medium text-foreground mb-3">
              Real-World Example: Customer Support
            </h2>
            <p className="text-sm landing-md:text-base text-muted-foreground leading-relaxed mb-8">
              Let's see the difference in action. Imagine a customer needs help with a billing
              issue:
            </p>

            {/* Table-like structure */}
            <div className="border border-solid border-white/10 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-2 border-b border-solid border-white/10">
                <div className="p-3 landing-md:p-4 bg-white/[0.02] border-r border-b-0  border-t-0 border-l-0 border-solid border-white/10">
                  <h4 className="text-gray-300 font-medium text-sm mb-0 landing-md:text-base">
                    What Users Want
                  </h4>
                </div>
                <div className="p-3 landing-md:p-4 bg-red-500/[0.02]">
                  <h4 className="text-red-300 font-medium mb-0 text-sm landing-md:text-base">
                    What Your Agent Says
                  </h4>
                </div>
              </div>

              {/* Table Rows */}
              <div className="grid grid-cols-2">
                <div className="p-3 landing-md:p-4 border-r border-solid border-white/10 space-y-2">
                  <div className="text-muted-foreground text-xs landing-md:text-sm">
                    "Book a meeting room for 3pm"
                  </div>
                  <div className="text-muted-foreground text-xs landing-md:text-sm">
                    "Check our website's status"
                  </div>
                  <div className="text-muted-foreground text-xs landing-md:text-sm">
                    "Generate a sales report"
                  </div>
                  <div className="text-muted-foreground text-xs landing-md:text-sm">
                    "Order lunch for the team"
                  </div>
                  <div className="text-muted-foreground text-xs landing-md:text-sm">
                    "Deploy the new feature"
                  </div>
                </div>
                <div className="p-3 landing-md:p-4 bg-red-500/[0.02] space-y-2">
                  <div className="text-muted-foreground text-xs landing-md:text-sm">
                    "I can't book rooms, but here's how..."
                  </div>
                  <div className="text-muted-foreground text-xs landing-md:text-sm">
                    "I can't check websites, but you should..."
                  </div>
                  <div className="text-muted-foreground text-xs landing-md:text-sm">
                    "I can't generate reports, but try..."
                  </div>
                  <div className="text-muted-foreground text-xs landing-md:text-sm">
                    "I can't order food, but here are some..."
                  </div>
                  <div className="text-muted-foreground text-xs landing-md:text-sm">
                    "I can't deploy code, but the process is..."
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 border border-solid border-orange-500/20 bg-orange-500/[0.02] backdrop-blur-sm rounded-lg p-3 landing-md:p-4">
              <h4 className="text-orange-300 font-medium mb-2 text-sm landing-md:text-base">
                The Reality Check
              </h4>
              <p className="text-xs landing-md:text-sm text-muted-foreground mb-0">
                After a week, users stop using your "AI assistant" because it's just a fancy search
                engine that can't actually assist with anything. Sound familiar?
              </p>
            </div>
          </div>
        </div>

        {/* The Solution: Interactive Code Example */}
        <div className="relative mb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 rounded-3xl blur-3xl -z-10" />

          <div className="relative border border-solid border-white/10 rounded-2xl p-8 landing-md:p-10 bg-white/[0.02] backdrop-blur-sm to-transparent backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 via-cyan-500 to-transparent rounded-l-2xl" />

            <h2 className="text-[21.6px] font-medium text-foreground mb-3">
              The Solution: Give Your Agent Tools
            </h2>
            <p className="text-sm landing-md:text-base text-muted-foreground leading-relaxed mb-8">
              Let's fix your useless chatbot by adding a real tool. Hover over the explanations to
              see how each part works.
            </p>

            {/* Interactive Code Section - Wider Container */}
            <div className="max-w-7xl mx-auto">
              {isMobile ? (
                <MobileToolCode isVisible={true} />
              ) : (
                <div className="flex items-center justify-between gap-8">
                  {/* Code Section - Left Side */}
                  <div className="w-[55%] border border-solid border-[#30363d] rounded-lg bg-[#010409]">
                    <pre className="text-left h-full bg-transparent p-0 text-xs md:text-sm font-mono m-0">
                      <div className="flex">
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
                          <div>21</div>
                          <div>22</div>
                          <div>23</div>
                          <div>24</div>
                          <div>25</div>
                          <div>26</div>
                          <div>27</div>
                          <div>28</div>
                          <div>29</div>
                          <div>30</div>
                        </div>
                        <code className="py-5 px-3 block text-xs text-[#e6edf3]">
                          {/* Imports */}
                          <span className={`block ${getHighlightClasses("imports")}`}>
                            <span className="text-[#ff7b72]">import</span>
                            <span className="text-[#e6edf3]">
                              {" "}
                              {"{"} VoltAgent, Agent, createTool {"}"}{" "}
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
                            <span className="text-[#ff7b72]">import</span>
                            <span className="text-[#e6edf3]">
                              {" "}
                              {"{"} z {"}"}{" "}
                            </span>
                            <span className="text-[#ff7b72]">from</span>
                            <span className="text-[#a5d6ff]"> "zod"</span>
                            <span className="text-[#e6edf3]">;</span>
                            <br />
                            <br />
                          </span>

                          {/* Tool Definition */}
                          <span className={`block ${getHighlightClasses("tool_definition")}`}>
                            <span className="text-[#ff7b72]">const</span>
                            <span> getWeatherTool = </span>
                            <span className="text-[#d2a8ff]">createTool</span>
                            <span>{"({"}</span>
                            <br />
                          </span>

                          {/* Tool Name & Description */}
                          <span className={`block ${getHighlightClasses("tool_meta")}`}>
                            <span className="ml-4">name: </span>
                            <span className="text-[#a5d6ff]">"get_weather"</span>
                            <span>,</span>
                            <br />
                            <span className="ml-4">description: </span>
                            <span className="text-[#a5d6ff]">
                              "Get current weather for any city"
                            </span>
                            <span>,</span>
                            <br />
                          </span>

                          {/* Parameters */}
                          <span className={`block ${getHighlightClasses("parameters")}`}>
                            <span className="ml-4">parameters: </span>
                            <span className="text-[#d2a8ff]">z</span>
                            <span>.object({"{"}</span>
                            <br />
                            <span className="ml-8">location: </span>
                            <span className="text-[#d2a8ff]">z</span>
                            <span>.string().describe(</span>
                            <span className="text-[#a5d6ff]">
                              "City and state, e.g. New York, NY"
                            </span>
                            <span>),</span>
                            <br />
                            <span className="ml-4">{"}),"}</span>
                            <br />
                          </span>

                          {/* Execute Function */}
                          <span className={`block ${getHighlightClasses("execute")}`}>
                            <span className="ml-4">execute: </span>
                            <span className="text-[#ff7b72]">async</span>
                            <span>
                              {" "}
                              ({"{"} location {"}"}) =&gt; {"{"}
                            </span>
                            <br />
                            <span className="ml-8 text-[#8b949e]">
                              {"// In production, you'd call a real weather API"}
                            </span>
                            <br />
                            <span className="ml-8">console.log(</span>
                            <span className="text-[#a5d6ff]">"Getting weather for "</span>
                            <span> + location + </span>
                            <span className="text-[#a5d6ff]">"..."</span>
                            <span>);</span>
                            <br />
                            <span className="ml-8 text-[#8b949e]">{"// Simple demo logic"}</span>
                            <br />
                            <span className="ml-8">
                              <span className="text-[#ff7b72]">if</span>
                              <span> (location.toLowerCase().includes(</span>
                              <span className="text-[#a5d6ff]">"new york"</span>
                              <span>)) {"{"}</span>
                            </span>
                            <br />
                            <span className="ml-12">
                              <span className="text-[#ff7b72]">return</span>
                              <span> {"{"} temperature: </span>
                              <span className="text-[#a5d6ff]">"18°C"</span>
                              <span>, condition: </span>
                              <span className="text-[#a5d6ff]">"Partly cloudy"</span>
                              <span> {"}"};</span>
                            </span>
                            <br />
                            <span className="ml-8">{"}"}</span>
                            <br />
                            <span className="ml-8">
                              <span className="text-[#ff7b72]">return</span>
                              <span> {"{"} temperature: </span>
                              <span className="text-[#a5d6ff]">"24°C"</span>
                              <span>, condition: </span>
                              <span className="text-[#a5d6ff]">"Sunny"</span>
                              <span> {"}"};</span>
                            </span>
                            <br />
                            <span className="ml-4">{"}"}</span>
                            <br />
                          </span>

                          <span className={`block ${getHighlightClasses("tool_definition")}`}>
                            <span>{"});"}</span>
                            <br />
                            <br />
                          </span>

                          {/* Agent Creation */}
                          <span className={`block ${getHighlightClasses("agent")}`}>
                            <span className="text-[#ff7b72]">const</span>
                            <span> agent = </span>
                            <span className="text-[#ff7b72]">new</span>
                            <span className="text-[#d2a8ff]"> Agent</span>
                            <span>{"({"}</span>
                            <br />
                            <span className="ml-4">name: </span>
                            <span className="text-[#a5d6ff]">"my-agent"</span>
                            <span>,</span>
                            <br />
                            <span className="ml-4">instructions: </span>
                            <span className="text-[#a5d6ff]">
                              "A helpful assistant that can check weather"
                            </span>
                            <span>,</span>
                            <br />
                            <span className="ml-4">llm: </span>
                            <span className="text-[#ff7b72]">new</span>

                            <span>(),</span>
                            <br />
                            <span className="ml-4">model: </span>
                            <span className="text-[#d2a8ff]">openai</span>
                            <span>(</span>
                            <span className="text-[#a5d6ff]">"gpt-4o-mini"</span>
                            <span>),</span>
                            <br />
                            <span className="ml-4">tools: [getWeatherTool],</span>
                            <br />
                            <span>{"});"}</span>
                            <br />
                            <br />
                          </span>

                          {/* Server Setup */}
                          <span className={`block ${getHighlightClasses("server")}`}>
                            <span className="text-[#ff7b72]">new</span>
                            <span className="text-[#d2a8ff]"> VoltAgent</span>
                            <span>{"({"}</span>
                            <br />
                            <span className="ml-4">
                              agents: {"{"} agent {"}"},
                            </span>
                            <br />
                            <span>{"});"}</span>
                          </span>
                        </code>
                      </div>
                    </pre>
                  </div>

                  {/* Explanation Cards - Right Side */}
                  <div className="flex w-[45%] flex-col gap-4">
                    {/* Card 1 - Tool Definition */}
                    <div className="relative h-full">
                      {/* biome-ignore lint/a11y/useKeyWithClickEvents: ignore */}
                      <div
                        className={`h-[100px] p-3 rounded-lg ${
                          highlightedSection === "tool_definition"
                            ? "border-1 border-solid border-emerald-400 bg-white/10"
                            : "border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm/30 hover:bg-white/5"
                        } flex flex-col cursor-pointer transition-all duration-300`}
                        onMouseEnter={() => handleMouseEnter("tool_definition")}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleClick("tool_definition")}
                      >
                        <div
                          className={`text-base font-semibold mb-3 ${
                            highlightedSection === "tool_definition"
                              ? "text-emerald-500"
                              : "text-foreground"
                          }`}
                        >
                          "I need to define what the tool does"
                        </div>
                        <div className="text-muted-foreground text-xs leading-relaxed">
                          createTool is your starting point. Give it a clear name and description so
                          the LLM knows when to use it.
                        </div>
                      </div>
                    </div>

                    {/* Card 2 - Tool Meta */}
                    <div className="relative h-full">
                      {/* biome-ignore lint/a11y/useKeyWithClickEvents: ignore */}
                      <div
                        className={`h-[100px] p-3 rounded-lg ${
                          highlightedSection === "tool_meta"
                            ? "border-1 border-solid border-emerald-400 bg-white/10"
                            : "border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm/30 hover:bg-white/5"
                        } flex flex-col cursor-pointer transition-all duration-300`}
                        onMouseEnter={() => handleMouseEnter("tool_meta")}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleClick("tool_meta")}
                      >
                        <div
                          className={`text-base font-semibold mb-3 ${
                            highlightedSection === "tool_meta"
                              ? "text-emerald-500"
                              : "text-foreground"
                          }`}
                        >
                          "What should I call it?"
                        </div>
                        <div className="text-muted-foreground text-xs leading-relaxed">
                          Name and description tell the LLM what this tool does and when to use it.
                          Be descriptive but concise.
                        </div>
                      </div>
                    </div>

                    {/* Card 3 - Parameters */}
                    <div className="relative h-full">
                      {/* biome-ignore lint/a11y/useKeyWithClickEvents: ignore */}
                      <div
                        className={`h-[100px] p-3 rounded-lg ${
                          highlightedSection === "parameters"
                            ? "border-1 border-solid border-emerald-400 bg-white/10"
                            : "border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm/30 hover:bg-white/5"
                        } flex flex-col cursor-pointer transition-all duration-300`}
                        onMouseEnter={() => handleMouseEnter("parameters")}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleClick("parameters")}
                      >
                        <div
                          className={`text-base font-semibold mb-3 ${
                            highlightedSection === "parameters"
                              ? "text-emerald-500"
                              : "text-foreground"
                          }`}
                        >
                          "What inputs does it need?"
                        </div>
                        <div className="text-muted-foreground text-xs leading-relaxed">
                          Use Zod schemas to define and validate inputs. This gives you type safety
                          and runtime validation.
                        </div>
                      </div>
                    </div>

                    {/* Card 4 - Execute */}
                    <div className="relative h-full">
                      {/* biome-ignore lint/a11y/useKeyWithClickEvents: ignore */}
                      <div
                        className={`h-[100px] p-3 rounded-lg ${
                          highlightedSection === "execute"
                            ? "border-1 border-solid border-emerald-400 bg-white/10"
                            : "border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm/30 hover:bg-white/5"
                        } flex flex-col cursor-pointer transition-all duration-300`}
                        onMouseEnter={() => handleMouseEnter("execute")}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleClick("execute")}
                      >
                        <div
                          className={`text-base font-semibold mb-3 ${
                            highlightedSection === "execute"
                              ? "text-emerald-500"
                              : "text-foreground"
                          }`}
                        >
                          "What should it actually do?"
                        </div>
                        <div className="text-muted-foreground text-xs leading-relaxed">
                          The execute function is where the magic happens. Call APIs, query
                          databases, whatever you need.
                        </div>
                      </div>
                    </div>

                    {/* Card 5 - Agent */}
                    <div className="relative h-full">
                      {/* biome-ignore lint/a11y/useKeyWithClickEvents: ignore */}
                      <div
                        className={`h-[100px] p-3 rounded-lg ${
                          highlightedSection === "agent"
                            ? "border-1 border-solid border-emerald-400 bg-white/10"
                            : "border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm/30 hover:bg-white/5"
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
                          "How do I give it to my agent?"
                        </div>
                        <div className="text-muted-foreground text-xs leading-relaxed">
                          Add the tool to your agent's tools array. The agent will automatically
                          understand when to use it.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!isMobile && (
              <div className="mt-8">
                <h4 className="text-emerald-500 font-semibold mb-2 text-sm landing-md:text-base">
                  The Magic
                </h4>
                <p className="text-muted-foreground mb-0 text-xs landing-md:text-base">
                  Your agent now <strong>takes action</strong> instead of giving advice. It calls
                  your{" "}
                  <code className="text-emerald-500 font-mono text-xs landing-md:text-base">
                    get_weather
                  </code>{" "}
                  function automatically and provides real data. This is the power of tools.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Testing in VoltOps */}
        <div className="relative mb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 rounded-3xl blur-3xl -z-10" />

          <div className="relative border border-solid border-white/10 rounded-2xl p-8 landing-md:p-10 bg-white/[0.02] backdrop-blur-sm to-transparent backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 via-blue-500 to-transparent rounded-l-2xl" />

            <h2 className="text-[21.6px] font-medium text-foreground mb-3">
              Testing in VoltOps Console
            </h2>
            <p className="text-sm landing-md:text-base text-muted-foreground leading-relaxed mb-8">
              Now let's test your tool-powered agent in the VoltOps console.
            </p>

            <div className=" ">
              <h3 className="text-[20px] font-medium text-main-emerald mb-4">
                Step-by-Step Testing
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 landing-md:space-x-4">
                  <div className="flex-shrink-0 w-7 h-7 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center">
                    <span className=" font-bold text-xs landing-md:text-sm">1</span>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0 pt-1 text-xs landing-md:text-base">
                      Update your code with the tool (above) and save the file
                    </p>
                    <p className="text-muted-foreground text-xs mb-0 landing-md:text-sm">
                      Your agent will automatically reload with the new tool
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 landing-md:space-x-4">
                  <div className="flex-shrink-0 w-7 h-7 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center">
                    <span className=" font-bold text-xs landing-md:text-base">2</span>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0 pt-1 text-xs landing-md:text-base">
                      Go back to VoltOps Console:
                    </p>
                    <a
                      href="https://console.voltagent.dev"
                      target="_blank"
                      rel="noreferrer"
                      className="text-main-emerald hover:underline text-xs landing-md:text-base"
                    >
                      console.voltagent.dev
                    </a>
                  </div>
                </div>
                <div className="flex items-start space-x-3 landing-md:space-x-4">
                  <div className="flex-shrink-0 w-7 h-7 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center">
                    <span className=" font-bold text-xs landing-md:text-base">3</span>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0 pt-1 text-xs landing-md:text-base">
                      Try these inputs to see your tool in action:
                    </p>
                    <div className="space-y-2 my-2">
                      <CodeBlock language="text">What's the weather in New York?</CodeBlock>
                      <CodeBlock language="text">Check weather in San Francisco</CodeBlock>
                      <CodeBlock language="text">Is it sunny in Tokyo?</CodeBlock>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Demo GIF */}
            <div className="  mt-20 ">
              <h3 className="text-[21.6px] font-medium text-foreground mb-3 landing-md:mb-4">
                See Your Tool in Action
              </h3>
              <p className="text-muted-foreground mb-3 landing-md:mb-4 text-xs landing-md:text-base">
                This is what happens when you ask your agent about weather:
              </p>
              <div className="rounded-lg overflow-hidden border border-white/10 bg-white/[0.02] backdrop-blur-sm">
                <img
                  src="https://cdn.voltagent.dev/docs/tutorial/voltops-tool-demo.gif"
                  alt="VoltAgent Tool Demo - Weather tool in action"
                  className="w-full h-auto"
                />
              </div>
              <p className="text-muted-foreground text-xs landing-md:text-sm mt-2 landing-md:mt-3 text-center">
                Your agent now executes tools automatically and provides real data
              </p>
            </div>

            <div className=" ">
              <h4 className="text-emerald-400 font-semibold mb-2 text-sm landing-md:text-base">
                Debug & Monitor
              </h4>
              <p className="text-muted-foreground mb-3 text-xs landing-md:text-base">
                In the VoltOps console, you'll see:
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-start space-x-2 landing-md:space-x-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                  <span className="text-muted-foreground text-xs landing-md:text-base">
                    Tool execution logs
                  </span>
                </div>
                <div className="flex items-start space-x-2 landing-md:space-x-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                  <span className="text-muted-foreground text-xs landing-md:text-base">
                    Agent reasoning process
                  </span>
                </div>
                <div className="flex items-start space-x-2 landing-md:space-x-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                  <span className="text-muted-foreground text-xs landing-md:text-base">
                    Response time metrics
                  </span>
                </div>
                <div className="flex items-start space-x-2 landing-md:space-x-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                  <span className="text-muted-foreground text-xs landing-md:text-base">
                    Error tracking
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Transformation */}
        <div className="relative mb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-purple-500/5 rounded-3xl blur-3xl -z-10" />

          <div className="relative border border-solid border-white/10 rounded-2xl p-8 landing-md:p-10 bg-white/[0.02] backdrop-blur-sm to-transparent backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pink-500 via-purple-500 to-transparent rounded-l-2xl" />

            <h2 className="text-[21.6px] font-medium text-foreground mb-3">
              The Transformation: From Chatbot to Agent
            </h2>
            <p className="text-sm landing-md:text-base text-muted-foreground leading-relaxed mb-8">
              Watch how your agent's behavior completely changes with just one tool.
            </p>

            <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-3">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-300" />
                <div className="relative border border-solid border-red-500/20 bg-red-500/[0.03] backdrop-blur-sm rounded-xl p-4 hover:border-red-500/30 transition-colors">
                  <h3 className="text-[18px] font-medium text-red-300 mb-3">
                    Before (Useless Chatbot)
                  </h3>
                  <div className="space-y-2">
                    <div className="bg-black/30 rounded p-2.5">
                      <div className="text-gray-400 text-xs font-medium mb-1">User:</div>
                      <div className="text-gray-300 text-xs">"What's the weather in NYC?"</div>
                    </div>
                    <div className="bg-black/30 rounded p-2.5">
                      <div className="text-gray-400 text-xs font-medium mb-1">Agent:</div>
                      <div className="text-red-300 text-xs leading-relaxed">
                        "I can't check current weather data. Try checking weather.com or your local
                        weather app."
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-300" />
                <div className="relative border border-solid border-emerald-500/20 bg-emerald-500/[0.03] backdrop-blur-sm rounded-xl p-4 hover:border-emerald-500/30 transition-colors">
                  <h3 className="text-[18px] font-medium text-emerald-300 mb-3">
                    After (Real Agent)
                  </h3>
                  <div className="space-y-2">
                    <div className="bg-black/30 rounded p-2.5">
                      <div className="text-gray-400 text-xs font-medium mb-1">User:</div>
                      <div className="text-gray-300 text-xs">"What's the weather in NYC?"</div>
                    </div>
                    <div className="bg-black/30 rounded p-2.5">
                      <div className="text-gray-400 text-xs font-medium mb-1">Agent:</div>
                      <div className="text-emerald-300 text-xs leading-relaxed">
                        "Let me check that for you... The current weather in New York is 18°C with
                        partly cloudy conditions."
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className=" ">
              <h4 className="text-main-emerald mt-8 font-semibold mb-2 text-sm landing-md:text-base">
                The Magic
              </h4>
              <p className="text-muted-foreground mb-0 text-xs landing-md:text-base leading-relaxed">
                Your agent now <strong>takes action</strong> instead of giving advice. It calls your{" "}
                <code className="text-main-emerald font-mono text-xs landing-md:text-base">
                  get_weather
                </code>{" "}
                function automatically and provides real data. This is the power of tools.
              </p>
            </div>
          </div>
        </div>
      </div>
    </TutorialLayout>
  );
}
