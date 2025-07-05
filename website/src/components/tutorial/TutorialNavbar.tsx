import type React from "react";
import Link from "@docusaurus/Link";
import { BoltIcon } from "@heroicons/react/24/solid";

interface TutorialNavbarProps {
  currentStep: number;
  totalSteps: number;
}

export const TutorialNavbar: React.FC<TutorialNavbarProps> = ({
  currentStep,
  totalSteps,
}) => {
  const steps = [
    { number: 1, title: "Introduction", url: "/tutorial/introduction" },
    { number: 2, title: "Chatbot Problem", url: "/tutorial/chatbot-problem" },
    { number: 3, title: "Memory", url: "/tutorial/memory" },
    { number: 4, title: "MCP", url: "/tutorial/mcp" },
    { number: 5, title: "Subagents", url: "/tutorial/subagents" },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center space-x-3 group no-underline"
          >
            <div className="flex items-center border-2 border-solid border-[#00d992] rounded-full p-1">
              <BoltIcon className="w-5 h-5 text-[#00d992]" />
            </div>
            <span className="text-2xl font-bold text-[#00d992] group-hover:text-[#00d992]/80 transition-colors">
              voltagent
            </span>
            <span className="text-sm font-medium text-gray-400 ml-2">
              Tutorial
            </span>
          </Link>

          {/* Tutorial Progress */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-400">
                Step {currentStep} of {totalSteps}
              </span>
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-[#00d992] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-400">
                {Math.round((currentStep / totalSteps) * 100)}%
              </span>
            </div>

            {/* Step Navigation */}
            <div className="flex items-center justify-center space-x-2 mt-3">
              {steps.map((step) => (
                <Link
                  key={step.number}
                  to={step.url}
                  className={`px-3 py-1 rounded-full text-xs font-medium no-underline transition-all duration-300 ${
                    step.number === currentStep
                      ? "bg-[#00d992] text-gray-900"
                      : step.number < currentStep
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-800 text-gray-500 cursor-not-allowed"
                  }`}
                  style={
                    step.number > currentStep ? { pointerEvents: "none" } : {}
                  }
                >
                  {step.number}. {step.title}
                </Link>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Exit Tutorial */}
            <Link
              to="/docs"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:text-[#00d992] transition-colors no-underline"
            >
              Exit Tutorial
            </Link>

            {/* Console Link */}
            <Link
              to="https://console.voltagent.dev"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-[#00d992] rounded-lg hover:bg-[#00d992]/80 transition-all duration-300 shadow-lg hover:shadow-xl no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Open console</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Console
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
