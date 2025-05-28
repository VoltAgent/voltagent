import React, { useState } from "react";

type InteractionType =
  | "quick-text"
  | "stream-chat"
  | "structured-data"
  | "advanced-feature"
  | "image-input"
  | "unknown";

interface Recommendation {
  feature: string;
  description: string;
  docsLink?: string; // Optional link to relevant docs
}

const recommendations: Record<InteractionType, Recommendation> = {
  "quick-text": {
    feature: "generateText()",
    description:
      "Ideal for quick and complete text responses. Suitable for simple question-answering or summarization scenarios.",
  },
  "stream-chat": {
    feature: "streamText() and useChat hook",
    description:
      "Used for interactive, real-time chat experiences where responses flow token by token.",
  },
  "structured-data": {
    feature: "generateObject() / streamObject()",
    description:
      "Used when you want the LLM to produce data in a specific JSON format defined by a Zod schema.",
  },
  "advanced-feature": {
    feature: "Provider-specific options",
    description:
      "Used to pass advanced parameters specific to a model or provider that aren't covered by standard options.",
  },
  "image-input": {
    feature: "Multi-modal content in messages",
    description:
      "Used when you need to send images along with text to a model with visual processing capabilities.",
  },
  unknown: {
    feature: "Please select an interaction type.",
    description:
      "Choose from the options above to see the appropriate Vercel AI SDK feature for your needs.",
  },
};

export default function VercelAiSdkFeatureMatcher(): JSX.Element {
  const [interactionType, setInteractionType] =
    useState<InteractionType>("unknown");

  const currentRecommendation = recommendations[interactionType];

  const selectBaseClass =
    "appearance-none cursor-pointer w-full p-3 bg-gray-800 border rounded-md text-white focus:outline-none focus:ring-2 transition-all duration-200 text-sm";
  const selectFocusClass = "focus:ring-emerald-500/70 focus:border-emerald-400";
  const selectHoverClass = "hover:border-emerald-400/50";
  const selectBorderClass = "border-gray-700";

  return (
    <div className="my-6 rounded-lg border-2 border-solid border-emerald-500 bg-gray-800 p-5 shadow-lg">
      <h4 className="mb-2 text-lg font-semibold text-white">
        Which Vercel AI SDK Feature Is Right For You?
      </h4>
      <p className="mb-4 text-sm text-gray-300">
        Select what you want to do with LLM, and we'll suggest the right
        feature:
      </p>
      <div className="mb-4">
        <label
          htmlFor="interactionTypeSelect"
          className="mb-1 block text-sm font-medium text-gray-200"
        >
          Interaction Type:
        </label>
        <select
          id="interactionTypeSelect"
          value={interactionType}
          onChange={(e) =>
            setInteractionType(e.target.value as InteractionType)
          }
          className={`${selectBaseClass} ${selectBorderClass} ${selectHoverClass} ${selectFocusClass}`}
        >
          <option value="unknown" className="bg-gray-800">
            -- Select an option --
          </option>
          <option value="quick-text" className="bg-gray-800">
            Get a quick text response
          </option>
          <option value="stream-chat" className="bg-gray-800">
            Stream chat responses (token by token)
          </option>
          <option value="structured-data" className="bg-gray-800">
            Extract structured data (JSON)
          </option>
          <option value="advanced-feature" className="bg-gray-800">
            Use an advanced model-specific feature
          </option>
          <option value="image-input" className="bg-gray-800">
            Process image inputs
          </option>
        </select>
      </div>

      {interactionType !== "unknown" && (
        <div className="mt-6 rounded-md border border-emerald-500/50 bg-emerald-900/60 p-4 shadow-sm">
          <h5 className="mb-2 font-medium text-emerald-400">
            Recommended Vercel AI SDK Feature:
          </h5>
          <p className="text-md font-semibold text-emerald-100">
            {currentRecommendation.feature}
          </p>
          <p className="mt-1 text-sm text-emerald-200">
            {currentRecommendation.description}
          </p>
          {currentRecommendation.docsLink && (
            <p className="mt-2 text-xs">
              <a
                href={currentRecommendation.docsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 hover:underline"
              >
                Learn more...
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
