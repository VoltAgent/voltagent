import React, { useState } from "react";

type Volume = "low" | "medium" | "high" | "enterprise" | "unknown";
type ResponseType = "simple" | "complex" | "mixed" | "unknown";
type AccuracyRequirement =
  | "best-possible"
  | "high"
  | "balanced"
  | "cost-first"
  | "unknown";
type Architecture = "single-agent" | "multi-agent" | "hybrid" | "unknown";

interface CostOptimization {
  strategy: string;
  expectedSavings: string;
  description: string;
  implementation: "Easy" | "Medium" | "Hard";
}

const optimizationStrategies: Record<string, CostOptimization[]> = {
  "low-simple": [
    {
      strategy: "Use GPT-4o-mini for most tasks",
      expectedSavings: "60-80%",
      description: "Start with cheaper models, upgrade only when needed",
      implementation: "Easy",
    },
    {
      strategy: "Response caching",
      expectedSavings: "20-40%",
      description: "Cache common queries to avoid repeat API calls",
      implementation: "Medium",
    },
    {
      strategy: "Simple prompt optimization",
      expectedSavings: "10-20%",
      description: "Shorter, more direct prompts reduce token usage",
      implementation: "Easy",
    },
  ],
  "medium-mixed": [
    {
      strategy: "Adaptive model selection",
      expectedSavings: "30-50%",
      description: "Route simple tasks to cheaper models, complex to premium",
      implementation: "Medium",
    },
    {
      strategy: "Context compression",
      expectedSavings: "25-35%",
      description: "Intelligent context trimming to reduce input tokens",
      implementation: "Medium",
    },
    {
      strategy: "Batch processing",
      expectedSavings: "15-25%",
      description: "Group similar requests to optimize API usage",
      implementation: "Hard",
    },
    {
      strategy: "Response caching with TTL",
      expectedSavings: "20-40%",
      description: "Smart caching with time-to-live for fresh data",
      implementation: "Medium",
    },
  ],
  "high-complex": [
    {
      strategy: "Multi-tier model architecture",
      expectedSavings: "40-60%",
      description:
        "Screening layer with cheap models, premium for complex tasks",
      implementation: "Hard",
    },
    {
      strategy: "Semantic caching",
      expectedSavings: "30-50%",
      description: "Cache based on meaning, not exact matches",
      implementation: "Hard",
    },
    {
      strategy: "Custom fine-tuned models",
      expectedSavings: "50-70%",
      description: "Domain-specific models can be smaller and cheaper",
      implementation: "Hard",
    },
    {
      strategy: "Request deduplication",
      expectedSavings: "10-30%",
      description: "Detect and merge similar concurrent requests",
      implementation: "Medium",
    },
  ],
  "enterprise-multi-agent": [
    {
      strategy: "Agent specialization",
      expectedSavings: "35-55%",
      description: "Specialized agents use cheaper models for their domain",
      implementation: "Hard",
    },
    {
      strategy: "Hierarchical processing",
      expectedSavings: "25-45%",
      description: "Coordinator agents distribute work efficiently",
      implementation: "Hard",
    },
    {
      strategy: "Result sharing between agents",
      expectedSavings: "20-35%",
      description: "Avoid redundant processing across agent teams",
      implementation: "Medium",
    },
    {
      strategy: "Dynamic scaling",
      expectedSavings: "15-30%",
      description: "Scale agent complexity based on real-time demand",
      implementation: "Hard",
    },
  ],
  default: [
    {
      strategy: "Start with cheaper models",
      expectedSavings: "40-60%",
      description: "Begin with GPT-4o-mini, upgrade selectively",
      implementation: "Easy",
    },
    {
      strategy: "Implement basic caching",
      expectedSavings: "20-30%",
      description: "Cache responses for repeated queries",
      implementation: "Medium",
    },
    {
      strategy: "Optimize prompts",
      expectedSavings: "10-20%",
      description: "Reduce unnecessary tokens in prompts",
      implementation: "Easy",
    },
    {
      strategy: "Monitor and analyze usage",
      expectedSavings: "15-25%",
      description: "Track costs to identify optimization opportunities",
      implementation: "Easy",
    },
  ],
};

export default function CostOptimizationCalculator(): JSX.Element {
  const [volume, setVolume] = useState<Volume>("unknown");
  const [responseType, setResponseType] = useState<ResponseType>("unknown");
  const [accuracyRequirement, setAccuracyRequirement] =
    useState<AccuracyRequirement>("unknown");
  const [architecture, setArchitecture] = useState<Architecture>("unknown");

  const getOptimizations = (): CostOptimization[] => {
    // Start with base recommendations based on user selections
    let optimizations: CostOptimization[] = [];

    // Volume-based optimizations
    if (volume === "low") {
      optimizations.push({
        strategy: "Use GPT-4o-mini for most tasks",
        expectedSavings: "60-80%",
        description: "Start with cheaper models, upgrade only when needed",
        implementation: "Easy",
      });
    } else if (volume === "medium" || volume === "high") {
      optimizations.push({
        strategy: "Adaptive model selection",
        expectedSavings: "30-50%",
        description: "Route simple tasks to cheaper models, complex to premium",
        implementation: "Medium",
      });
      optimizations.push({
        strategy: "Context compression",
        expectedSavings: "25-35%",
        description: "Intelligent context trimming to reduce input tokens",
        implementation: "Medium",
      });
    } else if (volume === "enterprise") {
      optimizations.push({
        strategy: "Multi-tier model architecture",
        expectedSavings: "40-60%",
        description:
          "Screening layer with cheap models, premium for complex tasks",
        implementation: "Hard",
      });
      optimizations.push({
        strategy: "Enterprise volume discounts",
        expectedSavings: "10-20%",
        description: "Negotiate custom pricing with LLM providers",
        implementation: "Easy",
      });
    }

    // Response type optimizations
    if (responseType === "simple") {
      optimizations.push({
        strategy: "Simple prompt optimization",
        expectedSavings: "15-25%",
        description: "Shorter, more direct prompts reduce token usage",
        implementation: "Easy",
      });
    } else if (responseType === "complex") {
      optimizations.push({
        strategy: "Semantic caching",
        expectedSavings: "30-50%",
        description: "Cache based on meaning, not exact matches",
        implementation: "Hard",
      });
    } else if (responseType === "mixed") {
      optimizations.push({
        strategy: "Batch processing",
        expectedSavings: "15-25%",
        description: "Group similar requests to optimize API usage",
        implementation: "Hard",
      });
    }

    // Architecture-based optimizations
    if (architecture === "multi-agent") {
      optimizations.push({
        strategy: "Agent specialization",
        expectedSavings: "35-55%",
        description: "Specialized agents use cheaper models for their domain",
        implementation: "Hard",
      });
      optimizations.push({
        strategy: "Result sharing between agents",
        expectedSavings: "20-35%",
        description: "Avoid redundant processing across agent teams",
        implementation: "Medium",
      });
    } else if (architecture === "single-agent") {
      optimizations.push({
        strategy: "Response caching",
        expectedSavings: "20-40%",
        description: "Cache common queries to avoid repeat API calls",
        implementation: "Medium",
      });
    }

    // Accuracy requirement optimizations
    if (accuracyRequirement === "cost-first") {
      optimizations.unshift({
        strategy: "Aggressive model downgrading",
        expectedSavings: "60-80%",
        description: "Use the cheapest models that meet minimum requirements",
        implementation: "Easy",
      });
    } else if (accuracyRequirement === "best-possible") {
      optimizations.push({
        strategy: "Quality-first with smart routing",
        expectedSavings: "15-25%",
        description: "Maintain quality while optimizing non-critical paths",
        implementation: "Medium",
      });
    }

    // Always add basic optimizations if none selected
    if (optimizations.length === 0) {
      optimizations = [...optimizationStrategies.default];
    } else {
      // Add some universal optimizations
      optimizations.push({
        strategy: "Monitor and analyze usage",
        expectedSavings: "15-25%",
        description: "Track costs to identify optimization opportunities",
        implementation: "Easy",
      });
    }

    // Remove duplicates based on strategy name
    const uniqueOptimizations = optimizations.filter(
      (opt, index, self) =>
        index === self.findIndex((o) => o.strategy === opt.strategy),
    );

    return uniqueOptimizations;
  };

  const optimizations = getOptimizations();

  const selectBaseClass =
    "appearance-none cursor-pointer w-full p-3 bg-gray-800 border rounded-md text-white focus:outline-none focus:ring-2 transition-all duration-200 text-sm";
  const selectFocusClass = "focus:ring-emerald-500/70 focus:border-emerald-400";
  const selectHoverClass = "hover:border-emerald-400/50";
  const selectBorderClass = "border-gray-700";

  const getImplementationColor = (implementation: string) => {
    switch (implementation) {
      case "Easy":
        return "text-green-400";
      case "Medium":
        return "text-yellow-400";
      case "Hard":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const totalSavingsRange = () => {
    if (optimizations.length === 0) return "0%";

    const savings = optimizations.map((opt) => {
      const match = opt.expectedSavings.match(/(\d+)-(\d+)%/);
      return match
        ? { min: Number.parseInt(match[1]), max: Number.parseInt(match[2]) }
        : { min: 0, max: 0 };
    });

    const minTotal = Math.min(
      50,
      savings.reduce((sum, s) => sum + s.min, 0),
    );
    const maxTotal = Math.min(
      80,
      savings.reduce((sum, s) => sum + s.max, 0),
    );

    return `${minTotal}-${maxTotal}%`;
  };

  return (
    <div className="my-6 rounded-lg border-2 border-solid border-emerald-500 bg-gray-800 p-5 shadow-lg">
      <h4 className="mb-2 text-lg font-semibold text-white">
        💰 Cost Optimization Calculator
      </h4>
      <p className="mb-4 text-sm text-gray-300">
        Discover strategies to reduce your LLM costs while maintaining quality:
      </p>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="volumeSelect"
            className="mb-1 block text-sm font-medium text-gray-200"
          >
            1. What's your expected usage volume?
          </label>
          <select
            id="volumeSelect"
            value={volume}
            onChange={(e) => setVolume(e.target.value as Volume)}
            className={`${selectBaseClass} ${selectBorderClass} ${selectHoverClass} ${selectFocusClass}`}
          >
            <option value="unknown" className="bg-gray-800">
              -- Select --
            </option>
            <option value="low" className="bg-gray-800">
              Low (&lt; 100K tokens/month)
            </option>
            <option value="medium" className="bg-gray-800">
              Medium (100K - 1M tokens/month)
            </option>
            <option value="high" className="bg-gray-800">
              High (1M - 10M tokens/month)
            </option>
            <option value="enterprise" className="bg-gray-800">
              Enterprise (&gt; 10M tokens/month)
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="responseSelect"
            className="mb-1 block text-sm font-medium text-gray-200"
          >
            2. What type of responses do you need?
          </label>
          <select
            id="responseSelect"
            value={responseType}
            onChange={(e) => setResponseType(e.target.value as ResponseType)}
            className={`${selectBaseClass} ${selectBorderClass} ${selectHoverClass} ${selectFocusClass}`}
          >
            <option value="unknown" className="bg-gray-800">
              -- Select --
            </option>
            <option value="simple" className="bg-gray-800">
              Simple (Q&A, classification)
            </option>
            <option value="complex" className="bg-gray-800">
              Complex (analysis, reasoning)
            </option>
            <option value="mixed" className="bg-gray-800">
              Mixed (various complexity levels)
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="accuracySelect"
            className="mb-1 block text-sm font-medium text-gray-200"
          >
            3. How important is response accuracy?
          </label>
          <select
            id="accuracySelect"
            value={accuracyRequirement}
            onChange={(e) =>
              setAccuracyRequirement(e.target.value as AccuracyRequirement)
            }
            className={`${selectBaseClass} ${selectBorderClass} ${selectHoverClass} ${selectFocusClass}`}
          >
            <option value="unknown" className="bg-gray-800">
              -- Select --
            </option>
            <option value="cost-first" className="bg-gray-800">
              Cost-first (acceptable quality)
            </option>
            <option value="balanced" className="bg-gray-800">
              Balanced (good quality, reasonable cost)
            </option>
            <option value="high" className="bg-gray-800">
              High accuracy required
            </option>
            <option value="best-possible" className="bg-gray-800">
              Best possible (cost secondary)
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="architectureSelect"
            className="mb-1 block text-sm font-medium text-gray-200"
          >
            4. What's your agent architecture?
          </label>
          <select
            id="architectureSelect"
            value={architecture}
            onChange={(e) => setArchitecture(e.target.value as Architecture)}
            className={`${selectBaseClass} ${selectBorderClass} ${selectHoverClass} ${selectFocusClass}`}
          >
            <option value="unknown" className="bg-gray-800">
              -- Select --
            </option>
            <option value="single-agent" className="bg-gray-800">
              Single agent system
            </option>
            <option value="multi-agent" className="bg-gray-800">
              Multiple specialized agents
            </option>
            <option value="hybrid" className="bg-gray-800">
              Hybrid approach
            </option>
          </select>
        </div>
      </div>

      {(volume !== "unknown" || responseType !== "unknown") && (
        <div className="mt-6 rounded-md border border-emerald-500/50 bg-emerald-900/60 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h5 className="font-medium text-emerald-400">
              📊 Optimization Strategies:
            </h5>
            <div className="text-right">
              <div className="text-xs text-emerald-300/70">
                Potential total savings:
              </div>
              <div className="font-bold text-emerald-400">
                {totalSavingsRange()}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {optimizations.map((opt, index) => (
              <div
                key={opt.strategy}
                className="rounded border border-emerald-700/30 bg-emerald-800/30 p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-emerald-100">
                      {index + 1}. {opt.strategy}
                    </div>
                    <p className="mt-1 text-xs text-emerald-200/80">
                      {opt.description}
                    </p>
                  </div>
                  <div className="ml-3 text-right">
                    <div className="text-sm font-bold text-emerald-400">
                      {opt.expectedSavings}
                    </div>
                    <div
                      className={`text-xs ${getImplementationColor(
                        opt.implementation,
                      )}`}
                    >
                      {opt.implementation}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded border border-emerald-600/50 bg-emerald-900/40 p-3">
            <h6 className="mb-2 text-sm font-medium text-emerald-300">
              💡 Implementation Tips:
            </h6>
            <ul className="space-y-1 text-xs text-emerald-200/70">
              <li>
                • Start with <span className="text-green-400">Easy</span>{" "}
                strategies first for quick wins
              </li>
              <li>
                • Implement monitoring before optimization to measure impact
              </li>
              <li>
                • Test thoroughly - cost savings shouldn't compromise user
                experience
              </li>
              <li>
                • Consider implementing strategies gradually to minimize risk
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
