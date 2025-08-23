import { CalculatorChat } from "./components/calculator-chat";
import { CalculatorChatV2 } from "./components/calculator-chat-v2";

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

      {/* Removed gradient overlay */}

      <main className="relative w-full z-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#00d992] mb-1">VoltAgent</h1>
          <p className="text-gray-400">AI-powered calculation made simple</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 justify-center items-start">
          <div className="flex-1 max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-300 mb-4 text-center">
              Legacy (Provider Pattern)
            </h2>
            <CalculatorChat />
          </div>

          <div className="flex-1 max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-300 mb-4 text-center">
              New (Direct AI SDK)
            </h2>
            <CalculatorChatV2 />
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Built with Next.js and VoltAgent</p>
        </div>
      </main>
    </div>
  );
}
