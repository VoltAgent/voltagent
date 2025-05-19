import React, { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

const goals = [
  {
    id: "learn_basics",
    label: "I want to understand the basic concepts of LLM Orchestration.",
    advice: [
      "<strong>1. Get a Strong Foundation:</strong> Focus on understanding what LLMs are, basic prompt engineering, and the core problem orchestration solves.",
      "<strong>2. Key Component Deep Dive:</strong> Use the 'Explore Orchestration Components' widget above to understand Chains, Agents, Tools, Memory, and RAG individually.",
      "<strong>3. Read Introductory Articles:</strong> Look for beginner-friendly blog posts or documentation that explain orchestration concepts with simple examples.",
    ],
  },
  {
    id: "simple_prototype",
    label: "I want to build a simple prototype using orchestration.",
    advice: [
      "<strong>1. Start with a Clear, Small Problem:</strong> Don't try to boil the ocean. Pick a very specific task you want to automate or improve.",
      "<strong>2. Choose a Beginner-Friendly Framework:</strong> Consider frameworks known for good documentation and examples (your article mentions VoltAgent as a good starting point for its observability).",
      "<strong>3. Build a Simple Chain First:</strong> Try connecting 2-3 steps. For example, get user input -> process with LLM -> format LLM output.",
      "<strong>4. Incrementally Add Tools/Memory:</strong> Once your basic chain works, try adding a simple tool (like a calculator or a web search if the framework supports it easily) or a basic conversation memory.",
    ],
  },
  {
    id: "explore_rag",
    label:
      "I'm specifically interested in Retrieval Augmented Generation (RAG).",
    advice: [
      "<strong>1. Understand the RAG Flow:</strong> Use the 'Interactive RAG Flow' widget to get a clear picture of all the steps involved.",
      "<strong>2. Prepare Your Data:</strong> Start with a small set of clean documents (e.g., a few text files or PDFs).",
      "<strong>3. Focus on Data Loading & Chunking:</strong> How will you get your data into the system and how will you split it effectively?",
      "<strong>4. Experiment with Embedding Models & Vector Stores:</strong> Different models and databases have different characteristics. If your framework allows, try simple options first.",
      "<strong>5. Test Retrieval:</strong> Before even involving the LLM for generation, check if your system retrieves relevant chunks for sample queries.",
    ],
  },
  {
    id: "advanced_agents",
    label: "I want to explore more advanced agentic behaviors.",
    advice: [
      "<strong>1. Master Simple Agents First:</strong> Ensure you understand how a single agent uses tools and makes decisions before trying multi-agent setups.",
      "<strong>2. Study the ReAct Pattern:</strong> Understand how agents use a Reason + Act loop to accomplish tasks.",
      "<strong>3. Design Your Tools Carefully:</strong> Think about what specific capabilities your agent needs and how to make those tools reliable.",
      "<strong>4. Implement Robust Error Handling:</strong> Agents interacting with multiple tools and making many decisions are prone to more failure points.",
      "<strong>5. Focus on Observability:</strong> For complex agents, being able to trace their decisions and tool usage (like with the VoltAgent Console) is critical for debugging.",
    ],
  },
];

const OrchestrationStarterKitAdvisor = () => {
  const [selectedGoalId, setSelectedGoalId] = useState<string>(goals[0].id);

  const selectedGoal = goals.find((g) => g.id === selectedGoalId);

  return (
    <div className="my-5 rounded-lg border-2 border-emerald-500 bg-gray-800 p-5 text-gray-100 shadow-lg">
      <h3 className="mb-5 mt-0 border-b-2 border-emerald-600 pb-2.5 text-xl text-gray-300">
        Your Orchestration Starting Point
      </h3>
      <p className="mb-3 leading-relaxed text-gray-300">
        What's your primary goal with LLM Orchestration right now?
      </p>
      <div className="relative mb-5">
        <select
          value={selectedGoalId}
          onChange={(e) => setSelectedGoalId(e.target.value)}
          className="w-full appearance-none rounded-md border border-gray-600 bg-gray-800 p-3 pr-8 text-sm text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 focus:ring-offset-gray-800"
        >
          {goals.map((goal) => (
            <option
              key={goal.id}
              value={goal.id}
              className="bg-gray-800 text-gray-100"
            >
              {goal.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
          <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      {selectedGoal && (
        <div className="mt-6 rounded-md border border-emerald-500/50 bg-emerald-900/60 p-5 shadow-sm">
          <h4 className="mb-2 text-base font-medium text-emerald-400">
            Recommended Steps:
          </h4>
          <ul className="list-none p-0">
            {selectedGoal.advice.map((item) => (
              <li
                key={item}
                dangerouslySetInnerHTML={{ __html: item }}
                className="mb-2 border-b border-dashed p-2 border-emerald-500/30  text-emerald-100 last:mb-0 last:border-b-0"
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default OrchestrationStarterKitAdvisor;
