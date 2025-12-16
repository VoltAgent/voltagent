import Link from "@docusaurus/Link";
import { ArrowRightIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";
import type React from "react";

// Santa Claus Icon Component
const SantaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="13" r="8" fill="#FDBF6F" />
    <path d="M4 11C4 11 5 4 12 4C19 4 20 11 20 11L12 9L4 11Z" fill="#CC0000" />
    <ellipse cx="12" cy="11" rx="9" ry="2" fill="white" />
    <circle cx="19" cy="5" r="2.5" fill="white" />
    <path d="M12 4C12 4 16 3 19 5" stroke="#CC0000" strokeWidth="3" strokeLinecap="round" />
    <circle cx="9" cy="12" r="1" fill="#333" />
    <circle cx="15" cy="12" r="1" fill="#333" />
    <circle cx="7" cy="14" r="1.2" fill="#FF9999" opacity="0.6" />
    <circle cx="17" cy="14" r="1.2" fill="#FF9999" opacity="0.6" />
    <circle cx="12" cy="14" r="1.2" fill="#E88" />
    <path
      d="M4 15C4 15 4 22 12 22C20 22 20 15 20 15C20 15 18 16 12 16C6 16 4 15 4 15Z"
      fill="white"
    />
    <path
      d="M7 15.5C7 15.5 9 16.5 12 16.5C15 16.5 17 15.5 17 15.5C17 15.5 15 17 12 17C9 17 7 15.5 7 15.5Z"
      fill="white"
    />
  </svg>
);

interface TutorialNavbarProps {
  currentStep: number;
  totalSteps: number;
}

export const TutorialNavbar: React.FC<TutorialNavbarProps> = ({ currentStep, totalSteps }) => {
  const steps = [
    { number: 1, title: "Introduction", url: "/tutorial/introduction" },
    { number: 2, title: "Chatbot Problem", url: "/tutorial/chatbot-problem" },
    { number: 3, title: "Memory", url: "/tutorial/memory" },
    { number: 4, title: "MCP", url: "/tutorial/mcp" },
    { number: 5, title: "Subagents", url: "/tutorial/subagents" },
  ];

  return (
    <>
      {/* GitHub Banner */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-emerald-500 to-emerald-500 backdrop-blur-sm border-0 border-b border-solid border-emerald-500/20">
        <Link
          to="https://github.com/VoltAgent/voltagent/stargazers"
          className="block w-full no-underline hover:bg-gradient-to-r hover:from-emerald-400/10 hover:to-emerald-500/10 transition-all duration-300"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="w-full">
            <div className="flex items-center justify-center text-center py-2">
              <span className="text-xs sm:text-sm font-medium text-emerald-500">
                ⭐ We're open source - a GitHub star means a lot to us. Thank you for the support!
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Main Navbar */}
      <div className="fixed top-8 sm:top-8 left-0 right-0 z-50 bg-background backdrop-blur-md border-0 border-b border-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-3">
          {/* Mobile Layout */}
          <div className="block md:hidden">
            {/* Mobile Header */}
            <div className="flex items-center justify-between mb-3">
              {/* Logo */}
              <Link to="/docs" className="flex items-center no-underline">
                <SantaIcon className="w-5 h-5 mr-2" />
                <span className="text-lg font-bold text-main-emerald">voltagent</span>
                <span className="ml-2  text-sm  font-medium text-muted-foreground">Tutorial</span>
              </Link>

              {/* Mobile Actions */}
              <div className="flex items-center space-x-2">
                <Link
                  to="/docs"
                  className="text-xs font-medium text-muted-foreground hover:text-main-emerald transition-colors no-underline"
                >
                  Exit
                </Link>
                <Link
                  to="https://console.voltagent.dev"
                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded hover:bg-emerald-400/40 transition-all duration-300 no-underline"
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
                <span className="text-xs font-medium text-foreground whitespace-nowrap">
                  Step {currentStep}/{totalSteps}
                </span>
                <div className="flex-1 bg-muted rounded-full h-1.5">
                  <div
                    className="bg-main-emerald h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-foreground whitespace-nowrap">
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
                        ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                        : step.number < currentStep
                          ? "bg-muted/10 text-foreground hover:bg-muted"
                          : "bg-card border border-border text-muted-foreground hover:bg-muted/10 hover:text-foreground border-opacity-20 bg-opacity-40"
                    }`}
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
            <Link to="/docs" className="flex items-center justify-center no-underline">
              <SantaIcon className="w-5 h-5 mr-2" />
              <div className="flex items-baseline">
                <span className="text-xl sm:text-xl font-bold text-main-emerald">voltagent</span>
                <span className="ml-1 font-medium text-sm text-muted-foreground">Tutorial</span>
              </div>
            </Link>

            {/* Tutorial Progress */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  Step {currentStep} of {totalSteps}
                </span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
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
                        ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                        : step.number < currentStep
                          ? "bg-muted/10 text-foreground hover:bg-muted"
                          : "bg-card border border-border text-muted-foreground hover:bg-muted/10 hover:text-foreground border-opacity-20 bg-opacity-40"
                    }`}
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
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-muted-foreground hover:text-main-emerald transition-colors no-underline"
              >
                Exit Tutorial
              </Link>

              {/* Console Link */}
              <Link
                to="https://console.voltagent.dev"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-main-emerald transition-all duration-300 shadow-lg hover:shadow-xl no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Try VoltOps
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
