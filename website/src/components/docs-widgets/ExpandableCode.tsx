"use client";

import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import type React from "react";
import { useState } from "react";

interface ExpandableCodeProps {
  children: React.ReactNode;
  previewLines?: number;
  title?: string;
}

export default function ExpandableCode({
  children,
  previewLines = 15,
  title,
}: ExpandableCodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate max-height based on line count (approx 24px per line)
  const collapsedHeight = previewLines * 24;

  return (
    <div className="expandable-code my-4">
      {title && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] border-b border-gray-700 rounded-t-lg">
          <span className="text-sm text-gray-400 font-mono">{title}</span>
        </div>
      )}

      <div className="relative">
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            maxHeight: isExpanded ? "none" : `${collapsedHeight}px`,
          }}
        >
          {children}
        </div>

        {/* Gradient overlay when collapsed */}
        {!isExpanded && (
          <div
            className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(30, 30, 30, 0.8), rgba(30, 30, 30, 1))",
            }}
          />
        )}
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#1e1e1e] hover:bg-[#2a2a2a] border-t border-gray-700 rounded-b-lg transition-colors cursor-pointer"
      >
        {isExpanded ? (
          <>
            <ChevronUpIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">Show less</span>
          </>
        ) : (
          <>
            <ChevronDownIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">Show more</span>
          </>
        )}
      </button>
    </div>
  );
}
