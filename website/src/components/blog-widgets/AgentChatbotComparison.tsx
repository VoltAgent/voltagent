import type React from "react";
import { useState } from "react";

interface ComparisonFeature {
  name: string;
  description: string;
}

interface AISystem {
  name: string;
  type: "Chatbot" | "AI Agent";
  features: ComparisonFeature[];
  capabilities: string[];
  bestFor: string[];
  limitations: string[];
}

const systems: AISystem[] = [
  {
    name: "Traditional Chatbot",
    type: "Chatbot",
    features: [
      {
        name: "Conversation Flow",
        description: "Predefined response patterns and decision trees",
      },
      {
        name: "Knowledge Base",
        description: "Static database of answers and responses",
      },
      {
        name: "User Interface",
        description: "Text or voice-based interaction only",
      },
    ],
    capabilities: [
      "Quick responses",
      "24/7 availability",
      "Consistent answers",
      "Simple task handling",
    ],
    bestFor: [
      "Customer support FAQs",
      "Basic information retrieval",
      "Simple form filling",
      "Appointment scheduling",
    ],
    limitations: [
      "Cannot handle complex queries",
      "No real understanding",
      "Limited to training data",
      "No autonomous actions",
    ],
  },
  {
    name: "Modern AI Agent",
    type: "AI Agent",
    features: [
      {
        name: "Autonomous Decision Making",
        description: "Can plan and execute complex tasks independently",
      },
      {
        name: "Tool Integration",
        description: "Uses multiple APIs and external systems",
      },
      {
        name: "Learning Capability",
        description: "Improves from experience and feedback",
      },
    ],
    capabilities: [
      "Complex problem solving",
      "Multi-step workflows",
      "System integration",
      "Adaptive learning",
    ],
    bestFor: [
      "Process automation",
      "Data analysis",
      "Cross-system operations",
      "Complex decision making",
    ],
    limitations: [
      "Higher implementation cost",
      "Requires monitoring",
      "More complex setup",
      "Resource intensive",
    ],
  },
];

export default function AgentChatbotComparison(): JSX.Element {
  const [selectedSystem, setSelectedSystem] = useState<AISystem | null>(null);

  const cardBaseClass = "cursor-pointer border rounded-lg p-4 transition-all duration-300";
  const cardInactiveClass = "bg-gray-800 border-gray-700 hover:border-emerald-500/50";
  const cardActiveClass = "bg-gray-700 border-emerald-500";

  const handleSelectSystem = (system: AISystem) => {
    setSelectedSystem(selectedSystem?.name === system.name ? null : system);
  };

  const handleKeyDown = (e: React.KeyboardEvent, system: AISystem) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelectSystem(system);
    }
  };

  return (
    <div className="my-8">
      <div className="mb-4 text-center">
        <h3 className="text-xl font-bold text-white mb-2">Chatbot vs AI Agent Comparison</h3>
        <p className="text-gray-300 text-sm">Click on a system type to see detailed comparison</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {systems.map((system) => (
          <div
            key={system.name}
            className={`${cardBaseClass} ${
              selectedSystem?.name === system.name ? cardActiveClass : cardInactiveClass
            }`}
            onClick={() => handleSelectSystem(system)}
            onKeyDown={(e) => handleKeyDown(e, system)}
            tabIndex={0}
            role="button"
            aria-pressed={selectedSystem?.name === system.name}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-emerald-400">{system.name}</h4>
              <span className="text-xs bg-gray-900 rounded-full px-2 py-1 text-gray-300">
                {system.type}
              </span>
            </div>
          </div>
        ))}
      </div>

      {selectedSystem && (
        <div className="border border-emerald-500/50 rounded-lg p-5 bg-gray-800/80 animate-fadeIn">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-emerald-400">{selectedSystem.name}</h3>
            <span className="text-sm bg-emerald-900 text-emerald-200 px-3 py-1 rounded-full">
              {selectedSystem.type}
            </span>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-emerald-300 mb-2">Key Features:</h4>
            <ul className="space-y-1">
              {selectedSystem.features.map((feature) => (
                <li key={feature.name} className="flex text-sm items-start">
                  <span className="text-emerald-500 mr-2">→</span>
                  <div>
                    <span className="text-white">{feature.name}:</span>{" "}
                    <span className="text-gray-300">{feature.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-emerald-300 mb-2">Capabilities:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedSystem.capabilities.map((capability) => (
                <span
                  key={capability}
                  className="text-xs bg-emerald-900/30 text-emerald-200 px-2 py-1 rounded-full"
                >
                  {capability}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-emerald-300 mb-2">Best Used For:</h4>
            <ul className="space-y-1">
              {selectedSystem.bestFor.map((use) => (
                <li key={use} className="text-sm text-gray-300 flex items-center">
                  <span className="text-emerald-500 mr-2">•</span> {use}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-emerald-300 mb-2">Limitations:</h4>
            <ul className="space-y-1">
              {selectedSystem.limitations.map((limitation) => (
                <li key={limitation} className="text-sm text-gray-300 flex items-center">
                  <span className="text-red-500 mr-2">•</span> {limitation}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!selectedSystem && (
        <div className="border border-gray-700 rounded-lg p-5 bg-gray-800/30 text-center">
          <p className="text-gray-400">Select a system above to view detailed comparison</p>
        </div>
      )}
    </div>
  );
}
