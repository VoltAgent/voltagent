import React, { useState } from "react";

type UseCase =
  | "customer-support"
  | "content-generation"
  | "data-analysis"
  | "automation"
  | "research"
  | "unknown";
type InteractionType = "one-shot" | "conversational" | "background" | "unknown";
type DataRequirements =
  | "no-external"
  | "simple-apis"
  | "complex-databases"
  | "real-time"
  | "unknown";
type Budget = "cost-conscious" | "balanced" | "performance-first" | "unknown";

interface FeatureRecommendation {
  feature: string;
  priority: "High" | "Medium" | "Low";
  reason: string;
}

const featureRecommendations: Record<string, FeatureRecommendation[]> = {
  "customer-support-conversational": [
    {
      feature: "Memory System",
      priority: "High",
      reason: "Essential for context across conversations",
    },
    {
      feature: "Tools Integration",
      priority: "High",
      reason: "Need to access order systems, knowledge bases",
    },
    {
      feature: "Error Handling",
      priority: "High",
      reason: "Critical for user experience",
    },
    {
      feature: "Multi-Agent",
      priority: "Medium",
      reason: "Useful for escalation workflows",
    },
    {
      feature: "Voice Capabilities",
      priority: "Low",
      reason: "Nice-to-have for phone support",
    },
  ],
  "content-generation-one-shot": [
    {
      feature: "Structured Output",
      priority: "High",
      reason: "Consistent content formatting",
    },
    {
      feature: "Provider Options",
      priority: "High",
      reason: "Different models for different content types",
    },
    {
      feature: "Cost Optimization",
      priority: "Medium",
      reason: "Important for high-volume generation",
    },
    {
      feature: "Memory System",
      priority: "Low",
      reason: "Less critical for one-shot tasks",
    },
    {
      feature: "Tools Integration",
      priority: "Medium",
      reason: "Research and fact-checking tools",
    },
  ],
  "data-analysis-background": [
    {
      feature: "Tools Integration",
      priority: "High",
      reason: "Database connections, APIs essential",
    },
    {
      feature: "Multi-Agent",
      priority: "High",
      reason: "Break down complex analysis tasks",
    },
    {
      feature: "Error Handling",
      priority: "High",
      reason: "Robust processing for automated tasks",
    },
    {
      feature: "Monitoring & Hooks",
      priority: "Medium",
      reason: "Track long-running processes",
    },
    {
      feature: "Memory System",
      priority: "Low",
      reason: "Less relevant for batch processing",
    },
  ],
  "automation-background": [
    {
      feature: "Tools Integration",
      priority: "High",
      reason: "Core requirement for automation tasks",
    },
    {
      feature: "Error Handling",
      priority: "High",
      reason: "Reliability is critical",
    },
    {
      feature: "Monitoring & Hooks",
      priority: "High",
      reason: "Essential for tracking automated processes",
    },
    {
      feature: "Multi-Agent",
      priority: "Medium",
      reason: "Useful for complex workflows",
    },
    {
      feature: "Memory System",
      priority: "Low",
      reason: "Usually stateless operations",
    },
  ],
  "research-conversational": [
    {
      feature: "Tools Integration",
      priority: "High",
      reason: "Web search, document analysis tools needed",
    },
    {
      feature: "Memory System",
      priority: "High",
      reason: "Track research findings across sessions",
    },
    {
      feature: "Multi-Agent",
      priority: "High",
      reason: "Specialized agents for different research tasks",
    },
    {
      feature: "Structured Output",
      priority: "Medium",
      reason: "Organize research findings",
    },
    {
      feature: "Voice Capabilities",
      priority: "Low",
      reason: "Optional for accessibility",
    },
  ],
  default: [
    {
      feature: "Tools Integration",
      priority: "High",
      reason: "Most agents need external capabilities",
    },
    {
      feature: "Memory System",
      priority: "Medium",
      reason: "Depends on interaction patterns",
    },
    {
      feature: "Error Handling",
      priority: "High",
      reason: "Always important for reliability",
    },
    {
      feature: "Monitoring & Hooks",
      priority: "Medium",
      reason: "Good for production readiness",
    },
    {
      feature: "Provider Options",
      priority: "Medium",
      reason: "Flexibility for different models",
    },
  ],
};

export default function AgentFeaturePrioritizer(): JSX.Element {
  const [useCase, setUseCase] = useState<UseCase>("unknown");
  const [interactionType, setInteractionType] =
    useState<InteractionType>("unknown");
  const [dataRequirements, setDataRequirements] =
    useState<DataRequirements>("unknown");
  const [budget, setBudget] = useState<Budget>("unknown");

  const getRecommendations = (): FeatureRecommendation[] => {
    const key = `${useCase}-${interactionType}`;

    // Try specific combination first
    if (featureRecommendations[key]) {
      return featureRecommendations[key];
    }

    // Fallback to defaults with some customization
    let recommendations = [...featureRecommendations["default"]];

    // Adjust based on data requirements
    if (
      dataRequirements === "complex-databases" ||
      dataRequirements === "real-time"
    ) {
      recommendations = recommendations.map((rec) =>
        rec.feature === "Tools Integration"
          ? {
              ...rec,
              priority: "High",
              reason: "Complex data access requirements",
            }
          : rec,
      );
    }

    // Adjust based on budget
    if (budget === "cost-conscious") {
      recommendations.push({
        feature: "Cost Optimization",
        priority: "High",
        reason: "Budget constraints require careful cost management",
      });
    }

    return recommendations;
  };

  const recommendations = getRecommendations();

  const selectBaseClass =
    "appearance-none cursor-pointer w-full p-3 bg-gray-800 border rounded-md text-white focus:outline-none focus:ring-2 transition-all duration-200 text-sm";
  const selectFocusClass = "focus:ring-emerald-500/70 focus:border-emerald-400";
  const selectHoverClass = "hover:border-emerald-400/50";
  const selectBorderClass = "border-gray-700";

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "text-red-400";
      case "Medium":
        return "text-yellow-400";
      case "Low":
        return "text-green-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="my-6 rounded-lg border-2 border-solid border-emerald-500 bg-gray-800 p-5 shadow-lg">
      <h4 className="mb-2 text-lg font-semibold text-white">
        🎯 Agent Feature Prioritizer
      </h4>
      <p className="mb-4 text-sm text-gray-300">
        Get personalized recommendations for which agent features to implement
        first:
      </p>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="useCaseSelect"
            className="mb-1 block text-sm font-medium text-gray-200"
          >
            1. What's your primary use case?
          </label>
          <select
            id="useCaseSelect"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value as UseCase)}
            className={`${selectBaseClass} ${selectBorderClass} ${selectHoverClass} ${selectFocusClass}`}
          >
            <option value="unknown" className="bg-gray-800">
              -- Select --
            </option>
            <option value="customer-support" className="bg-gray-800">
              Customer Support
            </option>
            <option value="content-generation" className="bg-gray-800">
              Content Generation
            </option>
            <option value="data-analysis" className="bg-gray-800">
              Data Analysis
            </option>
            <option value="automation" className="bg-gray-800">
              Process Automation
            </option>
            <option value="research" className="bg-gray-800">
              Research & Analysis
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="interactionSelect"
            className="mb-1 block text-sm font-medium text-gray-200"
          >
            2. How will users interact with your agent?
          </label>
          <select
            id="interactionSelect"
            value={interactionType}
            onChange={(e) =>
              setInteractionType(e.target.value as InteractionType)
            }
            className={`${selectBaseClass} ${selectBorderClass} ${selectHoverClass} ${selectFocusClass}`}
          >
            <option value="unknown" className="bg-gray-800">
              -- Select --
            </option>
            <option value="one-shot" className="bg-gray-800">
              One-shot requests
            </option>
            <option value="conversational" className="bg-gray-800">
              Multi-turn conversations
            </option>
            <option value="background" className="bg-gray-800">
              Background processing
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="dataSelect"
            className="mb-1 block text-sm font-medium text-gray-200"
          >
            3. What kind of external data access do you need?
          </label>
          <select
            id="dataSelect"
            value={dataRequirements}
            onChange={(e) =>
              setDataRequirements(e.target.value as DataRequirements)
            }
            className={`${selectBaseClass} ${selectBorderClass} ${selectHoverClass} ${selectFocusClass}`}
          >
            <option value="unknown" className="bg-gray-800">
              -- Select --
            </option>
            <option value="no-external" className="bg-gray-800">
              No external data needed
            </option>
            <option value="simple-apis" className="bg-gray-800">
              Simple API calls
            </option>
            <option value="complex-databases" className="bg-gray-800">
              Complex database queries
            </option>
            <option value="real-time" className="bg-gray-800">
              Real-time data streams
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="budgetSelect"
            className="mb-1 block text-sm font-medium text-gray-200"
          >
            4. What's your approach to cost vs performance?
          </label>
          <select
            id="budgetSelect"
            value={budget}
            onChange={(e) => setBudget(e.target.value as Budget)}
            className={`${selectBaseClass} ${selectBorderClass} ${selectHoverClass} ${selectFocusClass}`}
          >
            <option value="unknown" className="bg-gray-800">
              -- Select --
            </option>
            <option value="cost-conscious" className="bg-gray-800">
              Cost-conscious (minimize expenses)
            </option>
            <option value="balanced" className="bg-gray-800">
              Balanced approach
            </option>
            <option value="performance-first" className="bg-gray-800">
              Performance-first (cost flexible)
            </option>
          </select>
        </div>
      </div>

      {(useCase !== "unknown" || interactionType !== "unknown") && (
        <div className="mt-6 rounded-md border border-emerald-500/50 bg-emerald-900/60 p-4 shadow-sm">
          <h5 className="mb-3 font-medium text-emerald-400">
            🚀 Recommended Implementation Order:
          </h5>
          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <div
                key={rec.feature}
                className="rounded border border-emerald-700/30 bg-emerald-800/30 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-emerald-100">
                    {index + 1}. {rec.feature}
                  </span>
                  <span
                    className={`text-xs font-bold ${getPriorityColor(
                      rec.priority,
                    )}`}
                  >
                    {rec.priority} Priority
                  </span>
                </div>
                <p className="mt-1 text-xs text-emerald-200/80">{rec.reason}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-emerald-300/70">
            💡 Start with High priority features first, then add Medium and Low
            priority features as your project matures.
          </p>
        </div>
      )}
    </div>
  );
}
