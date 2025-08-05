import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import React, { useState } from "react";

type Requirement = {
  question: string;
  options: string[];
  weight: {
    automatic: number;
    human: number;
    hybrid: number;
  }[];
};

const requirements: Requirement[] = [
  {
    question: "What's your evaluation budget?",
    options: ["Limited budget", "Moderate budget", "High budget available"],
    weight: [
      { automatic: 10, human: 0, hybrid: 3 },
      { automatic: 7, human: 5, hybrid: 8 },
      { automatic: 5, human: 10, hybrid: 10 },
    ],
  },
  {
    question: "How often do you need to evaluate?",
    options: ["Continuously/Daily", "Weekly/Monthly", "Occasionally"],
    weight: [
      { automatic: 10, human: 2, hybrid: 7 },
      { automatic: 7, human: 5, hybrid: 8 },
      { automatic: 3, human: 10, hybrid: 5 },
    ],
  },
  {
    question: "What type of task are you evaluating?",
    options: ["Creative/Open-ended", "Structured/Factual", "Mixed tasks"],
    weight: [
      { automatic: 2, human: 10, hybrid: 8 },
      { automatic: 10, human: 5, hybrid: 7 },
      { automatic: 5, human: 7, hybrid: 10 },
    ],
  },
  {
    question: "How critical is evaluation accuracy?",
    options: ["Mission-critical", "Important but not critical", "Nice to have"],
    weight: [
      { automatic: 3, human: 10, hybrid: 9 },
      { automatic: 7, human: 7, hybrid: 8 },
      { automatic: 10, human: 3, hybrid: 5 },
    ],
  },
  {
    question: "Do you have domain experts available?",
    options: ["Yes, readily available", "Limited availability", "No domain experts"],
    weight: [
      { automatic: 3, human: 10, hybrid: 9 },
      { automatic: 7, human: 5, hybrid: 8 },
      { automatic: 10, human: 2, hybrid: 4 },
    ],
  },
];

export default function EvaluationMethodRecommender(): JSX.Element {
  const [answers, setAnswers] = useState<number[]>(new Array(requirements.length).fill(-1));
  const [showResult, setShowResult] = useState(false);

  const calculateRecommendation = () => {
    let automaticScore = 0;
    let humanScore = 0;
    let hybridScore = 0;

    answers.forEach((answer, index) => {
      if (answer !== -1) {
        automaticScore += requirements[index].weight[answer].automatic;
        humanScore += requirements[index].weight[answer].human;
        hybridScore += requirements[index].weight[answer].hybrid;
      }
    });

    const totalQuestions = answers.filter((a) => a !== -1).length;
    const maxScore = totalQuestions * 10;

    const scores = {
      automatic: (automaticScore / maxScore) * 100,
      human: (humanScore / maxScore) * 100,
      hybrid: (hybridScore / maxScore) * 100,
    };

    let recommended = "Automatic";
    let maxScoreValue = scores.automatic;

    if (scores.human > maxScoreValue) {
      recommended = "Human";
      maxScoreValue = scores.human;
    }

    if (scores.hybrid > maxScoreValue) {
      recommended = "Hybrid";
      maxScoreValue = scores.hybrid;
    }

    return {
      recommended,
      scores,
    };
  };

  const result = calculateRecommendation();

  const getMethodDetails = (method: string) => {
    switch (method) {
      case "Automatic":
        return {
          pros: [
            "Fast and scalable",
            "Consistent results",
            "Low cost per evaluation",
            "Easy to automate",
          ],
          cons: ["May miss nuances", "Limited to metric coverage", "Less insight into quality"],
        };
      case "Human":
        return {
          pros: [
            "Captures nuances and context",
            "High-quality insights",
            "Domain expertise",
            "Subjective quality assessment",
          ],
          cons: ["Expensive and slow", "Not easily scalable", "Potential bias"],
        };
      case "Hybrid":
        return {
          pros: [
            "Best of both worlds",
            "Scalable with quality",
            "Comprehensive evaluation",
            "Balanced approach",
          ],
          cons: ["More complex to set up", "Requires coordination", "Medium cost"],
        };
      default:
        return { pros: [], cons: [] };
    }
  };

  const details = getMethodDetails(result.recommended);

  return (
    <div className="border-2 border-solid border-emerald-500 rounded-lg p-5 mb-6 bg-gray-800">
      <h3 className="text-xl font-bold text-white mb-4">Find Your Ideal Evaluation Method</h3>
      <p className="text-gray-300 text-sm mb-6">
        Answer these questions to get a personalized recommendation for your LLM evaluation approach
      </p>

      {requirements.map((req, index) => (
        <div key={req.question} className="mb-6">
          <p className="text-white mb-3 font-medium">{req.question}</p>
          <div className="flex flex-wrap gap-2">
            {req.options.map((option, optIndex) => (
              <button
                type="button"
                key={option}
                onClick={() => {
                  const newAnswers = [...answers];
                  newAnswers[index] = optIndex;
                  setAnswers(newAnswers);
                  setShowResult(newAnswers.every((a) => a !== -1));
                }}
                className={`px-4 py-2 rounded-md transition-all duration-200 text-sm
                  ${
                    answers[index] === optIndex
                      ? "bg-emerald-700 text-white border border-emerald-500"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600"
                  }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}

      {showResult && (
        <div className="mt-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">
              Recommended Approach:
              <span className="text-emerald-400 ml-2">{result.recommended} Evaluation</span>
            </h4>

            <div className="space-y-4 mb-6">
              <div>
                <div className="flex justify-between text-sm text-gray-300 mb-1">
                  <span>Automatic Evaluation</span>
                  <span>{Math.round(result.scores.automatic)}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-blue-500 rounded-full h-2 transition-all duration-500"
                    style={{ width: `${result.scores.automatic}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm text-gray-300 mb-1">
                  <span>Human Evaluation</span>
                  <span>{Math.round(result.scores.human)}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-purple-500 rounded-full h-2 transition-all duration-500"
                    style={{ width: `${result.scores.human}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm text-gray-300 mb-1">
                  <span>Hybrid Approach</span>
                  <span>{Math.round(result.scores.hybrid)}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-emerald-500 rounded-full h-2 transition-all duration-500"
                    style={{ width: `${result.scores.hybrid}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-emerald-300 mb-2 flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Advantages:
                </h5>
                <ul className="space-y-1">
                  {details.pros.map((pro) => (
                    <li key={pro} className="flex items-center text-sm text-gray-300">
                      <span className="text-emerald-500 mr-2">•</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h5 className="font-medium text-red-300 mb-2 flex items-center">
                  <XCircleIcon className="h-4 w-4 mr-1" />
                  Considerations:
                </h5>
                <ul className="space-y-1">
                  {details.cons.map((con) => (
                    <li key={con} className="flex items-center text-sm text-gray-300">
                      <span className="text-red-500 mr-2">•</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <h5 className="font-medium text-white mb-2">💡 Implementation Tip:</h5>
              <p className="text-sm text-gray-300">
                {result.recommended === "Automatic" &&
                  "Start with BLEU/ROUGE for quick feedback, then add BERTScore for semantic understanding. Set up automated pipelines for continuous evaluation."}
                {result.recommended === "Human" &&
                  "Recruit domain experts and create evaluation guidelines. Use platforms like Amazon Mechanical Turk for scale, but ensure quality control with expert reviewers."}
                {result.recommended === "Hybrid" &&
                  "Use automatic metrics for rapid iteration and human evaluation for quality assurance. Run automatic evaluation on every change, human evaluation weekly or before releases."}
              </p>
            </div>
          </div>
        </div>
      )}

      {!showResult && (
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30 text-center">
          <p className="text-gray-400">
            Answer all questions above to get your personalized recommendation
          </p>
          <div className="flex justify-center mt-2">
            <div className="flex space-x-1">
              {requirements.map((_, index) => (
                <div
                  key={`progress-indicator-${requirements[index].question.slice(0, 10)}`}
                  className={`w-2 h-2 rounded-full ${
                    answers[index] !== -1 ? "bg-emerald-500" : "bg-gray-600"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
