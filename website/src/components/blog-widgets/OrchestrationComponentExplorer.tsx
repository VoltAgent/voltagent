import React, { useState } from "react";

const componentsData = [
  {
    id: "chains",
    name: "Chains",
    description:
      "Chains are sequences of calls to an LLM or other utilities. They allow you to combine multiple components to create more complex applications.",
    details:
      "Simple Sequential Chains: Output of one step is input to the next. Useful for straightforward, multi-step tasks like summarizing text then extracting keywords.\nSmarter Chains with Logic: Can include conditional logic (if X, then Y) or allow an LLM to choose the next step based on context.",
  },
  {
    id: "agents",
    name: "Agents",
    description:
      "Agents use an LLM to decide which actions to take. They can use tools, access data, and make decisions to achieve a goal.",
    details:
      'Core Idea: An LLM acts as a "reasoning engine." Based on the input and available tools, it decides what to do next.\nExample: An agent might search the web, then use a calculator, then format the result based on a user\'s complex query.',
  },
  {
    id: "tools",
    name: "Tools",
    description:
      "Tools are functions that agents can use to interact with the world (e.g., search engines, APIs, databases, or even other chains).",
    details:
      "Examples: Web search, database lookup, code execution, calling a specific API (weather, stocks, etc.).\nImportance: Tools give LLMs capabilities beyond text generation, allowing them to access real-time information and perform actions.",
  },
  {
    id: "memory",
    name: "Memory",
    description:
      "Memory allows chains and agents to remember previous interactions, making conversations more coherent and context-aware.",
    details:
      'Types: Conversation Buffer (remembers full chat history), Summary Memory (summarizes past conversation), Entity Memory (remembers key entities like names/places).\nBenefit: Prevents the LLM from "forgetting" what was discussed earlier in a longer interaction.',
  },
  {
    id: "rag",
    name: "RAG (Retrieval Augmented Generation)",
    description:
      "RAG enhances LLM responses by first retrieving relevant data from external knowledge sources and providing it as context to the LLM.",
    details:
      "Process: User query -> Retrieve relevant documents -> Combine query + documents into a prompt -> LLM generates answer based on enriched prompt.\nUse Case: Answering questions based on a specific set of documents (e.g., your company's internal knowledge base).",
  },
];

const OrchestrationComponentExplorer = () => {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    null,
  );

  const selectedComponent = componentsData.find(
    (comp) => comp.id === selectedComponentId,
  );

  return (
    <div className="my-5 rounded-lg border-2 border-emerald-500 bg-gray-800 p-5 text-gray-100 shadow-lg">
      <h3 className="mb-5 mt-0 border-b-2 border-emerald-600 pb-2.5 text-xl text-gray-300">
        Explore Orchestration Components
      </h3>
      <div className="mb-5 flex flex-wrap gap-2.5">
        {componentsData.map((component) => (
          <button
            type="button"
            key={component.id}
            className={`m-1 cursor-pointer rounded-md border border-emerald-700 bg-emerald-600 py-2.5 px-3.5 text-white transition-colors duration-200 ease-in-out hover:border-emerald-800 hover:bg-emerald-700 font-medium ${
              selectedComponentId === component.id
                ? "border-emerald-900 bg-emerald-800 ring-2 ring-emerald-500 ring-offset-2 ring-offset-gray-800"
                : ""
            }`}
            onClick={() => setSelectedComponentId(component.id)}
          >
            {component.name}
          </button>
        ))}
      </div>
      {selectedComponent && (
        <div className="mt-5 rounded-md border border-gray-600 bg-gray-700 p-4 text-gray-200">
          <h4 className="mb-2 mt-0 text-lg text-emerald-300">
            {selectedComponent.name}
          </h4>
          <p className="leading-relaxed text-gray-200">
            {selectedComponent.description}
          </p>
          <h5 className="mt-3 mb-1.5 text-base text-emerald-200">
            Key Details:
          </h5>
          <p
            style={{ whiteSpace: "pre-line" }}
            className="leading-relaxed text-gray-200"
          >
            {selectedComponent.details}
          </p>
        </div>
      )}
    </div>
  );
};

export default OrchestrationComponentExplorer;
