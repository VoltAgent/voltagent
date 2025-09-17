import { CalculatorChat } from "./components/calculator-chat";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#1b1b1b] flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Dot pattern background */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(#94a3b8 1.2px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      <main className="relative w-full z-10 max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#00d992] mb-2">VoltAgent</h1>
          <p className="text-gray-400 text-lg">Supervisor Agent with Sub-Agents</p>
          <p className="text-gray-500 text-sm mt-2">
            Watch how the supervisor delegates tasks to specialized agents
          </p>
        </div>

        <CalculatorChat />

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Built with Next.js and VoltAgent</p>
          <p className="mt-2 text-xs text-gray-600">
            The supervisor agent delegates mathematical tasks to MathExpert and general queries to
            GeneralAssistant
          </p>
        </div>
      </main>
    </div>
  );
}
