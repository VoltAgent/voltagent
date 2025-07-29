import type React from "react";
import { useState } from "react";

interface MetricFeature {
  name: string;
  description: string;
}

interface EvaluationMetric {
  name: string;
  category: string;
  features: MetricFeature[];
  strengths: string[];
  bestFor: string[];
  limitations: string[];
}

const metrics: EvaluationMetric[] = [
  {
    name: "BLEU",
    category: "Traditional NLP",
    features: [
      {
        name: "N-gram Matching",
        description: "Compares word sequences between output and reference",
      },
      {
        name: "Precision-based",
        description: "Focuses on how much of the output matches reference",
      },
      {
        name: "Fast Computation",
        description: "Very quick to calculate for large datasets",
      },
    ],
    strengths: [
      "Well-established benchmark",
      "Fast and reliable",
      "Good for translation tasks",
    ],
    bestFor: [
      "Machine translation",
      "Tasks with clear right answers",
      "Quick automated testing",
    ],
    limitations: [
      "Poor for creative tasks",
      "Doesn't understand semantics",
      "Sensitive to word choice",
    ],
  },
  {
    name: "ROUGE",
    category: "Traditional NLP",
    features: [
      {
        name: "Recall-oriented",
        description: "Focuses on capturing important information",
      },
      {
        name: "Multiple variants",
        description: "ROUGE-N, ROUGE-L, ROUGE-S for different needs",
      },
      {
        name: "Summarization focus",
        description: "Designed specifically for text summarization",
      },
    ],
    strengths: [
      "Great for summarization",
      "Captures key information",
      "Industry standard",
    ],
    bestFor: [
      "Text summarization",
      "Information extraction",
      "Content coverage assessment",
    ],
    limitations: [
      "Word-level matching only",
      "Misses semantic meaning",
      "Not ideal for dialogue",
    ],
  },
  {
    name: "BERTScore",
    category: "Modern Semantic",
    features: [
      {
        name: "Contextual embeddings",
        description: "Uses BERT-like models to understand meaning",
      },
      {
        name: "Semantic similarity",
        description: "Compares meaning rather than exact words",
      },
      {
        name: "Token-level matching",
        description: "Matches tokens based on contextual similarity",
      },
    ],
    strengths: [
      "Understands paraphrases",
      "Captures semantic meaning",
      "Better correlation with humans",
    ],
    bestFor: [
      "Creative text generation",
      "Paraphrase evaluation",
      "Semantic quality assessment",
    ],
    limitations: [
      "Computationally expensive",
      "Requires pre-trained models",
      "Can be slow for large datasets",
    ],
  },
  {
    name: "BLEURT",
    category: "Modern Semantic",
    features: [
      {
        name: "Human-trained",
        description: "Trained on human quality judgments",
      },
      {
        name: "Quality prediction",
        description: "Predicts human ratings of text quality",
      },
      {
        name: "Robust evaluation",
        description: "More robust to different text styles",
      },
    ],
    strengths: [
      "Aligns with human judgment",
      "Handles diverse text types",
      "Quality-focused scoring",
    ],
    bestFor: [
      "Quality assessment",
      "Human evaluation proxy",
      "Content generation tasks",
    ],
    limitations: [
      "Requires specific models",
      "Slower than traditional metrics",
      "Limited to training data bias",
    ],
  },
  {
    name: "Custom Business Metrics",
    category: "Task-specific",
    features: [
      {
        name: "Domain-specific",
        description: "Tailored to your specific use case",
      },
      {
        name: "Business alignment",
        description: "Directly measures business outcomes",
      },
      {
        name: "User-centric",
        description: "Focuses on actual user satisfaction",
      },
    ],
    strengths: [
      "Perfect business alignment",
      "Measures what matters",
      "User-focused results",
    ],
    bestFor: [
      "Production applications",
      "Business-critical systems",
      "User experience optimization",
    ],
    limitations: [
      "Requires custom development",
      "Hard to benchmark against",
      "May be subjective",
    ],
  },
];

export default function EvaluationMetricsComparison(): JSX.Element {
  const [selectedMetric, setSelectedMetric] = useState<EvaluationMetric | null>(
    null,
  );

  const cardBaseClass =
    "cursor-pointer border rounded-lg p-4 transition-all duration-300";
  const cardInactiveClass =
    "bg-gray-800 border-gray-700 hover:border-emerald-500/50";
  const cardActiveClass = "bg-gray-700 border-emerald-500";

  const handleSelectMetric = (metric: EvaluationMetric) => {
    setSelectedMetric(selectedMetric?.name === metric.name ? null : metric);
  };

  const handleKeyDown = (e: React.KeyboardEvent, metric: EvaluationMetric) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelectMetric(metric);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Traditional NLP":
        return "bg-blue-900 text-blue-200";
      case "Modern Semantic":
        return "bg-emerald-900 text-emerald-200";
      case "Task-specific":
        return "bg-purple-900 text-purple-200";
      default:
        return "bg-gray-900 text-gray-300";
    }
  };

  return (
    <div className="my-8">
      <div className="mb-4 text-center">
        <h3 className="text-xl font-bold text-white mb-2">
          LLM Evaluation Metrics Comparison
        </h3>
        <p className="text-gray-300 text-sm">
          Click on a metric to see its features, strengths, and limitations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {metrics.map((metric) => (
          <button
            key={metric.name}
            type="button"
            className={`${cardBaseClass} ${
              selectedMetric?.name === metric.name
                ? cardActiveClass
                : cardInactiveClass
            }`}
            onClick={() => handleSelectMetric(metric)}
            onKeyDown={(e) => handleKeyDown(e, metric)}
            aria-pressed={selectedMetric?.name === metric.name}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-emerald-400">{metric.name}</h4>
              <span
                className={`text-xs rounded-full px-2 py-1 ${getCategoryColor(
                  metric.category,
                )}`}
              >
                {metric.category}
              </span>
            </div>
          </button>
        ))}
      </div>

      {selectedMetric && (
        <div className="border border-emerald-500/50 rounded-lg p-5 bg-gray-800/80 animate-fadeIn">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-emerald-400">
              {selectedMetric.name}
            </h3>
            <span
              className={`text-sm px-3 py-1 rounded-full ${getCategoryColor(
                selectedMetric.category,
              )}`}
            >
              {selectedMetric.category}
            </span>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-emerald-300 mb-2">
              Key Features:
            </h4>
            <ul className="space-y-1">
              {selectedMetric.features.map((feature) => (
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
              {selectedMetric.strengths.map((strength) => (
                <span
                  key={strength}
                  className="text-xs bg-emerald-900/30 text-emerald-200 px-2 py-1 rounded-full"
                >
                  {strength}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-emerald-300 mb-2">
              Best Used For:
            </h4>
            <ul className="space-y-1">
              {selectedMetric.bestFor.map((use) => (
                <li
                  key={use}
                  className="text-sm text-gray-300 flex items-center"
                >
                  <span className="text-emerald-500 mr-2">•</span> {use}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-red-300 mb-2">
              Limitations:
            </h4>
            <ul className="space-y-1">
              {selectedMetric.limitations.map((limitation) => (
                <li
                  key={limitation}
                  className="text-sm text-gray-300 flex items-center"
                >
                  <span className="text-red-500 mr-2">•</span> {limitation}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!selectedMetric && (
        <div className="border border-gray-700 rounded-lg p-5 bg-gray-800/30 text-center">
          <p className="text-gray-400">
            Select a metric above to view its details and trade-offs
          </p>
        </div>
      )}
    </div>
  );
}
