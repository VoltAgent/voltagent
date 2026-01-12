import { useEffect, useState } from "react";

type Feature = "imports" | "agent" | "name" | "behavior" | "model" | "server";

interface FeatureCard {
  id: Feature;
  title: string;
  description: string;
}

interface MobileAgentCodeProps {
  isVisible: boolean;
}

export const MobileAgentCode = ({ isVisible }: MobileAgentCodeProps) => {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>("agent");
  const [overlayPosition, setOverlayPosition] = useState<{
    top: number;
    height: number;
  } | null>(null);

  // Auto-show overlay for the initial selected feature
  useEffect(() => {
    if (selectedFeature === "agent" && isVisible) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const agentElement = document.querySelector('[data-feature="agent"]') as HTMLElement;
        if (agentElement) {
          setOverlayPosition({
            top: agentElement.offsetTop,
            height: agentElement.offsetHeight,
          });
        }
      }, 100);
    }
  }, [isVisible, selectedFeature]);

  const features: FeatureCard[] = [
    {
      id: "agent",
      title: "I need an AI agent",
      description:
        "The Agent class is your AI's personality container. It defines who your AI is and how it should behave.",
    },
    {
      id: "name",
      title: "What to call it?",
      description:
        "Give it a descriptive name. Think of it like naming a function - choose something that tells you what this agent does.",
    },
    {
      id: "behavior",
      title: "How should it behave?",
      description:
        "Instructions are like giving directions to a colleague. Be specific about personality, tone, and behavior.",
    },
    {
      id: "model",
      title: "Which AI to use?",
      description:
        "Choose your AI model like a database. gpt-4o-mini is fast and cheap, gpt-4 is more powerful for complex reasoning.",
    },
    {
      id: "server",
      title: "How to make it accessible?",
      description:
        "VoltAgent is your server - like Express.js but for AI agents. Handles HTTP, WebSocket, and connects to VoltOps.",
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
      ? `bg-gradient-to-r from-blue-600/40 to-blue-500/20 border-l-2 border-solid border-t-0 border-r-0 border-b-0 border-blue-500 pl-2 rounded-sm shadow-lg text-white ${baseHighlightClass}`
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
              {Array.from({ length: 15 }, (_, i) => i + 1).map((num) => (
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
                  {"{"} VoltAgent, Agent {"}"}{" "}
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
                <br />
              </span>

              {/* Agent Creation */}
              <span
                data-feature="agent"
                className={`block ${getHighlightClasses("agent")} break-words whitespace-pre-wrap`}
                onClick={(e) => handleFeatureClick("agent", e)}
              >
                <span className="text-gray-300">{"// Create your first agent"}</span>
                <br />
                <span className="text-blue-400">const</span>
                <span> myFirstAgent = </span>
                <span className="text-blue-400">new</span>
                <span className="text-green-400"> Agent</span>
                <span>{"({"}</span>
                <br />
              </span>

              {/* Agent Name */}
              <span
                className={`block ${getHighlightClasses("name")} break-words whitespace-pre-wrap`}
                onClick={(e) => handleFeatureClick("name", e)}
              >
                <span className="ml-4">name: </span>
                <span className="text-yellow-300">"my-agent"</span>
                <span>,</span>
                <br />
              </span>

              {/* Agent Description & Instructions */}
              <span
                className={`block ${getHighlightClasses(
                  "behavior",
                )} break-words whitespace-pre-wrap`}
                onClick={(e) => handleFeatureClick("behavior", e)}
              >
                <span className="ml-4">description: </span>
                <span className="text-yellow-300">"A simple agent that introduces itself"</span>
                <span>,</span>
                <br />
              </span>

              {/* Model Selection */}
              <span
                className={`block ${getHighlightClasses("model")} break-words whitespace-pre-wrap`}
                onClick={(e) => handleFeatureClick("model", e)}
              >
                <span className="ml-4">model: </span>
                <span className="text-green-400">openai</span>
                <span>(</span>
                <span className="text-yellow-300">"gpt-4o-mini"</span>
                <span>),</span>
                <br />
                <span className="ml-4">instructions: </span>
                <span className="text-yellow-300">
                  "You are a friendly assistant. Always greet users warmly."
                </span>
                <br />
                <span>{"});"}</span>
                <br />
                <br />
              </span>

              {/* Server Setup */}
              <span
                className={`block ${getHighlightClasses("server")} break-words whitespace-pre-wrap`}
                onClick={(e) => handleFeatureClick("server", e)}
              >
                <span className="text-gray-300">{"// Start VoltAgent server"}</span>
                <br />
                <span className="text-blue-400">new</span>
                <span className="text-green-400"> VoltAgent</span>
                <span>{"({"}</span>
                <br />
                <span className="ml-4">
                  agents: {"{"} myFirstAgent {"}"},
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
        <h4 className="text-emerald-500 font-semibold mb-2 text-sm">The Result</h4>
        <p className="text-gray-300 mb-0 text-xs">
          In just 15 lines of code, you've created a production-ready AI agent with monitoring,
          debugging, and a web interface. That's the power of VoltAgent - less boilerplate, more
          building.
        </p>
      </div>
    </div>
  );
};
