import clsx from "clsx"; // Import clsx for conditional classes
import type React from "react";
import { useState } from "react";

type Recommendation = {
  method: "Direct Attachment" | "Tool" | "Unsure";
  reasoning: string;
};

const frequencyOptions = [
  { value: "always", label: "Always (on almost every request)" },
  {
    value: "sometimes",
    label: "Sometimes (only for specific types of queries)",
  },
  { value: "unsure", label: "I'm not sure yet" },
];

const agentDecisionOptions = [
  { value: "not_important", label: "Not Important (It can always retrieve)" },
  { value: "somewhat_important", label: "Somewhat Important" },
  { value: "very_important", label: "Very Important (Agent should choose)" },
];

const RetrieverMethodHelper: React.FC = () => {
  const [frequency, setFrequency] = useState<string>("");
  const [agentDecision, setAgentDecision] = useState<string>("");
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null,
  );

  const handleFrequencyChange = (value: string) => {
    setFrequency(value);
    calculateRecommendation(value, agentDecision);
  };

  const handleAgentDecisionChange = (value: string) => {
    setAgentDecision(value);
    calculateRecommendation(frequency, value);
  };

  const calculateRecommendation = (
    currentFrequency: string,
    currentAgentDecision: string,
  ) => {
    if (!currentFrequency || !currentAgentDecision) {
      setRecommendation(null);
      return;
    }

    let rec: Recommendation;

    if (currentFrequency === "always") {
      if (currentAgentDecision === "not_important") {
        rec = {
          method: "Direct Attachment",
          reasoning:
            "Since the context is always needed and agent autonomy isn't critical, direct attachment is simpler and ensures context is always available.",
        };
      } else {
        rec = {
          method: "Unsure",
          reasoning:
            "You always need context, but also want agent control. Direct attachment ensures context, but using it as a tool gives control. Consider if the simplicity of direct attachment outweighs the need for agent decision in this specific case.",
        };
      }
    } else if (currentFrequency === "sometimes") {
      if (currentAgentDecision === "very_important") {
        rec = {
          method: "Tool",
          reasoning:
            "Context is needed selectively, and agent decision is important. Using the retriever as a tool is the most efficient and flexible approach here.",
        };
      } else {
        rec = {
          method: "Tool",
          reasoning:
            "Context is needed selectively. Using the retriever as a tool is generally more efficient, allowing the agent to decide when to fetch information.",
        };
      }
    } else {
      // unsure frequency
      rec = {
        method: "Unsure",
        reasoning:
          "It's unclear how often context is needed. Starting with the retriever as a tool offers more flexibility, but direct attachment is simpler if you find context is almost always required.",
      };
    }

    setRecommendation(rec);
  };

  return (
    <div className="border border-solid border-emerald-500 rounded-lg p-5 mb-6 bg-gray-800 shadow-lg">
      <h4 className="mt-0 mb-6 text-lg font-semibold text-emerald-400 text-center">
        Help Me Choose: Retriever Method
      </h4>

      {/* Frequency Question */}
      <div className="mb-6">
        <p className="block mb-2 font-medium text-white text-sm">
          How often will your agent need the retrieved information?
        </p>
        <div className="flex flex-col gap-3">
          {frequencyOptions.map((option) => (
            <label
              key={option.value}
              className={clsx(
                "flex items-center cursor-pointer p-3 rounded-md border-solid border bg-gray-800 transition-colors duration-200 text-white",
                "hover:border-emerald-400/50 hover:bg-gray-700", // Hover state
                frequency === option.value
                  ? "border-emerald-500 bg-emerald-900/30" // Checked state
                  : "border-gray-700", // Default state
              )}
            >
              <input
                type="radio"
                name="frequency"
                value={option.value}
                checked={frequency === option.value}
                onChange={() => handleFrequencyChange(option.value)}
                className="mr-3 accent-emerald-500" // Input specific styles
              />
              <span className="flex-grow text-sm">
                {" "}
                {/* Label text */}
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Agent Decision Question */}
      <div className="mb-6">
        <p className="block mb-2 font-medium text-white text-sm">
          How important is it for the agent (LLM) to *decide* when to retrieve?
        </p>
        <div className="flex flex-col gap-3">
          {agentDecisionOptions.map((option) => (
            <label
              key={option.value}
              className={clsx(
                "flex items-center cursor-pointer p-3 rounded-md border-solid border bg-gray-800 transition-colors duration-200 text-white",
                "hover:border-emerald-400/50 hover:bg-gray-700", // Hover state
                agentDecision === option.value
                  ? "border-emerald-500 bg-emerald-900/30" // Checked state
                  : "border-gray-700", // Default state
              )}
            >
              <input
                type="radio"
                name="agentDecision"
                value={option.value}
                checked={agentDecision === option.value}
                onChange={() => handleAgentDecisionChange(option.value)}
                className="mr-3 accent-emerald-500" // Input specific styles
              />
              <span className="flex-grow text-sm">
                {" "}
                {/* Label text */}
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Recommendation Box */}
      {recommendation && (
        <div
          // Using similar styling as LlmChoiceHelper recommendation box
          // Added a dynamic border color based on the recommendation type for subtle distinction
          className={clsx(
            "mt-6 p-4 rounded-md shadow-sm border",
            recommendation.method === "Unsure"
              ? "bg-yellow-900/60 border-yellow-500/50" // Yellow theme for unsure
              : "bg-emerald-900/60 border-emerald-500/50", // Emerald theme for others
          )}
        >
          <h5
            className={clsx(
              "mt-0 mb-2 text-base font-medium",
              recommendation.method === "Unsure"
                ? "text-yellow-400" // Yellow title for unsure
                : "text-emerald-400", // Emerald title for others
            )}
          >
            Recommendation: {recommendation.method}
          </h5>
          <p
            className={clsx(
              "mb-2 text-sm", // Slightly smaller text for reasoning
              recommendation.method === "Unsure"
                ? "text-yellow-100" // Lighter yellow text for unsure
                : "text-emerald-100", // Lighter emerald text for others
            )}
          >
            {recommendation.reasoning}
          </p>
          {recommendation.method !== "Unsure" && (
            <p className="text-sm text-emerald-100">
              Learn more in the{" "}
              <a
                href="/docs/agents/retriever"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline" // Link styling
              >
                Retriever Documentation
              </a>
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default RetrieverMethodHelper;
