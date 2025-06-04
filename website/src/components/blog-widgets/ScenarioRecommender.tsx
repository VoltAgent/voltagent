import React, { useState } from "react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

type Requirement = {
  question: string;
  options: string[];
  weight: {
    rag: number;
    finetuning: number;
  }[];
};

const requirements: Requirement[] = [
  {
    question: "How often does your data change?",
    options: ["Multiple times daily", "Weekly/Monthly", "Rarely/Never"],
    weight: [
      { rag: 10, finetuning: 0 },
      { rag: 5, finetuning: 5 },
      { rag: 0, finetuning: 10 },
    ],
  },
  {
    question: "What's your response time requirement?",
    options: ["Sub-second", "Few seconds ok", "Response time not critical"],
    weight: [
      { rag: 0, finetuning: 10 },
      { rag: 5, finetuning: 5 },
      { rag: 10, finetuning: 5 },
    ],
  },
  {
    question: "What's your data volume?",
    options: ["Small (<100MB)", "Medium (100MB-1GB)", "Large (>1GB)"],
    weight: [
      { rag: 5, finetuning: 10 },
      { rag: 8, finetuning: 5 },
      { rag: 10, finetuning: 2 },
    ],
  },
];

export default function ScenarioRecommender(): JSX.Element {
  const [answers, setAnswers] = useState<number[]>(
    new Array(requirements.length).fill(-1),
  );
  const [showResult, setShowResult] = useState(false);

  const calculateRecommendation = () => {
    let ragScore = 0;
    let finetuningScore = 0;

    answers.forEach((answer, index) => {
      if (answer !== -1) {
        ragScore += requirements[index].weight[answer].rag;
        finetuningScore += requirements[index].weight[answer].finetuning;
      }
    });

    return {
      recommended: ragScore > finetuningScore ? "RAG" : "Fine-tuning",
      ragScore: (ragScore / (answers.length * 10)) * 100,
      finetuningScore: (finetuningScore / (answers.length * 10)) * 100,
    };
  };

  const result = calculateRecommendation();

  return (
    <div className="border-2 border-solid border-emerald-500 rounded-lg p-5 mb-6 bg-gray-800">
      <h3 className="text-xl font-bold text-white mb-4">
        Find Your Ideal Approach
      </h3>

      {requirements.map((req, index) => (
        <div key={req.question} className="mb-6">
          <p className="text-white mb-2">{req.question}</p>
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
                className={`px-4 py-2 rounded-md transition-all duration-200
                  ${
                    answers[index] === optIndex
                      ? "bg-emerald-700 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
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
              Recommendation: {result.recommended}
            </h4>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-300 mb-1">
                  <span>RAG Score</span>
                  <span>{Math.round(result.ragScore)}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-emerald-500 rounded-full h-2"
                    style={{ width: `${result.ragScore}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm text-gray-300 mb-1">
                  <span>Fine-tuning Score</span>
                  <span>{Math.round(result.finetuningScore)}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-emerald-500 rounded-full h-2"
                    style={{ width: `${result.finetuningScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-300">
              <h5 className="font-medium text-white mb-2">
                Key Considerations:
              </h5>
              <ul className="space-y-2">
                {result.recommended === "RAG" ? (
                  <>
                    <li className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-emerald-500 mr-2" />
                      Better for frequently changing data
                    </li>
                    <li className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-emerald-500 mr-2" />
                      More cost-effective for large datasets
                    </li>
                    <li className="flex items-center">
                      <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                      May have higher latency
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-emerald-500 mr-2" />
                      Better for static knowledge
                    </li>
                    <li className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-emerald-500 mr-2" />
                      Lower latency responses
                    </li>
                    <li className="flex items-center">
                      <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                      Higher upfront cost
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
