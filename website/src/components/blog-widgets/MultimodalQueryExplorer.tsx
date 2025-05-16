import React, { useState } from "react";
import {
  ArrowPathIcon,
  DocumentTextIcon,
  PhotoIcon,
  MusicalNoteIcon,
} from "@heroicons/react/24/outline";

// Input modes supported by the component
const inputModes = [
  {
    value: "text",
    label: "Text Input",
    icon: <DocumentTextIcon className="h-5 w-5" />,
  },
  {
    value: "image",
    label: "Image Input",
    icon: <PhotoIcon className="h-5 w-5" />,
  },
  {
    value: "audio",
    label: "Audio Input",
    icon: <MusicalNoteIcon className="h-5 w-5" />,
  },
];

// Sample queries for each input mode
const sampleQueries = {
  text: [
    "What's the revenue trend for Q2 2024?",
    "Summarize the main findings of the research paper",
    "What are the key features of the new product?",
  ],
  image: [
    "What does this chart show about market growth?",
    "Identify the objects in this technical diagram",
    "What architectural style is shown in this building?",
  ],
  audio: [
    "Transcribe and summarize this meeting recording",
    "What is the main topic discussed in this podcast?",
    "Identify key action items mentioned in this audio",
  ],
};

// Mock responses simulating RAG systems
function getSimpleRagResponse(inputMode: string, query: string): string {
  if (inputMode === "text") {
    return `I found some information about this in our database. Based on the text documents I can access, I can provide an answer about ${query}`;
  }
  return "I'm sorry, I can only process text queries. I don't have the ability to understand images or audio inputs directly.";
}

function getMultimodalRagResponse(inputMode: string, query: string): string {
  switch (inputMode) {
    case "text":
      return `I've searched our knowledge base and found relevant text documents, charts and related media. Based on both textual and visual information, I can tell you that ${query.toLowerCase()} shows several interesting patterns worth exploring.`;
    case "image":
      return `I can analyze this visual input. Looking at the image, I can identify key elements such as charts, diagrams, or objects. This appears to be related to ${query}. I've also pulled relevant text explanations from our database that provide additional context.`;
    case "audio":
      return `I can process this audio input. After analyzing the audio content and searching related documents in our knowledge base, I can provide insights about ${query}. The audio contains discussions that relate to several key documents in our database.`;
    default:
      return "I can handle multiple forms of input and provide integrated responses based on our knowledge base.";
  }
}

// The React Component
export default function MultimodalQueryExplorer(): JSX.Element {
  const [selectedMode, setSelectedMode] = useState<string>("text");
  const [customQuery, setCustomQuery] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showComparison, setShowComparison] = useState<boolean>(false);

  // Use either custom query or selected sample
  const query =
    customQuery ||
    sampleQueries[selectedMode as keyof typeof sampleQueries][0] ||
    "";

  const handleProcessQuery = () => {
    setIsProcessing(true);
    // Simulate processing delay
    setTimeout(() => {
      setIsProcessing(false);
      setShowComparison(true);
    }, 1500);
  };

  return (
    <div className="border-2 border-solid border-emerald-500 rounded-lg p-5 mb-6 bg-gray-800 shadow-lg">
      {/* Input Mode Selection */}
      <div className="mb-5">
        <div className="block mb-3 font-medium text-white text-sm">
          Select Input Type:
        </div>
        <div className="flex flex-wrap gap-2">
          {inputModes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => {
                setSelectedMode(mode.value);
                setShowComparison(false);
                setCustomQuery("");
              }}
              className={`flex items-center px-4 py-2 rounded-md transition-all duration-200 cursor-pointer
                ${
                  selectedMode === mode.value
                    ? "bg-emerald-700 text-white border-emerald-500 border"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600 border"
                }`}
            >
              <span className="mr-2">{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Query Input */}
      <div className="mb-5">
        <label
          htmlFor="query"
          className="block mb-2 font-medium text-white text-sm"
        >
          Your Query:
        </label>
        <div className="relative">
          <input
            id="query"
            type="text"
            value={customQuery}
            onChange={(e) => {
              setCustomQuery(e.target.value);
              setShowComparison(false);
            }}
            placeholder={
              sampleQueries[selectedMode as keyof typeof sampleQueries][0]
            }
            className="w-full p-3 bg-gray-700 border border-gray-600 text-white rounded-md 
                     focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-400
                     hover:border-emerald-400/50 transition-all duration-200"
          />
        </div>
        <div className="mt-2 text-gray-400 text-xs">
          Or try one of these examples:
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {sampleQueries[selectedMode as keyof typeof sampleQueries].map(
            (sample, i) => (
              <button
                key={`${selectedMode}-sample-${i}`}
                type="button"
                onClick={() => {
                  setCustomQuery(sample);
                  setShowComparison(false);
                }}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-emerald-300 cursor-pointer"
              >
                {sample}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Process Button */}
      <button
        type="button"
        onClick={handleProcessQuery}
        disabled={isProcessing}
        className={`w-full py-2 px-4 rounded-md transition-all duration-200 font-medium cursor-pointer
          ${
            isProcessing
              ? "bg-gray-600 text-gray-300 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
          }`}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center">
            <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
            Processing...
          </span>
        ) : (
          "Compare RAG Systems"
        )}
      </button>

      {/* Comparison Results */}
      {showComparison && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Traditional RAG */}
          <div className="bg-gray-700/60 p-4 rounded-md border border-gray-600">
            <h4 className="text-white font-medium mb-2">
              Traditional RAG Response:
            </h4>
            <p className="text-gray-300 text-sm">
              {getSimpleRagResponse(selectedMode, query)}
            </p>
          </div>

          {/* Multimodal RAG */}
          <div className="bg-emerald-900/30 p-4 rounded-md border border-emerald-500/50">
            <h4 className="text-emerald-400 font-medium mb-2">
              Multimodal RAG Response:
            </h4>
            <p className="text-emerald-100 text-sm">
              {getMultimodalRagResponse(selectedMode, query)}
            </p>
          </div>

          {/* Explanation */}
          <div className="md:col-span-2 mt-2 bg-gray-700/30 p-3 rounded-md">
            <p className="text-gray-400 text-xs">
              This demo illustrates how Multimodal RAG can process various input
              types and provide more comprehensive responses by analyzing and
              retrieving from multiple data modalities.
              {selectedMode !== "text" &&
                " Traditional RAG systems typically only support text input and retrieval."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
