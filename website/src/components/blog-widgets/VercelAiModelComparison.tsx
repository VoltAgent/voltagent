import React, { useState } from "react";

interface ModelFeature {
  name: string;
  description: string;
}

interface AIModel {
  name: string;
  provider: string;
  features: ModelFeature[];
  strengths: string[];
  bestFor: string[];
}

const models: AIModel[] = [
  {
    name: "GPT-4o",
    provider: "OpenAI",
    features: [
      {
        name: "Text Generation",
        description: "Advanced text generation capabilities",
      },
      { name: "Multi-modal", description: "Can process both text and images" },
      {
        name: "Function Calling",
        description: "Supports tool use through function calls",
      },
    ],
    strengths: [
      "Powerful general reasoning",
      "Visual understanding",
      "Structured outputs",
    ],
    bestFor: [
      "Complex applications",
      "Multi-modal experiences",
      "Advanced reasoning",
    ],
  },
  {
    name: "Claude 3",
    provider: "Anthropic",
    features: [
      { name: "Text Generation", description: "High quality text generation" },
      { name: "Multi-modal", description: "Can process both text and images" },
      {
        name: "Long Context",
        description: "Supports very long context windows",
      },
    ],
    strengths: [
      "Nuanced writing",
      "Documentation analysis",
      "Safety & guardrails",
    ],
    bestFor: ["Content creation", "Document Q&A", "Customer support"],
  },
  {
    name: "Gemini",
    provider: "Google",
    features: [
      { name: "Text Generation", description: "Competitive text generation" },
      { name: "Multi-modal", description: "Advanced multi-modal capabilities" },
      {
        name: "Code Generation",
        description: "Strong code generation abilities",
      },
    ],
    strengths: [
      "Knowledge integration",
      "Multi-modal reasoning",
      "Code understanding",
    ],
    bestFor: [
      "Knowledge-heavy apps",
      "Visual reasoning tasks",
      "Developer tools",
    ],
  },
  {
    name: "Mixtral",
    provider: "Mistral AI",
    features: [
      { name: "Text Generation", description: "Efficient text generation" },
      { name: "Code Generation", description: "Code generation support" },
    ],
    strengths: ["Performance-to-cost ratio", "Fast inference", "Open weights"],
    bestFor: [
      "Cost-sensitive deployments",
      "Self-hosted solutions",
      "Low-latency applications",
    ],
  },
];

export default function VercelAiModelComparison(): JSX.Element {
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);

  const cardBaseClass =
    "cursor-pointer border rounded-lg p-4 transition-all duration-300";
  const cardInactiveClass =
    "bg-gray-800 border-gray-700 hover:border-emerald-500/50";
  const cardActiveClass = "bg-gray-700 border-emerald-500";

  const handleSelectModel = (model: AIModel) => {
    setSelectedModel(selectedModel?.name === model.name ? null : model);
  };

  const handleKeyDown = (e: React.KeyboardEvent, model: AIModel) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelectModel(model);
    }
  };

  return (
    <div className="my-8">
      <div className="mb-4 text-center">
        <h3 className="text-xl font-bold text-white mb-2">
          Models Supported by Vercel AI SDK
        </h3>
        <p className="text-gray-300 text-sm">
          Click on a model to see its features and strengths
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {models.map((model) => (
          <div
            key={model.name}
            className={`${cardBaseClass} ${
              selectedModel?.name === model.name
                ? cardActiveClass
                : cardInactiveClass
            }`}
            onClick={() => handleSelectModel(model)}
            onKeyDown={(e) => handleKeyDown(e, model)}
            tabIndex={0}
            role="button"
            aria-pressed={selectedModel?.name === model.name}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-emerald-400">{model.name}</h4>
              <span className="text-xs bg-gray-900 rounded-full px-2 py-1 text-gray-300">
                {model.provider}
              </span>
            </div>
          </div>
        ))}
      </div>

      {selectedModel && (
        <div className="border border-emerald-500/50 rounded-lg p-5 bg-gray-800/80 animate-fadeIn">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-emerald-400">
              {selectedModel.name}
            </h3>
            <span className="text-sm bg-emerald-900 text-emerald-200 px-3 py-1 rounded-full">
              {selectedModel.provider}
            </span>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-emerald-300 mb-2">
              Key Features:
            </h4>
            <ul className="space-y-1">
              {selectedModel.features.map((feature) => (
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
            <h4 className="text-sm font-medium text-emerald-300 mb-2">
              Strengths:
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedModel.strengths.map((strength) => (
                <span
                  key={strength}
                  className="text-xs bg-emerald-900/30 text-emerald-200 px-2 py-1 rounded-full"
                >
                  {strength}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-emerald-300 mb-2">
              Best Used For:
            </h4>
            <ul className="space-y-1">
              {selectedModel.bestFor.map((use) => (
                <li
                  key={use}
                  className="text-sm text-gray-300 flex items-center"
                >
                  <span className="text-emerald-500 mr-2">•</span> {use}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!selectedModel && (
        <div className="border border-gray-700 rounded-lg p-5 bg-gray-800/30 text-center">
          <p className="text-gray-400">
            Select a model above to view its details
          </p>
        </div>
      )}
    </div>
  );
}
