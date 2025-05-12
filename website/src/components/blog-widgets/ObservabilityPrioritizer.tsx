import React, { useState } from "react";

type AppType = "user-facing" | "internal" | "unknown";
type Concern =
  | "accuracy"
  | "safety"
  | "speed"
  | "cost"
  | "debugging"
  | "drift"
  | "unknown";

const recommendations: Record<AppType, Record<Concern, string[]>> = {
  "user-facing": {
    accuracy: [
      "Output/Response Monitoring",
      "Performance & Evaluation",
      "User Feedback Loop",
      "Input/Prompt Tracking",
    ],
    safety: [
      "Output/Response Monitoring",
      "User Feedback Loop",
      "Input/Prompt Tracking (for PII/sensitive data)",
    ],
    speed: [
      "Performance Metrics (Latency)",
      "Intermediate Steps (if applicable)",
      "Cost Tracking (can correlate with complexity)",
    ],
    cost: [
      "Cost Tracking",
      "Performance Metrics (Tokens)",
      "Input/Prompt Tracking (for complex prompts)",
    ],
    debugging: [
      "Input/Prompt Tracking",
      "Output/Response Monitoring",
      "Intermediate Steps (if applicable)",
      "Tracing",
    ],
    drift: [
      "Performance & Evaluation",
      "Output/Response Monitoring (over time)",
      "User Feedback Loop (trends)",
    ],
    unknown: [
      "Output/Response Monitoring",
      "Performance Metrics (Latency & Tokens)",
      "User Feedback Loop",
      "Cost Tracking",
    ],
  },
  internal: {
    accuracy: [
      "Output/Response Monitoring",
      "Performance & Evaluation",
      "Input/Prompt Tracking",
      "Intermediate Steps (if applicable)",
    ],
    safety: [
      "Output/Response Monitoring",
      "Input/Prompt Tracking",
      "Performance & Evaluation (for internal standards)",
    ],
    speed: [
      "Performance Metrics (Latency)",
      "Cost Tracking",
      "Intermediate Steps (if applicable)",
      "Tracing",
    ],
    cost: [
      "Cost Tracking",
      "Performance Metrics (Tokens)",
      "Input/Prompt Tracking",
      "Intermediate Steps (if applicable)",
    ],
    debugging: [
      "Input/Prompt Tracking",
      "Output/Response Monitoring",
      "Intermediate Steps",
      "Tracing",
      "Logging Frameworks",
    ],
    drift: [
      "Performance & Evaluation",
      "Output/Response Monitoring (over time)",
      "Input/Prompt Tracking (changes in usage)",
    ],
    unknown: [
      "Output/Response Monitoring",
      "Input/Prompt Tracking",
      "Performance Metrics (Tokens)",
      "Cost Tracking",
    ],
  },
  unknown: {
    accuracy: ["Output/Response Monitoring", "Performance & Evaluation"],
    safety: ["Output/Response Monitoring", "User Feedback Loop"],
    speed: ["Performance Metrics (Latency)"],
    cost: ["Performance Metrics (Tokens)", "Cost Tracking"],
    debugging: ["Input/Prompt Tracking", "Output/Response Monitoring"],
    drift: ["Performance & Evaluation", "Output/Response Monitoring"],
    unknown: [
      "Output/Response Monitoring",
      "Performance Metrics (Latency & Tokens)",
      "Cost Tracking",
    ],
  },
};

export default function ObservabilityPrioritizer(): JSX.Element {
  const [appType, setAppType] = useState<AppType>("unknown");
  const [concern, setConcern] = useState<Concern>("unknown");

  const getRecommendations = () => {
    return (
      recommendations[appType]?.[concern] ||
      recommendations[appType]?.unknown ||
      recommendations.unknown.unknown
    );
  };

  const recommendedPillars = getRecommendations();

  const selectBaseClass =
    "appearance-none cursor-pointer w-full p-3 bg-gray-800 border rounded-md text-white focus:outline-none focus:ring-2 transition-all duration-200 text-sm";
  const selectFocusClass = "focus:ring-emerald-500/70 focus:border-emerald-400";
  const selectHoverClass = "hover:border-emerald-400/50";
  const selectBorderClass = "border-gray-700"; // Default border

  return (
    <div className="my-6 rounded-lg border-2 border-solid border-emerald-500 bg-gray-800 p-5 shadow-lg">
      <h4 className="mb-2 text-lg font-semibold text-white">
        Quick Check: What Should You Monitor First?
      </h4>
      <p className="mb-4 text-sm text-gray-300">
        Answer these questions to get a starting point:
      </p>
      <div className="mb-4">
        <label
          htmlFor="appTypeSelect"
          className="mb-1 block text-sm font-medium text-gray-200"
        >
          1. Is your LLM application primarily:
        </label>
        <select
          id="appTypeSelect"
          value={appType}
          onChange={(e) => setAppType(e.target.value as AppType)}
          className={`${selectBaseClass} ${selectBorderClass} ${selectHoverClass} ${selectFocusClass}`}
        >
          <option value="unknown" className="bg-gray-800">
            -- Select --
          </option>
          <option value="user-facing" className="bg-gray-800">
            User-Facing
          </option>
          <option value="internal" className="bg-gray-800">
            Internal/Backend
          </option>
        </select>
      </div>
      <div className="mb-4">
        <label
          htmlFor="concernSelect"
          className="mb-1 block text-sm font-medium text-gray-200"
        >
          2. Right now, your biggest immediate concern is:
        </label>
        <select
          id="concernSelect"
          value={concern}
          onChange={(e) => setConcern(e.target.value as Concern)}
          className={`${selectBaseClass} ${selectBorderClass} ${selectHoverClass} ${selectFocusClass}`}
        >
          <option value="unknown" className="bg-gray-800">
            -- Select --
          </option>
          <option value="accuracy" className="bg-gray-800">
            Output Accuracy/Reliability
          </option>
          <option value="safety" className="bg-gray-800">
            Output Safety/Fairness
          </option>
          <option value="speed" className="bg-gray-800">
            Response Speed (Latency)
          </option>
          <option value="cost" className="bg-gray-800">
            Cost Control
          </option>
          <option value="debugging" className="bg-gray-800">
            Debugging & Troubleshooting
          </option>
          <option value="drift" className="bg-gray-800">
            Detecting Drift/Performance Change
          </option>
        </select>
      </div>

      {(appType !== "unknown" || concern !== "unknown") && (
        <div className="mt-6 rounded-md border border-emerald-500/50 bg-emerald-900/60 p-4 shadow-sm">
          <h5 className="mb-2 font-medium text-emerald-400">
            Based on your selection(s), consider prioritizing:
          </h5>
          <ul className="list-inside list-disc space-y-1 text-sm text-emerald-100">
            {recommendedPillars.map((pillar) => (
              <li key={pillar}>{pillar}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-emerald-300/70">
            (Remember, this is a starting point! A comprehensive strategy often
            involves multiple pillars.)
          </p>
        </div>
      )}
    </div>
  );
}
