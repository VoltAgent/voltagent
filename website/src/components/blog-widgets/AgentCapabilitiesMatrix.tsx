import React, { useState } from "react";

const capabilitiesData = [
  {
    id: "multi-step-reasoning",
    name: "Multi-Step Reasoning",
    description:
      "Breaking complex problems into manageable pieces and solving them step by step",
    difficulty: "Medium",
    difficultyLevel: 2,
    icon: "🧠",
    details:
      "This capability allows agents to think through complex problems systematically. Instead of trying to solve everything at once, the agent breaks down the task into smaller, logical steps and works through them sequentially.",
    examples: [
      "Research a topic → Analyze findings → Create summary → Format report",
      "Read user query → Identify required data → Fetch from multiple sources → Synthesize answer",
      "Plan project → Break into tasks → Assign priorities → Create timeline",
    ],
    useCases: [
      "Research assistants",
      "Data analysis workflows",
      "Project planning tools",
      "Educational tutoring systems",
    ],
    benefits: [
      "More accurate results",
      "Transparent reasoning process",
      "Better handling of complex queries",
      "Easier debugging and optimization",
    ],
  },
  {
    id: "tool-usage",
    name: "Tool Usage",
    description:
      "Interacting with external APIs, databases, and services to gather information and perform actions",
    difficulty: "Easy",
    difficultyLevel: 1,
    icon: "🔧",
    details:
      "Tools extend the agent's capabilities beyond text generation. The agent can call APIs, query databases, send emails, perform calculations, and interact with various external services based on the user's needs.",
    examples: [
      "Weather API → Get current conditions for any city",
      "Database query → Retrieve customer information",
      "Email service → Send notifications or reports",
      "Calculator → Perform complex mathematical operations",
    ],
    useCases: [
      "Customer service bots",
      "Data retrieval systems",
      "Automation workflows",
      "Information aggregators",
    ],
    benefits: [
      "Access to real-time data",
      "Ability to perform actions",
      "Integration with existing systems",
      "Extended functionality beyond text",
    ],
  },
  {
    id: "multimodal",
    name: "Multimodal Capabilities",
    description:
      "Processing and generating different types of content: text, images, audio, and video",
    difficulty: "Hard",
    difficultyLevel: 3,
    icon: "🎭",
    details:
      "Modern agents can work with multiple types of media. They can analyze images, process audio, understand video content, and generate responses in various formats. This opens up entirely new use cases and interaction patterns.",
    examples: [
      "Image analysis → Describe contents, extract text, identify objects",
      "Audio processing → Transcribe speech, analyze sentiment",
      "Video understanding → Summarize content, extract key frames",
      "Document processing → Read PDFs, analyze charts and graphs",
    ],
    useCases: [
      "Content moderation systems",
      "Medical image analysis",
      "Educational content creation",
      "Accessibility tools",
    ],
    benefits: [
      "Richer user interactions",
      "Broader application possibilities",
      "Better accessibility",
      "More natural communication",
    ],
  },
  {
    id: "structured-output",
    name: "Structured Output",
    description:
      "Generating responses in specific formats like JSON, XML, or custom schemas",
    difficulty: "Easy",
    difficultyLevel: 1,
    icon: "📋",
    details:
      "Instead of just generating free-form text, agents can produce structured data that other systems can easily consume. This is crucial for integration with existing software and automated workflows.",
    examples: [
      "JSON objects → API responses, configuration files",
      "XML documents → Data exchange, web services",
      "CSV files → Spreadsheet data, reports",
      "Custom schemas → Database records, form submissions",
    ],
    useCases: [
      "API backends",
      "Data processing pipelines",
      "Report generation",
      "System integration",
    ],
    benefits: [
      "Easy system integration",
      "Automated data processing",
      "Consistent output format",
      "Reduced parsing errors",
    ],
  },
];

const getDifficultyColor = (level: number) => {
  switch (level) {
    case 1:
      return "text-green-400 bg-green-900/30";
    case 2:
      return "text-yellow-400 bg-yellow-900/30";
    case 3:
      return "text-red-400 bg-red-900/30";
    default:
      return "text-gray-400 bg-gray-900/30";
  }
};

const getDifficultyBars = (level: number) => {
  const bars = [
    { id: "bar-1", active: level >= 1 },
    { id: "bar-2", active: level >= 2 },
    { id: "bar-3", active: level >= 3 },
  ];

  return bars.map((bar) => (
    <div
      key={bar.id}
      className={`h-1.5 w-3 rounded-sm ${
        bar.active ? "bg-emerald-500" : "bg-gray-600"
      }`}
    />
  ));
};

const AgentCapabilitiesMatrix = () => {
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedCapability = capabilitiesData.find(
    (cap) => cap.id === selectedCapabilityId,
  );

  return (
    <div className="my-4 rounded-lg border-2 border-emerald-500 bg-gray-800 p-4 text-gray-100 shadow-lg">
      <h3 className="mb-3 mt-0 text-lg text-emerald-300 font-semibold">
        ⚡ Agent Capabilities Matrix
      </h3>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg border border-emerald-700 transition-colors duration-200"
        >
          <span className="text-sm font-medium">
            {selectedCapability
              ? `${selectedCapability.icon} ${selectedCapability.name}`
              : "Select a capability to explore"}
          </span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-10">
            {capabilitiesData.map((capability) => (
              <button
                type="button"
                key={capability.id}
                onClick={() => {
                  setSelectedCapabilityId(capability.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{capability.icon}</span>
                    <span className="text-sm font-medium text-white">
                      {capability.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(
                        capability.difficultyLevel,
                      )}`}
                    >
                      {capability.difficulty}
                    </span>
                    <div className="flex space-x-1">
                      {getDifficultyBars(capability.difficultyLevel)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-300">
                  {capability.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedCapability && (
        <div className="mt-4 rounded-lg border border-gray-600 bg-gray-700 p-4 text-gray-200">
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-xl">{selectedCapability.icon}</span>
            <span className="text-base text-emerald-300 font-semibold">
              {selectedCapability.name}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(
                selectedCapability.difficultyLevel,
              )}`}
            >
              {selectedCapability.difficulty}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-gray-200 mb-4">
            {selectedCapability.details}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h5 className="text-xs text-emerald-200 font-medium mb-2">
                💡 Examples:
              </h5>
              <div className="space-y-1">
                {selectedCapability.examples.map((example, index) => (
                  <div
                    key={`example-${selectedCapability.id}-${index}`}
                    className="text-xs text-gray-300 leading-relaxed flex items-start"
                  >
                    <span className="text-emerald-400 mr-2 mt-0.5 flex-shrink-0">
                      •
                    </span>
                    <span>{example}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h5 className="text-xs text-emerald-200 font-medium mb-2">
                🎯 Use Cases:
              </h5>
              <div className="space-y-1">
                {selectedCapability.useCases.map((useCase, index) => (
                  <div
                    key={`usecase-${selectedCapability.id}-${index}`}
                    className="text-xs text-gray-300 leading-relaxed flex items-start"
                  >
                    <span className="text-emerald-400 mr-2 mt-0.5 flex-shrink-0">
                      •
                    </span>
                    <span>{useCase}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h5 className="text-xs text-emerald-200 font-medium mb-2">
                ✨ Benefits:
              </h5>
              <div className="space-y-1">
                {selectedCapability.benefits.map((benefit, index) => (
                  <div
                    key={`benefit-${selectedCapability.id}-${index}`}
                    className="text-xs text-gray-300 leading-relaxed flex items-start"
                  >
                    <span className="text-emerald-400 mr-2 mt-0.5 flex-shrink-0">
                      •
                    </span>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentCapabilitiesMatrix;
