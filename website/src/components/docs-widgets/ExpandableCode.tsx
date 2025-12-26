"use client";

import { CodeBracketIcon } from "@heroicons/react/24/outline";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
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
    <>
      {/* Override Docusaurus code block border-radius */}
      <style>{`
        .expandable-code pre,
        .expandable-code .prism-code,
        .expandable-code [class*="codeBlock"] {
          border-radius: 0 !important;
          margin: 0 !important;
          max-width: 100% !important;
          overflow-x: auto !important;
        }
        .expandable-code {
          max-width: 100%;
          overflow-x: hidden;
        }
      `}</style>

      <div
        className="expandable-code my-6 rounded-lg overflow-hidden border border-solid border-gray-600/40"
        style={{ maxWidth: "100%" }}
      >
        {/* Header */}
        {title && (
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{
              backgroundColor: "rgba(75, 85, 99, 0.15)",
              borderBottom: "1px solid rgba(107, 114, 128, 0.3)",
            }}
          >
            <CodeBracketIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-mono text-gray-300">{title}</span>
          </div>
        )}

        {/* Code content */}
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
              className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, transparent 0%, rgba(30, 30, 30, 0.7) 40%, rgba(30, 30, 30, 0.95) 100%)",
              }}
            />
          )}
        </div>

        {/* Toggle button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 transition-all duration-200 cursor-pointer border-0"
          style={{
            backgroundColor: "rgba(75, 85, 99, 0.15)",
            borderTop: "1px solid rgba(107, 114, 128, 0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(75, 85, 99, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(75, 85, 99, 0.15)";
          }}
        >
          {isExpanded ? (
            <>
              <ChevronUpIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-400">Show less</span>
            </>
          ) : (
            <>
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-400">Show more</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
