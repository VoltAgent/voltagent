import { ChevronDownIcon } from "@heroicons/react/24/outline";
import React, { useState } from "react";

// Expanded roles list
const roles = [
  { value: "supervisor", label: "Supervisor / Orchestrator" },
  { value: "creative", label: "Creative Task (Writing, Art, Content Gen)" },
  { value: "coding", label: "Coding / Technical Task (Dev, Debugging)" },
  { value: "analysis", label: "Data Analysis / Research / Summarization" },
  { value: "chatbot", label: "Conversational AI / Customer Support" },
  { value: "tool_user", label: "Agent Using Tools / Function Calling" },
  {
    value: "simple",
    label: "Simple / Repetitive Task (Formatting, Extraction)",
  },
];

const priorities = [
  { value: "performance", label: "Top Performance / Quality" },
  { value: "balanced", label: "Balanced Cost & Speed" },
  { value: "cost", label: "Lowest Cost / Highest Speed" },
];

// Expanded and updated recommendation function
function getRecommendation(role, priority) {
  if (!role || !priority) {
    return "Please select both a role and a priority.";
  }

  // --- Expanded Recommendation Logic (Examples, Needs Frequent Updates!) ---

  if (priority === "performance") {
    switch (role) {
      case "supervisor":
      case "analysis":
        return "Powerful reasoning needed. Consider: GPT-4 Turbo, Claude 3 Opus, Gemini 1.5 Pro (check latest benchmarks). Often worth the premium cost.";
      case "creative":
        return "Top-tier creative models: GPT-4 Turbo, Claude 3 Opus. Explore variants based on specific creative needs (e.g., style, coherence).";
      case "coding":
        return "Strong coding models: GPT-4 Turbo, Claude 3 Opus. Also look at specialized fine-tunes if available. High accuracy is key.";
      case "chatbot":
        return "For complex conversations requiring deep understanding: GPT-4 Turbo, Claude 3 Opus. Ensures high-quality interaction.";
      case "tool_user":
        return "Requires strong function calling / tool use capabilities: GPT-4 Turbo, Claude 3 Opus, Gemini 1.5 Pro. Test reliability thoroughly.";
      default: // Simple tasks at high performance (less common)
        return "Consider GPT-4o or Claude 3 Sonnet for high accuracy even on simpler tasks, though likely overkill.";
    }
  }

  if (priority === "balanced") {
    switch (role) {
      case "supervisor":
      case "analysis":
        return "Good balance of capability and cost: GPT-4o, Claude 3 Sonnet, Gemini 1.5 Pro. Maybe strong open-source like Llama 3 70B if self-hosting.";
      case "creative":
        return "Solid creative options: GPT-4o, Claude 3 Sonnet, Gemini 1.5 Pro. Also consider Mixtral models for good performance/cost.";
      case "coding":
        return "Good all-around coders: GPT-4o, Claude 3 Sonnet. Open-source options like Llama 3 or specialized code models (CodeLlama) are strong contenders.";
      case "chatbot":
        return "Reliable conversational models: GPT-4o, Claude 3 Sonnet, Gemini 1.5 Pro. Test latency and flow. Llama 3 70B can also work well.";
      case "tool_user":
        return "Good function calling support: GPT-4o, Claude 3 Sonnet, Gemini 1.5 Pro. Test specific tool use cases.";
      case "simple":
        return "Often overkill, but for high-accuracy simple tasks: GPT-4o, Claude 3 Sonnet. Fast and capable.";
    }
  }

  if (priority === "cost") {
    switch (role) {
      case "supervisor": // Low-cost supervisor is tricky
        return "Lowest cost supervision is challenging. Maybe GPT-4o-mini or Claude 3 Haiku if logic is simple, or a fine-tuned smaller OSS model. Requires careful evaluation.";
      case "creative":
      case "analysis":
        return "Cost-effective options: GPT-4o-mini, Claude 3 Haiku, Gemini 1.5 Flash. Open source like Mistral 7B, Llama 3 8B, or Mixtral can be very efficient.";
      case "coding":
        return "Efficient coders: GPT-4o-mini, Claude 3 Haiku. Check benchmarks for CodeLlama variants or other specialized OSS models.";
      case "chatbot":
        return "Fast & cheap chat: GPT-4o-mini, Claude 3 Haiku, Gemini 1.5 Flash. Llama 3 8B or Mistral 7B are excellent self-hosted options.";
      case "tool_user":
        return "Check function calling on smaller models: GPT-4o-mini, Claude 3 Haiku. Reliability might vary; test thoroughly.";
      case "simple":
        return "Ideal for fast, cheap models: GPT-4o-mini, Claude 3 Haiku, Gemini 1.5 Flash, Mistral 7B, Llama 3 8B. Choose based on required speed/accuracy trade-off.";
    }
  }

  return "Could not determine a recommendation. Please check selections."; // Fallback
}

// The React Component
export default function LlmChoiceHelper(): JSX.Element {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");

  const recommendation = getRecommendation(selectedRole, selectedPriority);

  return (
    // Container with updated Tailwind classes
    <div className="border-2 border-solid border-emerald-500 rounded-lg p-5 mb-6 bg-gray-800 shadow-lg">
      {/* Question 1: Role */}
      <div className="mb-5">
        <label
          htmlFor="agentRole"
          className="block mb-2 font-medium text-white text-sm"
        >
          1. What is the primary role of this agent?
        </label>
        <div className="relative cursor-pointer">
          <select
            id="agentRole"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="appearance-none cursor-pointer w-full p-3 bg-gray-800 border border-gray-700 text-white rounded-md 
                      focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-400 
                      hover:border-emerald-400/50 transition-all duration-200 text-sm"
          >
            <option value="" className="" disabled>
              -- Select Role --
            </option>
            {roles.map((role) => (
              <option
                key={role.value}
                value={role.value}
                className="bg-gray-800 "
              >
                {role.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
            <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Question 2: Priority */}
      <div className="mb-4">
        <label
          htmlFor="agentPriority"
          className="block mb-2 font-medium text-white text-sm"
        >
          2. What's more important for this agent?
        </label>
        <div className="relative cursor-pointer">
          <select
            id="agentPriority"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className={`appearance-none cursor-pointer w-full p-3 bg-gray-800 border rounded-md text-white
                      focus:outline-none focus:ring-2 transition-all duration-200 text-sm
                      ${
                        selectedRole
                          ? "border-emerald-600 hover:border-emerald-400 focus:ring-emerald-500/70 focus:border-emerald-400"
                          : "border-gray-700 opacity-60 cursor-not-allowed"
                      }`}
            disabled={!selectedRole}
          >
            <option value="" disabled>
              -- Select Priority --
            </option>
            {priorities.map((priority) => (
              <option
                key={priority.value}
                value={priority.value}
                className="bg-gray-800"
              >
                {priority.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
            <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Recommendation Output */}
      {selectedRole && selectedPriority && (
        <div className="mt-6 p-4 bg-emerald-900/60 border border-emerald-500/50 rounded-md shadow-sm">
          <div className="text-emerald-400 font-medium mb-2 text-base">
            Suggestion:
          </div>
          <p className="text-emerald-100 mb-2">{recommendation}</p>
          <div className="text-emerald-300/70 text-xs mt-3">
            Remember to test, as model performance evolves!
          </div>
        </div>
      )}
    </div>
  );
}
