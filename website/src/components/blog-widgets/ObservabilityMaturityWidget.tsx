import React, { useState } from "react";

interface MaturityLevel {
  level: number;
  title: string;
  description: string;
  characteristics: string[];
  tools: string[];
  nextSteps: string[];
}

const maturityLevels: MaturityLevel[] = [
  {
    level: 1,
    title: "None - Flying Blind",
    description:
      "No observability in place. You're essentially guessing what's happening in production.",
    characteristics: [
      "No logging or monitoring",
      "Users report issues before you know about them",
      "No idea about costs or performance",
      "Debugging is pure guesswork",
    ],
    tools: ["Basic console.log", "User complaints", "Manual testing"],
    nextSteps: [
      "Add basic logging",
      "Set up error tracking",
      "Monitor basic metrics",
    ],
  },
  {
    level: 2,
    title: "Basic - Some Visibility",
    description:
      "Basic logging and error tracking in place, but limited insights into LLM-specific behavior.",
    characteristics: [
      "Basic application logs",
      "Error tracking (Sentry, etc.)",
      "Simple uptime monitoring",
      "Manual cost tracking",
    ],
    tools: ["Application logs", "Error tracking tools", "Basic monitoring"],
    nextSteps: [
      "Add LLM-specific tracing",
      "Track token usage and costs",
      "Implement basic quality metrics",
    ],
  },
  {
    level: 3,
    title: "Intermediate - LLM Aware",
    description:
      "LLM-specific observability tools in place with basic tracing and cost monitoring.",
    characteristics: [
      "LLM request/response logging",
      "Token usage and cost tracking",
      "Basic performance metrics",
      "Simple quality assessments",
    ],
    tools: ["Langfuse", "LangSmith", "Custom dashboards", "Cost tracking"],
    nextSteps: [
      "Implement automated evaluations",
      "Add prompt versioning",
      "Set up alerting",
    ],
  },
  {
    level: 4,
    title: "Advanced - Systematic Quality",
    description:
      "Comprehensive observability with automated evaluations, prompt management, and proactive monitoring.",
    characteristics: [
      "Automated quality evaluations",
      "Prompt versioning and A/B testing",
      "Proactive alerting",
      "Performance optimization",
    ],
    tools: [
      "Full observability stack",
      "Automated testing",
      "A/B testing platforms",
    ],
    nextSteps: [
      "Optimize for specific business metrics",
      "Implement advanced ML monitoring",
      "Build custom evaluation frameworks",
    ],
  },
  {
    level: 5,
    title: "Expert - Business Optimized",
    description:
      "Observability directly tied to business outcomes with advanced analytics and continuous optimization.",
    characteristics: [
      "Business-metric driven monitoring",
      "Advanced ML model monitoring",
      "Continuous optimization loops",
      "Predictive quality assurance",
    ],
    tools: [
      "Custom ML platforms",
      "Business intelligence integration",
      "Predictive analytics",
    ],
    nextSteps: [
      "Share knowledge with community",
      "Contribute to open source tools",
      "Mentor other teams",
    ],
  },
];

const quizQuestions = [
  {
    question: "How do you currently monitor your LLM application?",
    answers: [
      { text: "We don't monitor it", level: 1 },
      { text: "Basic application logs only", level: 2 },
      { text: "LLM-specific logging and cost tracking", level: 3 },
      { text: "Comprehensive tracing with automated evaluations", level: 4 },
      {
        text: "Business-metric driven monitoring with ML optimization",
        level: 5,
      },
    ],
  },
  {
    question: "How do you handle quality assurance?",
    answers: [
      { text: "Manual testing only", level: 1 },
      { text: "Basic error tracking", level: 2 },
      { text: "Some manual evaluation processes", level: 3 },
      { text: "Automated evaluation pipelines", level: 4 },
      {
        text: "Continuous quality optimization with business metrics",
        level: 5,
      },
    ],
  },
  {
    question: "How do you manage prompts?",
    answers: [
      { text: "Hardcoded in the application", level: 1 },
      { text: "In configuration files", level: 2 },
      { text: "Centralized prompt management", level: 3 },
      { text: "Versioned prompts with A/B testing", level: 4 },
      { text: "AI-optimized prompt generation and testing", level: 5 },
    ],
  },
  {
    question: "How do you handle production issues?",
    answers: [
      { text: "Users report them to us", level: 1 },
      { text: "We get basic error notifications", level: 2 },
      { text: "We have monitoring dashboards", level: 3 },
      { text: "Proactive alerts with automated responses", level: 4 },
      { text: "Predictive issue detection and prevention", level: 5 },
    ],
  },
];

export default function ObservabilityMaturityWidget(): JSX.Element {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<number | null>(null);

  const handleQuizAnswer = (questionIndex: number, level: number) => {
    const newAnswers = [...quizAnswers];
    newAnswers[questionIndex] = level;
    setQuizAnswers(newAnswers);

    if (
      newAnswers.length === quizQuestions.length &&
      newAnswers.every((a) => a > 0)
    ) {
      const averageLevel = Math.round(
        newAnswers.reduce((sum, level) => sum + level, 0) / newAnswers.length,
      );
      setQuizResult(averageLevel);
    }
  };

  const resetQuiz = () => {
    setQuizAnswers([]);
    setQuizResult(null);
    setShowQuiz(false);
  };

  const getLevelColor = (level: number) => {
    const colors = [
      "border-red-500 bg-gray-800",
      "border-orange-500 bg-gray-800",
      "border-yellow-500 bg-gray-800",
      "border-emerald-500 bg-gray-800",
      "border-green-500 bg-gray-800",
    ];
    return colors[level - 1] || colors[0];
  };

  return (
    <div className="my-6 p-6 border-2 border-emerald-500 bg-gray-900 rounded-lg shadow-lg">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-emerald-400 mb-2">
          LLM Observability Maturity Model
        </h3>
        <p className="text-gray-300 text-sm">
          Discover where you stand in your observability journey and learn
          what's next.
        </p>
      </div>

      {!showQuiz && !quizResult && (
        <div className="space-y-4">
          <div className="grid gap-4">
            {maturityLevels.map((level) => (
              <div
                key={level.level}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedLevel === level.level
                    ? getLevelColor(level.level)
                    : "bg-gray-800 border-gray-600 hover:border-emerald-500"
                }`}
                onClick={() =>
                  setSelectedLevel(
                    selectedLevel === level.level ? null : level.level,
                  )
                }
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-emerald-400">
                    Level {level.level}: {level.title}
                  </h4>
                  <span className="text-gray-400">
                    {selectedLevel === level.level ? "−" : "+"}
                  </span>
                </div>

                {selectedLevel === level.level && (
                  <div className="mt-4 space-y-4">
                    <p className="text-gray-300">{level.description}</p>

                    <div>
                      <h5 className="font-medium text-emerald-300 mb-2">
                        Characteristics:
                      </h5>
                      <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                        {level.characteristics.map((char, idx) => (
                          <li key={idx}>{char}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h5 className="font-medium text-emerald-300 mb-2">
                        Typical Tools:
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {level.tools.map((tool, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-700 text-emerald-300 rounded text-xs"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-emerald-300 mb-2">
                        Next Steps:
                      </h5>
                      <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                        {level.nextSteps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setShowQuiz(true)}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Take the Assessment Quiz
            </button>
          </div>
        </div>
      )}

      {showQuiz && !quizResult && (
        <div className="space-y-6">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-emerald-400 mb-2">
              Assessment Quiz
            </h4>
            <p className="text-gray-300 text-sm">
              Answer these questions to discover your current maturity level.
            </p>
          </div>

          {quizQuestions.map((question, qIdx) => (
            <div key={qIdx} className="bg-gray-800 p-4 rounded-lg">
              <h5 className="font-medium text-emerald-300 mb-3">
                {qIdx + 1}. {question.question}
              </h5>
              <div className="space-y-2">
                {question.answers.map((answer, aIdx) => (
                  <label
                    key={aIdx}
                    className="flex items-center space-x-3 cursor-pointer hover:bg-gray-700 p-2 rounded"
                  >
                    <input
                      type="radio"
                      name={`question-${qIdx}`}
                      value={answer.level}
                      onChange={() => handleQuizAnswer(qIdx, answer.level)}
                      className="text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-gray-300 text-sm">{answer.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="text-center">
            <button
              onClick={resetQuiz}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Reset Quiz
            </button>
          </div>
        </div>
      )}

      {quizResult && (
        <div className="text-center space-y-4">
          <div
            className={`p-6 rounded-lg border-2 ${getLevelColor(quizResult)}`}
          >
            <h4 className="text-xl font-bold text-emerald-400 mb-2">
              Your Maturity Level: {quizResult}
            </h4>
            <h5 className="text-lg font-semibold text-emerald-300 mb-3">
              {maturityLevels[quizResult - 1].title}
            </h5>
            <p className="text-gray-300 mb-4">
              {maturityLevels[quizResult - 1].description}
            </p>

            <div className="text-left">
              <h6 className="font-medium text-emerald-300 mb-2">
                Recommended Next Steps:
              </h6>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                {maturityLevels[quizResult - 1].nextSteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={resetQuiz}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            Take Quiz Again
          </button>
        </div>
      )}

      <div className="mt-6 text-xs text-gray-400 border-t border-gray-700 pt-4">
        <strong className="text-emerald-400">Tip:</strong> Most teams start at
        Level 1-2. The key is continuous improvement - each level builds on the
        previous one.
      </div>
    </div>
  );
}
