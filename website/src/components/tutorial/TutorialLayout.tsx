import type React from "react";
import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import { TutorialNavbar } from "./TutorialNavbar";

interface TutorialLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  stepDescription: string;
  nextStepUrl?: string;
  prevStepUrl?: string;
}

export const TutorialLayout: React.FC<TutorialLayoutProps> = ({
  children,
  currentStep,
  totalSteps,
  stepTitle,
  stepDescription,
  nextStepUrl,
  prevStepUrl,
}) => {
  return (
    <>
      <Head>
        <title>{stepTitle} - VoltAgent Tutorial</title>
        <meta name="description" content={stepDescription} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Documentation-style Layout */}
      <div className="min-h-screen bg-gray-900">
        {/* Tutorial Navbar */}
        <TutorialNavbar currentStep={currentStep} totalSteps={totalSteps} />

        {/* Main Content - Centered Single Column */}
        <div className="pt-16">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Header Section */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-[#00d992] rounded-xl flex items-center justify-center">
                  <span className="text-gray-900 font-bold text-xl">
                    {currentStep}
                  </span>
                </div>
                <div className="text-left">
                  <h1 className="text-3xl font-bold text-white">{stepTitle}</h1>
                  <p className="text-gray-400 mt-2">{stepDescription}</p>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="flex items-center justify-center space-x-2 max-w-md mx-auto">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={`step-${i + 1}`}
                    className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                      i < currentStep
                        ? "bg-[#00d992]"
                        : i === currentStep - 1
                          ? "bg-[#00d992] animate-pulse"
                          : "bg-gray-700"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-invert prose-lg max-w-none">
              {children}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-16 pt-8 border-t border-gray-800">
              <div>
                {prevStepUrl && (
                  <Link
                    to={prevStepUrl}
                    className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 hover:text-white transition-colors shadow-sm"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <title>Previous</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Previous
                  </Link>
                )}
              </div>

              <div>
                {nextStepUrl && (
                  <Link
                    to={nextStepUrl}
                    className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-900 bg-[#00d992] rounded-lg hover:bg-[#00d992]/80 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Next Step
                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <title>Next</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Help Button */}
        <div className="fixed bottom-8 right-8 z-40">
          <button
            type="button"
            className="w-12 h-12 bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center text-gray-400 hover:text-[#00d992] border border-gray-700"
            aria-label="Help"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Help</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};
