import React, { useState } from "react";

type ComplexityType =
  | "simple-ui"
  | "multi-turn-chat"
  | "complex-orchestration"
  | "unknown";

interface ScenarioRecommendation {
  approach: string;
  reasoning: string;
}

const scenarioRecommendations: Record<ComplexityType, ScenarioRecommendation> =
  {
    "simple-ui": {
      approach: "Use Vercel AI SDK Directly",
      reasoning:
        "This is typically sufficient and quick for simple, one-off LLM calls tied to UI elements.",
    },
    "multi-turn-chat": {
      approach: "Use VoltAgent with @voltagent/vercel-ai Provider",
      reasoning:
        "VoltAgent's Memory feature is ideal for maintaining consistency in multi-turn conversations. Vercel AI SDK's power is leveraged for LLM communication.",
    },
    "complex-orchestration": {
      approach: "Use VoltAgent with @voltagent/vercel-ai Provider",
      reasoning:
        "For multiple LLM calls, external tool usage, and complex task workflows, VoltAgent's capabilities like Tools and Sub-Agents offer a powerful solution. Vercel AI SDK handles the LLM interactions.",
    },
    unknown: {
      approach: "Please select a complexity scenario.",
      reasoning:
        "Choose from the options above to see a potential approach for your application.",
    },
  };

export default function IntegrationScenarioSelector(): JSX.Element {
  const [complexity, setComplexity] = useState<ComplexityType>("unknown");

  const currentScenarioRecommendation = scenarioRecommendations[complexity];

  const selectBaseClass =
    "appearance-none cursor-pointer w-full p-3 bg-gray-800 border rounded-md text-white focus:outline-none focus:ring-2 transition-all duration-200 text-sm";
  const selectFocusClass = "focus:ring-emerald-500/70 focus:border-emerald-400";
  const selectHoverClass = "hover:border-emerald-400/50";
  const selectBorderClass = "border-gray-700";

  return (
    <div className="my-6 rounded-lg border-2 border-solid border-emerald-500 bg-gray-800 p-5 shadow-lg">
      <h4 className="mb-2 text-lg font-semibold text-white">
        Which Integration Approach Is Right For You?
      </h4>
      <p className="mb-4 text-sm text-gray-300">
        Select your application's complexity level and we'll suggest an
        approach:
      </p>
      <div className="mb-4">
        <label
          htmlFor="complexitySelect"
          className="mb-1 block text-sm font-medium text-gray-200"
        >
          Application Complexity:
        </label>
        <select
          id="complexitySelect"
          value={complexity}
          onChange={(e) => setComplexity(e.target.value as ComplexityType)}
          className={`${selectBaseClass} ${selectBorderClass} ${selectHoverClass} ${selectFocusClass}`}
        >
          <option value="unknown" className="bg-gray-800">
            -- Select an option --
          </option>
          <option value="simple-ui" className="bg-gray-800">
            Simple LLM call for a UI element
          </option>
          <option value="multi-turn-chat" className="bg-gray-800">
            Agent with multi-turn conversation capability
          </option>
          <option value="complex-orchestration" className="bg-gray-800">
            Complex system managing multiple LLM calls and tools (orchestration)
          </option>
        </select>
      </div>

      {complexity !== "unknown" && (
        <div className="mt-6 rounded-md border border-emerald-500/50 bg-emerald-900/60 p-4 shadow-sm">
          <h5 className="mb-2 font-medium text-emerald-400">
            Recommended Approach:
          </h5>
          <p className="text-md font-semibold text-emerald-100">
            {currentScenarioRecommendation.approach}
          </p>
          <p className="mt-1 text-sm text-emerald-200">
            {currentScenarioRecommendation.reasoning}
          </p>
          <p className="mt-3 text-xs text-emerald-300/70">
            (Remember, this is just a general starting point! Your project's
            specific needs might require a different approach.)
          </p>
        </div>
      )}
    </div>
  );
}
