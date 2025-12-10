import { CpuChipIcon, EyeIcon, UserPlusIcon, UsersIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

type Feature = "centralized" | "specialized" | "memory" | "dynamic";

interface FeatureCard {
  id: Feature;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface MobileCodeBlockProps {
  isVisible: boolean;
}

export const MobileCodeBlock = ({ isVisible }: MobileCodeBlockProps) => {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [overlayPosition, setOverlayPosition] = useState<{
    top: number;
    height: number;
  } | null>(null);

  const features: FeatureCard[] = [
    {
      id: "centralized",
      title: "Centralized Coordination",
      description:
        "Supervisor Agent manages the workflow, delegates tasks to specialized agents, and maintains context across the entire process.",
      icon: <CpuChipIcon className="h-4 w-4" />,
    },
    {
      id: "specialized",
      title: "Specialized Agent Roles",
      description:
        "Each agent in the workflow can be optimized for specific tasks, with custom tools, knowledge, and capabilities.",
      icon: <UserPlusIcon className="h-4 w-4" />,
    },
    {
      id: "memory",
      title: "Shared Memory System",
      description:
        "Maintain context and state across multiple agent interactions, enabling complex reasoning and multi-step problem solving.",
      icon: <EyeIcon className="h-4 w-4" />,
    },
    {
      id: "dynamic",
      title: "Dynamic Agent Selection",
      description:
        "Supervisor intelligently routes tasks to the most appropriate agents based on the current context and requirements.",
      icon: <UsersIcon className="h-4 w-4" />,
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
      ? `bg-gradient-to-r from-indigo-600/40 to-indigo-500/20 border-l-2 border-solid border-t-0 border-r-0 border-b-0 border-indigo-500 pl-2 rounded-sm shadow-lg text-white ${baseHighlightClass}`
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
    <div className="flex flex-col w-full mt-16">
      {/* Code Block */}
      <div className="w-full border-solid border-white/10 rounded-md">
        <pre className="text-left bg-transparent p-0 text-[11px] md:text-sm font-mono m-0 w-full overflow-x-hidden">
          <div className="flex w-full">
            <div className="p-2 text-right text-gray-500 select-none border-r border-l-0 border-t-0 border-b-0 border-gray-700/50 border-solid text-[10px]">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                <div key={num} className="leading-6">
                  {num}
                </div>
              ))}
            </div>
            <code className="py-4 px-2 sm:px-3 block text-[11px] relative w-full overflow-x-auto">
              {/* Orchestrator initialization */}
              <span className={getBaseCodeClasses()}>
                <span className="text-blue-400">const</span>
                <span> orchestrator = </span>
                <span className="text-blue-400">new</span>
                <span className="text-green-400"> MultiAgentOrchestrator</span>
                <span>();</span>
                <br />
                <br />
              </span>

              {/* Centralized Coordination */}
              <span
                className={`block ${getHighlightClasses(
                  "centralized",
                )} break-words whitespace-pre-wrap`}
                onClick={(e) => handleFeatureClick("centralized", e)}
              >
                <span className="text-gray-300">{"// Add individual agents"}</span>
                <br />
                <span>orchestrator.addAgent(</span>
                <span className="text-blue-400">new</span>
                <span className="text-green-400"> BedrockLLMAgent</span>
                <span>{"({"}</span>
                <br />
                <span className="ml-4">name: </span>
                <span className="text-yellow-300">"General Assistant"</span>
                <span>,</span>
                <br />
                <span className="ml-4">description: </span>
                <span className="text-yellow-300">"Handles general inquiries"</span>
                <br />
                <span>{"}));"}</span>
                <br />
                <br />
              </span>

              {/* Specialized Agent Roles */}
              <span
                className={`block ${getHighlightClasses(
                  "specialized",
                )} break-words whitespace-pre-wrap`}
                onClick={(e) => handleFeatureClick("specialized", e)}
              >
                <span className="text-gray-300">
                  {"// Add a SupervisorAgent for complex support tasks"}
                </span>
                <br />
                <span>orchestrator.addAgent(</span>
                <span className="text-blue-400">new</span>
                <span className="text-green-400"> SupervisorAgent</span>
                <span>{"({"}</span>
                <br />
                <span className="ml-4">name: </span>
                <span className="text-yellow-300">"SupervisorAgent"</span>
                <span>,</span>
                <br />
                <span className="ml-4">description: </span>
                <span className="text-yellow-300">
                  "You are a supervisor agent that manages the team of"
                </span>
                <span>,</span>
                <br />
                <span className="ml-4">leadAgent: </span>
                <span className="text-blue-400">new</span>
                <span className="text-green-400"> BedrockLLMAgent</span>
                <span>{"({"}</span>
                <br />
                <span className="ml-8">name: </span>
                <span className="text-yellow-300">"Support Team"</span>
                <span>,</span>
                <br />
                <span className="ml-8">description: </span>
                <span className="text-yellow-300">
                  "Coordinates support inquiries requiring multiple"
                </span>
                <br />
                <span className="ml-4">{"})},"}</span>
                <br />
                <span className="ml-4">team: [techAgent, billingAgent, lexBookingBot]</span>
                <br />
                <span>{"}));"}</span>
                <br />
                <br />
              </span>

              {/* Shared Memory System */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: ignore */}
              <span
                className={`block ${getHighlightClasses("memory")} break-words whitespace-pre-wrap`}
                onClick={(e) => handleFeatureClick("memory", e)}
              >
                <span className="text-gray-300">
                  {"// Add another SupervisorAgent for product development"}
                </span>
                <br />
                <span>orchestrator.addAgent(</span>
                <span className="text-blue-400">new</span>
                <span className="text-green-400"> SupervisorAgent</span>
                <span>{"({"}</span>
                <br />
                <span className="ml-4">leadAgent: </span>
                <span className="text-blue-400">new</span>
                <span className="text-green-400"> AnthropicAgent</span>
                <span>{"({"}</span>
                <br />
                <span className="ml-8">name: </span>
                <span className="text-yellow-300">"Product Team"</span>
                <span>,</span>
                <br />
                <span className="ml-8">description: </span>
                <span className="text-yellow-300">
                  "Coordinates product development and feature requests"
                </span>
                <br />
                <span className="ml-4">{"})},"}</span>
                <br />
                <span className="ml-4">
                  team: [designAgent, engineeringAgent, productManagerAgent]
                </span>
                <br />
                <span>{"}));"}</span>
                <br />
                <br />
              </span>

              {/* Dynamic Agent Selection */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: ignore */}
              <span
                className={`block ${getHighlightClasses(
                  "dynamic",
                )} break-words whitespace-pre-wrap`}
                onClick={(e) => handleFeatureClick("dynamic", e)}
              >
                <span className="text-gray-300">{"// Process through classifier"}</span>
                <br />
                <span className="text-blue-400">const</span>
                <span> response = </span>
                <span className="text-blue-400">await</span>
                <span> orchestrator.routeRequest(</span>
                <br />
                <span className="ml-4">userInput,</span>
                <br />
                <span className="ml-4">userId,</span>
                <br />
                <span className="ml-4">sessionId</span>
                <br />
                <span>);</span>
              </span>

              {/* Feature Info Overlay */}
              {selectedFeature && overlayPosition && (
                <div
                  className="absolute font-[Inter] left-0 bg-gray-900/95 backdrop-blur-sm w-full rounded-lg transition-all duration-300 shadow-lg border-solid border-indigo-500/20"
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
                      <div className="text-[13px] font-medium text-white/90 whitespace-normal overflow-wrap-normal">
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
    </div>
  );
};
