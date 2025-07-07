import type React from "react";
import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import { TutorialNavbar } from "./TutorialNavbar";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";

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
      <div className="min-h-screen bg-[#1d1d1d]">
        {/* Tutorial Navbar */}
        <TutorialNavbar currentStep={currentStep} totalSteps={totalSteps} />

        {/* Main Content - Centered Single Column */}
        <div className="pt-20 md:pt-24">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
            {/* Header Section */}
            <div className="mb-8 md:mb-12">
              <div className="flex items-start justify-center space-x-3 md:space-x-4 mb-4 md:mb-6">
                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-xl flex items-center justify-center">
                  <span className="font-bold text-lg md:text-xl">
                    {currentStep}
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-xl md:text-3xl font-bold text-[#f7fafc] leading-tight">
                    {stepTitle}
                  </span>
                  <p className="text-[#cbd5e0] mt-1 md:mt-2 text-sm md:text-lg leading-relaxed">
                    {stepDescription}
                  </p>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="flex items-center justify-center space-x-1 md:space-x-2 max-w-xs md:max-w-md mx-auto">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={`step-${i + 1}`}
                    className={`h-1.5 md:h-2 flex-1 rounded-full transition-all duration-500 ${
                      i < currentStep
                        ? "bg-[#00d992]"
                        : i === currentStep - 1
                          ? "bg-[#00d992] animate-pulse"
                          : "bg-[#4a5568]"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-invert prose-sm md:prose-lg max-w-none">
              {children}
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-12 md:mt-16 pt-6 md:pt-8 border-t border-[#4a5568] space-y-4 sm:space-y-0">
              <div>
                {prevStepUrl && (
                  <Link
                    to={prevStepUrl}
                    className="inline-flex items-center px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium no-underline text-[#cbd5e0]/80 bg-[#2d3748]/50 border-solid border-[#4a5568]/50 rounded-lg hover:bg-[#4a5568] hover:text-[#f7fafc] transition-colors shadow-sm"
                  >
                    <ChevronLeftIcon className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                    Previous
                  </Link>
                )}
              </div>

              <div>
                {nextStepUrl && (
                  <Link
                    to={nextStepUrl}
                    className="inline-flex items-center px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium bg-emerald-400/10 text-emerald-400 border-solid border no-underline border-emerald-400/20 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Next Step
                    <ChevronRightIcon className="w-3 h-3 md:w-4 md:h-4 ml-2" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Help Button */}
        <div className="fixed bottom-6 md:bottom-8 right-4 md:right-8 z-40">
          <button
            type="button"
            className="w-10 h-10 md:w-12 md:h-12 bg-[#2d3748] rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center text-[#cbd5e0] hover:text-[#00d992] border border-[#4a5568]"
            aria-label="Help"
          >
            <QuestionMarkCircleIcon className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </>
  );
};
