import React, { useState } from "react";

const architectureData = [
  {
    id: "llm-brain",
    name: "🧠 LLM Brain",
    description:
      "The core reasoning engine that thinks, understands, and makes decisions",
    details:
      "This is the heart of your agent — GPT, Claude, Gemini, or any other language model. It processes natural language, understands context, and generates responses. However, on its own, it can only work with text and has no access to real-world data or the ability to perform actions.",
    examples:
      "• Analyzing user requests\n• Planning multi-step solutions\n• Generating natural language responses\n• Making decisions based on context",
  },
  {
    id: "tools",
    name: "🔧 Tools",
    description:
      "The hands and feet of the agent — APIs, databases, and external services",
    details:
      "Tools give your agent superpowers beyond text generation. They're functions that can interact with the real world: calling APIs, querying databases, performing calculations, sending emails, or even controlling other software. The LLM decides when and how to use these tools.",
    examples:
      "• Weather API calls\n• Database queries\n• File operations\n• Web scraping\n• Email sending\n• Calculator functions",
  },
  {
    id: "memory",
    name: "💾 Memory System",
    description:
      "Remembers conversations and maintains context across interactions",
    details:
      "Without memory, every conversation starts from scratch. The memory system stores previous interactions, user preferences, and conversation context. This enables personalized experiences and allows the agent to reference past conversations naturally.",
    examples:
      "• Conversation history\n• User preferences\n• Previous decisions\n• Context from past sessions\n• Learning from interactions",
  },
  {
    id: "orchestration",
    name: "🎼 Orchestration",
    description:
      "The conductor that coordinates everything and manages the workflow",
    details:
      "This is the most complex part — the system that decides what to do next, when to use tools, how to handle errors, and how to combine different components. It's like a conductor orchestrating a symphony, making sure everything works together smoothly.",
    examples:
      "• Workflow planning\n• Tool selection logic\n• Error handling\n• Response formatting\n• Context management\n• Decision trees",
  },
];

const AgentArchitectureExplorer = () => {
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedComponent = architectureData.find(
    (comp) => comp.id === selectedComponentId,
  );

  return (
    <div className="my-4 rounded-lg border-2 border-emerald-500 bg-gray-800 p-4 text-gray-100 shadow-lg">
      <h3 className="mb-3 mt-0 text-lg text-emerald-300 font-semibold">
        🏗️ Agent Architecture Explorer
      </h3>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg border border-emerald-700 transition-colors duration-200"
        >
          <span className="text-sm font-medium">
            {selectedComponent
              ? selectedComponent.name
              : "Select a component to explore"}
          </span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-10">
            {architectureData.map((component) => (
              <button
                type="button"
                key={component.id}
                onClick={() => {
                  setSelectedComponentId(component.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="text-sm font-medium text-white mb-1">
                  {component.name}
                </div>
                <div className="text-xs text-gray-300">
                  {component.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedComponent && (
        <div className="mt-4 rounded-lg border border-gray-600 bg-gray-700 p-4 text-gray-200">
          <h4 className="mb-2 text-base text-emerald-300 font-semibold">
            {selectedComponent.name}
          </h4>
          <p className="text-sm leading-relaxed text-gray-200 mb-3">
            {selectedComponent.details}
          </p>
          <h5 className="text-sm text-emerald-200 font-medium mb-2">
            Common Use Cases:
          </h5>
          <pre className="text-xs leading-relaxed text-gray-300 whitespace-pre-line font-sans">
            {selectedComponent.examples}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AgentArchitectureExplorer;
