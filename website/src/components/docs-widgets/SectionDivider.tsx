import { BoltIcon } from "@heroicons/react/24/solid";
import type React from "react";

interface SectionDividerProps {
  children: React.ReactNode;
}

export default function SectionDivider({ children }: SectionDividerProps) {
  return (
    <div className="my-10 section-divider relative">
      <div
        className="rounded-lg px-5 py-4 border-solid"
        style={{
          backgroundColor: "rgba(20, 184, 166, 0.15)",
          borderColor: "rgba(20, 184, 166, 0.4)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 mt-0.5"
            style={{
              color: "#10b981",
              filter: "drop-shadow(0 0 6px rgba(16, 185, 129, 0.5))",
            }}
          >
            <BoltIcon className="w-5 h-5" />
          </div>
          <span className="text-[15px] leading-relaxed" style={{ color: "#a7f3d0" }}>
            {children}
          </span>
        </div>
      </div>
    </div>
  );
}
