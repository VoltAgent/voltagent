import type React from "react";
import Link from "@docusaurus/Link";
import { BoltIcon } from "@heroicons/react/24/solid";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

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
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#1d1d1d] backdrop-blur-md border-solid border-0 border-b-2 border-[#1a2533]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
        {/* Mobile Layout */}
        <div className="block md:hidden">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-3">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex mr-2 items-center border-2 border-solid border-[#00d992] rounded-full p-1">
                <BoltIcon className="w-4 h-4 text-[#00d992]" />
              </div>
              <span className="text-lg font-bold text-[#00d992]">
                voltagent
              </span>
              <span className="ml-2 text-sm font-medium text-gray-400">
                Tutorial
              </span>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center space-x-2">
              <Link
                to="/docs"
                className="text-xs font-medium text-[#cbd5e0] hover:text-[#00d992] transition-colors no-underline"
              >
                Exit
              </Link>
              <Link
                to="https://console.voltagent.dev"
                className="inline-flex items-center px-2 py-1 text-xs font-medium bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded hover:bg-[#00c085] transition-all duration-300 no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Console
              </Link>
            </div>
          </div>

          {/* Mobile Progress */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-medium text-[#e2e8f0] whitespace-nowrap">
                Step {currentStep}/{totalSteps}
              </span>
              <div className="flex-1 bg-[#4a5568] rounded-full h-1.5">
                <div
                  className="bg-[#00d992] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-[#e2e8f0] whitespace-nowrap">
                {Math.round((currentStep / totalSteps) * 100)}%
              </span>
            </div>

            {/* Mobile Step Navigation - Simplified */}
            <div className="flex items-center justify-center space-x-1 overflow-x-auto">
              {steps.map((step) => (
                <Link
                  key={step.number}
                  to={step.url}
                  className={`px-2 py-1 rounded text-xs font-medium no-underline transition-all duration-300 whitespace-nowrap ${
                    step.number === currentStep
                      ? "bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20"
                      : step.number < currentStep
                        ? "bg-[#4a5568]/10 text-[#f7fafc] hover:bg-[#718096]"
                        : "bg-[#2d3748]/40 border-solid border border-[#2d3748]/20 text-[#a0aec0] cursor-not-allowed"
                  }`}
                  style={
                    step.number > currentStep ? { pointerEvents: "none" } : {}
                  }
                >
                  {step.number}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center justify-center">
            <div className="flex mr-2 items-center border-2 border-solid border-[#00d992] rounded-full p-1">
              <BoltIcon className="w-5 h-5 sm:w-5 sm:h-5 text-[#00d992]" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-[#00d992]">
              voltagent
            </span>
            <div className="relative">
              <span className="ml-2 font-medium text-gray-400">Tutorial</span>
            </div>
          </div>

          {/* Tutorial Progress */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-[#e2e8f0] whitespace-nowrap">
                Step {currentStep} of {totalSteps}
              </span>
              <div className="flex-1 bg-[#4a5568] rounded-full h-2">
                <div
                  className="bg-[#00d992] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-[#e2e8f0] whitespace-nowrap">
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
                      ? "bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20"
                      : step.number < currentStep
                        ? "bg-[#4a5568]/10 text-[#f7fafc] hover:bg-[#718096]"
                        : "bg-[#2d3748]/40 border-solid border border-[#2d3748]/20 text-[#a0aec0] cursor-not-allowed"
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
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-[#cbd5e0] hover:text-[#00d992] transition-colors no-underline"
            >
              Exit Tutorial
            </Link>

            {/* Console Link */}
            <Link
              to="https://console.voltagent.dev"
              className="inline-flex items-center px-4 py-2 text-sm font-medium bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-lg hover:bg-[#00c085] transition-all duration-300 shadow-lg hover:shadow-xl no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
              Console
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
