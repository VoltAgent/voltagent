import { useEffect, useState } from "react";

type Feature =
  | "imports"
  | "tool_definition"
  | "tool_meta"
  | "parameters"
  | "execute"
  | "agent"
  | "server";

interface FeatureCard {
  id: Feature;
  title: string;
  description: string;
}

interface MobileToolCodeProps {
  isVisible: boolean;
}

export const MobileToolCode = ({ isVisible }: MobileToolCodeProps) => {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>("tool_definition");
  const [overlayPosition, setOverlayPosition] = useState<{
    top: number;
    height: number;
  } | null>(null);

  // Auto-show overlay for the initial selected feature
  useEffect(() => {
    if (selectedFeature === "tool_definition" && isVisible) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const toolElement = document.querySelector(
          '[data-feature="tool_definition"]',
        ) as HTMLElement;
        if (toolElement) {
          setOverlayPosition({
            top: toolElement.offsetTop,
            height: toolElement.offsetHeight,
          });
        }
      }, 100);
    }
  }, [isVisible, selectedFeature]);

  const features: FeatureCard[] = [
    {
      id: "tool_definition",
      title: "I need to define what the tool does",
      description:
        "createTool is your starting point. Give it a clear name and description so the LLM knows when to use it.",
    },
    {
      id: "tool_meta",
      title: "What should I call it?",
      description:
        "Name and description tell the LLM what this tool does and when to use it. Be descriptive but concise.",
    },
    {
      id: "parameters",
      title: "What inputs does it need?",
      description:
        "Use Zod schemas to define and validate inputs. This gives you type safety and runtime validation.",
    },
    {
      id: "execute",
      title: "What should it actually do?",
      description:
        "The execute function is where the magic happens. Call APIs, query databases, whatever you need.",
    },
    {
      id: "agent",
      title: "How do I give it to my agent?",
      description:
        "Add the tool to your agent's tools array. The agent will automatically understand when to use it.",
    },
  ];

  const handleFeatureClick = (feature: Feature, event: React.MouseEvent<HTMLSpanElement>) => {
    const element = event.currentTarget;

    if (selectedFeature === feature) {
      setSelectedFeature(null);
      setOverlayPosition(null);
    } else {
      setSelectedFeature(feature);
      setOverlayPosition({
        top: element.offsetTop,
        height: element.offsetHeight,
      });
    }
  };

  const getHighlightClasses = (section: Feature) => {
    const baseHighlightClass = "transition-all duration-300 ease-in-out cursor-pointer relative";

    return selectedFeature === section
      ? `bg-gradient-to-r from-emerald-600/40 to-emerald-500/20 border-l-2 border-solid border-t-0 border-r-0 border-b-0 border-emerald-500 pl-2 rounded-sm shadow-lg text-white ${baseHighlightClass}`
      : `text-gray-400 hover:bg-white/5 ${baseHighlightClass} ${
          selectedFeature ? "blur-[1px] opacity-50" : ""
        }`;
  };

  const getBaseCodeClasses = () => {
    return `block text-gray-400 break-words whitespace-pre-wrap transition-all duration-300 ${
      selectedFeature ? "blur-[1px] opacity-50" : ""
    }`;
  };

  if (!isVisible) return null;

  return (
    <div className="flex flex-col w-full mt-8">
      {/* Code Block */}
      <div className="w-full border border-solid border-white/10 rounded-lg bg-gray-900/50">
        <pre className="text-left bg-transparent p-0 text-[11px] md:text-sm font-mono m-0 w-full overflow-x-hidden">
          <div className="flex w-full">
            <div className="py-5 px-2 text-right text-gray-500 select-none border-r border-gray-500/30 min-w-[40px] text-[10px]">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                <div key={num} className="leading-6">
                  {num}
                </div>
              ))}
            </div>
            <code className="py-5 px-2 sm:px-3 block text-[11px] relative w-full overflow-x-auto">
              {/* Imports */}
              <span className={getBaseCodeClasses()}>
                <span className="text-blue-400">import</span>
                <span>
                  {" "}
                  {"{"} VoltAgent, Agent, createTool {"}"}{" "}
                </span>
                <span className="text-blue-400">from</span>
                <span className="text-yellow-300"> "@voltagent/core"</span>
                <span>;</span>
                <br />

                <span className="text-blue-400">import</span>
                <span>
                  {" "}
                  {"{"} openai {"}"}{" "}
                </span>
                <span className="text-blue-400">from</span>
                <span className="text-yellow-300"> "@ai-sdk/openai"</span>
                <span>;</span>
                <br />
                <span className="text-blue-400">import</span>
                <span>
                  {" "}
                  {"{"} z {"}"}{" "}
                </span>
                <span className="text-blue-400">from</span>
                <span className="text-yellow-300"> "zod"</span>
                <span>;</span>
                <br />
                <br />
              </span>

              {/* Tool Definition */}
              <span
                data-feature="tool_definition"
                className={`block ${getHighlightClasses(
                  "tool_definition",
                )} break-words whitespace-pre-wrap`}
                onClick={(e) => handleFeatureClick("tool_definition", e)}
              >
                <span className="text-blue-400">const</span>
                <span> getWeatherTool = </span>
                <span className="text-green-400">createTool</span>
                <span>{"({"}</span>
                <br />
              </span>

              {/* Tool Name & Description */}
              <span
                className={`block ${getHighlightClasses(
                  "tool_meta",
                )} break-words whitespace-pre-wrap`}
                onClick={(e) => handleFeatureClick("tool_meta", e)}
              >
                <span className="ml-4">name: </span>
                <span className="text-yellow-300">"get_weather"</span>
                <span>,</span>
                <br />
                <span className="ml-4">description: </span>
                <span className="text-yellow-300">"Get current weather for any city"</span>
                <span>,</span>
                <br />
              </span>

              {/* Parameters */}
              <span
                className={`block ${getHighlightClasses(
                  "parameters",
                )} break-words whitespace-pre-wrap`}
                onClick={(e) => handleFeatureClick("parameters", e)}
              >
                <span className="ml-4">parameters: </span>
                <span className="text-green-400">z</span>
                <span>.object({"{"}</span>
                <br />
                <span className="ml-8">location: </span>
                <span className="text-green-400">z</span>
                <span>.string().describe(</span>
                <span className="text-yellow-300">"City and state, e.g. New York, NY"</span>
                <span>),</span>
                <br />
                <span className="ml-4">{"}),"}</span>
                <br />
              </span>

              {/* Execute Function */}
              <span
                className={`block ${getHighlightClasses(
                  "execute",
                )} break-words whitespace-pre-wrap`}
                onClick={(e) => handleFeatureClick("execute", e)}
              >
                <span className="ml-4">execute: </span>
                <span className="text-blue-400">async</span>
                <span>
                  {" "}
                  ({"{"} location {"}"}) =&gt; {"{"}
                </span>
                <br />
                <span className="ml-8 text-gray-300">
                  {"// In production, you'd call a real weather API"}
                </span>
                <br />
                <span className="ml-8">console.log(</span>
                <span className="text-yellow-300">"Getting weather for "</span>
                <span> + location + </span>
                <span className="text-yellow-300">"..."</span>
                <span>);</span>
                <br />
                <span className="ml-8 text-gray-300">{"// Simple demo logic"}</span>
                <br />
                <span className="ml-8">
                  <span className="text-blue-400">if</span>
                  <span> (location.toLowerCase().includes(</span>
                  <span className="text-yellow-300">"new york"</span>
                  <span>)) {"{"}</span>
                </span>
                <br />
                <span className="ml-12">
                  <span className="text-blue-400">return</span>
                  <span> {"{"} temperature: </span>
                  <span className="text-yellow-300">"18°C"</span>
                  <span>, condition: </span>
                  <span className="text-yellow-300">"Partly cloudy"</span>
                  <span> {"}"};</span>
                </span>
                <br />
                <span className="ml-8">{"}"}</span>
                <br />
                <span className="ml-8">
                  <span className="text-blue-400">return</span>
                  <span> {"{"} temperature: </span>
                  <span className="text-yellow-300">"24°C"</span>
                  <span>, condition: </span>
                  <span className="text-yellow-300">"Sunny"</span>
                  <span> {"}"};</span>
                </span>
                <br />
                <span className="ml-4">{"}"}</span>
                <br />
                <span>{"});"}</span>
                <br />
                <br />
              </span>

              {/* Agent Creation */}
              <span
                className={`block ${getHighlightClasses("agent")} break-words whitespace-pre-wrap`}
                onClick={(e) => handleFeatureClick("agent", e)}
              >
                <span className="text-blue-400">const</span>
                <span> agent = </span>
                <span className="text-blue-400">new</span>
                <span className="text-green-400"> Agent</span>
                <span>{"({"}</span>
                <br />
                <span className="ml-4">name: </span>
                <span className="text-yellow-300">"my-agent"</span>
                <span>,</span>
                <br />
                <span className="ml-4">instructions: </span>
                <span className="text-yellow-300">
                  "A helpful assistant that can check weather"
                </span>
                <span>,</span>
                <br />

                <span className="ml-4">model: </span>
                <span className="text-green-400">openai</span>
                <span>(</span>
                <span className="text-yellow-300">"gpt-4o-mini"</span>
                <span>),</span>
                <br />
                <span className="ml-4">tools: [getWeatherTool],</span>
                <br />
                <span>{"});"}</span>
                <br />
                <br />
              </span>

              {/* Server Setup */}
              <span className={getBaseCodeClasses()}>
                <span className="text-blue-400">new</span>
                <span className="text-green-400"> VoltAgent</span>
                <span>{"({"}</span>
                <br />
                <span className="ml-4">
                  agents: {"{"} agent {"}"},
                </span>
                <br />
                <span>{"});"}</span>
              </span>

              {/* Feature Info Overlay */}
              {selectedFeature && overlayPosition && (
                <div
                  className="absolute font-[Inter] left-0 bg-gray-900/95 backdrop-blur-sm w-full rounded-lg transition-all duration-300 shadow-lg border border-solid border-emerald-500/20"
                  style={{
                    top: overlayPosition.top + overlayPosition.height + 4,
                  }}
                >
                  {/* Pointer */}
                  <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-gray-900/95 z-10" />
                  {/* Pointer border */}
                  <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[7px] border-b-white/10" />

                  <div className="p-2.5">
                    <div className="space-y-1 overflow-hidden">
                      <div className="text-[13px] font-medium text-emerald-500 whitespace-normal overflow-wrap-normal">
                        {features.find((f) => f.id === selectedFeature)?.title}
                      </div>
                      <p className="text-[11px] leading-[16px] text-white/70 whitespace-normal overflow-wrap-normal">
                        {features.find((f) => f.id === selectedFeature)?.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </code>
          </div>
        </pre>
      </div>

      {/* The Result - Mobile */}
      <div className="mt-6">
        <h4 className="text-emerald-500 font-semibold mb-2 text-sm">The Magic</h4>
        <p className="text-gray-300 mb-0 text-xs">
          Your agent now <strong>takes action</strong> instead of giving advice. It calls your{" "}
          <span className="text-emerald-500 font-mono text-xs">get_weather</span> function
          automatically and provides real data. This is the power of tools.
        </p>
      </div>
    </div>
  );
};
