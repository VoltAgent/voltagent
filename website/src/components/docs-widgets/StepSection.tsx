import type React from "react";

interface StepSectionProps {
  stepNumber: number;
  title: string;
  children: React.ReactNode;
}

export default function StepSection({
  stepNumber,
  title,
  children,
}: StepSectionProps): JSX.Element {
  return (
    <div className="step-section mb-12 ">
      <div className="flex flex-col xl:flex-row  lg:gap-10">
        {/* Left side - Step number and title */}
        <div
          className="flex items-center xl:items-start gap-3 mb-4 xl:mb-0 xl:flex-shrink-0"
          style={{ width: "240px", minWidth: "240px" }}
        >
          <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-semibold text-sm bg-emerald-500/10 text-emerald-400 border border-solid border-emerald-500/30">
            {stepNumber}
          </div>
          <h3 className="text-lg font-semibold m-0">{title}</h3>
        </div>

        {/* Right side - Content */}
        <div className="flex-1  ">{children}</div>
      </div>
    </div>
  );
}
