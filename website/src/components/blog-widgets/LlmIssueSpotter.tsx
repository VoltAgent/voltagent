import React, { useState } from "react";

type Issue = "hallucinations" | "latency" | "cost" | "toxicity" | "drift" | "unknown";

interface IssueDetail {
  name: string;
  description: string;
  relevantPillars: string[];
}

const issues: Record<Issue, IssueDetail | { name: string }> = {
  unknown: { name: "-- Select an Issue --" },
  hallucinations: {
    name: "Hallucinations/Making Things Up",
    description: "When the LLM generates plausible but incorrect or nonsensical information.",
    relevantPillars: [
      "Output/Response Monitoring",
      "User Feedback Loop",
      "Performance & Evaluation",
    ],
  },
  latency: {
    name: "High Latency/Slow Responses",
    description: "When the LLM takes too long to generate a response.",
    relevantPillars: [
      "Performance Metrics (Latency)",
      "Intermediate Steps (if applicable)",
      "Input/Prompt Tracking (for complex prompts)",
    ],
  },
  cost: {
    name: "Unexpected High Costs",
    description: "When the LLM usage incurs higher than expected financial costs.",
    relevantPillars: ["Cost Tracking", "Performance Metrics (Tokens)", "Input/Prompt Tracking"],
  },
  toxicity: {
    name: "Toxic or Biased Output",
    description: "When the LLM generates harmful, biased, or inappropriate content.",
    relevantPillars: [
      "Output/Response Monitoring",
      "User Feedback Loop",
      "Performance & Evaluation",
    ],
  },
  drift: {
    name: "Model Drift/Performance Degradation",
    description: "When the LLM's performance changes or worsens over time.",
    relevantPillars: [
      "Performance & Evaluation",
      "Output/Response Monitoring",
      "User Feedback Loop",
    ],
  },
};

export default function LlmIssueSpotter(): JSX.Element {
  const [selectedIssue, setSelectedIssue] = useState<Issue>("unknown");

  const selectBaseClass =
    "appearance-none cursor-pointer w-full p-3 bg-gray-800 border rounded-md text-white focus:outline-none focus:ring-2 transition-all duration-200 text-sm";
  const selectFocusClass = "focus:ring-emerald-500/70 focus:border-emerald-400";
  const selectHoverClass = "hover:border-emerald-400/50";
  const selectBorderClass = "border-gray-700";

  const currentIssueDetails =
    selectedIssue !== "unknown" ? (issues[selectedIssue] as IssueDetail) : null;

  return (
    <div className="my-6 rounded-lg border-2 border-solid border-emerald-500 bg-gray-800 p-5 shadow-lg">
      <h4 className="mb-2 text-lg font-semibold text-white">LLM Common Issue Spotter</h4>
      <p className="mb-1 text-sm text-gray-300">
        Select an issue to see which observability areas can help:
      </p>
      <div className="mb-4">
        <select
          id="issueSelect"
          value={selectedIssue}
          onChange={(e) => setSelectedIssue(e.target.value as Issue)}
          className={`${selectBaseClass} ${selectBorderClass} ${selectHoverClass} ${selectFocusClass}`}
        >
          {Object.keys(issues).map((key) => (
            <option key={key} value={key} className="bg-gray-800">
              {issues[key as Issue].name}
            </option>
          ))}
        </select>
      </div>

      {currentIssueDetails && selectedIssue !== "unknown" && (
        <div className="mt-6 rounded-md border border-emerald-500/50 bg-emerald-900/60 p-4 shadow-sm">
          <h5 className="mb-1 font-semibold text-emerald-400">{currentIssueDetails.name}</h5>
          <p className="mb-3 text-sm text-emerald-100">{currentIssueDetails.description}</p>
          <h6 className="mb-1 text-sm font-medium text-emerald-300">Key Observability Pillars:</h6>
          <ul className="list-inside list-disc space-y-1 text-sm text-emerald-100">
            {currentIssueDetails.relevantPillars.map((pillar) => (
              <li key={pillar}>{pillar}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
