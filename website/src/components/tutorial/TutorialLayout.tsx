import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import { ColorModeProvider } from "@docusaurus/theme-common/internal";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import type React from "react";
import { DotPattern } from "../ui/dot-pattern";
import { TutorialNavbar } from "./TutorialNavbar";

interface TutorialLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  stepDescription: string;
  nextStepUrl?: string;
  prevStepUrl?: string;
  hideHeader?: boolean;
}

export const TutorialLayout: React.FC<TutorialLayoutProps> = ({
  children,
  currentStep,
  totalSteps,
  stepTitle,
  stepDescription,
  nextStepUrl,
  prevStepUrl,
  hideHeader = false,
}) => {
  return (
    <>
      <Head>
        <title>{stepTitle} - VoltAgent Tutorial</title>
        <meta name="description" content={stepDescription} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <ColorModeProvider>
        {/* Documentation-style Layout */}
        <div className="min-h-screen bg-background relative overflow-hidden">
          {/* Global Background Effects */}
          <div className="fixed inset-0 pointer-events-none z-0">
            {/* Base gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/3 via-transparent to-cyan-500/3" />

            {/* Animated gradient orbs */}
            <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] " />
            <div
              className="absolute top-[50%] right-[10%] w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[100px] "
              style={{ animationDelay: "2s" }}
            />
            <div
              className="absolute bottom-[20%] left-[25%] w-[450px] h-[450px] bg-emerald-400/8 rounded-full blur-[110px] "
              style={{ animationDelay: "4s" }}
            />
          </div>

          {/* Dot Pattern Background - Above glow effects */}
          <div className="fixed inset-0 pointer-events-none z-[1]">
            <DotPattern dotColor="#6b7280" dotSize={1.2} spacing={20} />
          </div>

          {/* Tutorial Navbar */}
          <div className="relative z-10">
            <TutorialNavbar currentStep={currentStep} totalSteps={totalSteps} />

            {/* Main Content - Centered Single Column */}
            <div className="pt-[190px] landing-md:pt-36">
              <div className="max-w-5xl mx-auto px-4 md:px-6  md:py-8">
                {/* Header Section */}
                {!hideHeader && (
                  <div className="mb-10 md:mb-14">
                    <div className="flex items-start space-x-3 md:space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 md:w-9 md:h-9 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-lg flex items-center justify-center">
                        <span className="font-semibold text-sm md:text-base">{currentStep}</span>
                      </div>
                      <div className="text-left">
                        <h1 className="text-[24px] font-medium text-white leading-tight mb-2">
                          {stepTitle}
                        </h1>
                        <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                          {stepDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="prose prose-invert prose-sm md:prose-lg max-w-none">{children}</div>

                {/* Navigation Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-center mt-12 md:mt-16 pt-6 md:pt-8 border-t border-border space-y-4 sm:space-y-0">
                  <div>
                    {prevStepUrl && (
                      <Link
                        to={prevStepUrl}
                        className="inline-flex items-center px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium no-underline text-muted-foreground bg-card border border-border rounded-lg hover:bg-muted hover:text-foreground transition-colors shadow-sm border-opacity-60 bg-opacity-70"
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
          </div>
        </div>
      </ColorModeProvider>
    </>
  );
};
