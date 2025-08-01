import Link from "@docusaurus/Link";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type React from "react";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  completed?: boolean;
  current?: boolean;
  path: string;
}

interface TutorialNavigationProps {
  steps: TutorialStep[];
  currentStep: string;
}

export const TutorialNavigation: React.FC<TutorialNavigationProps> = ({ steps, currentStep }) => {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  const previousStep = currentIndex > 0 ? steps[currentIndex - 1] : null;
  const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;

  return (
    <div className="tutorial-navigation">
      {/* Step Progress Indicator */}
      <div className="step-progress mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <Link
                  to={step.path}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                    ${
                      step.id === currentStep
                        ? "bg-blue-600 text-white"
                        : step.completed
                          ? "bg-green-600 text-white"
                          : "bg-gray-300 text-gray-600"
                    }
                    hover:opacity-80 transition-opacity
                  `}
                >
                  {step.completed ? <CheckIcon className="w-4 h-4" /> : index + 1}
                </Link>
                <span
                  className={`
                  text-xs mt-2 max-w-20 text-center
                  ${step.id === currentStep ? "text-blue-600 font-semibold" : "text-gray-600"}
                `}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`
                  w-12 h-0.5 mx-4 mt-4
                  ${
                    steps[index + 1].completed || steps[index + 1].id === currentStep
                      ? "bg-blue-600"
                      : "bg-gray-300"
                  }
                `}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <div>
          {previousStep && (
            <Link
              to={previousStep.path}
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-2" />
              Previous: {previousStep.title}
            </Link>
          )}
        </div>

        <div>
          {nextStep && (
            <Link
              to={nextStep.path}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Next: {nextStep.title}
              <ChevronRightIcon className="w-4 h-4 ml-2" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
