import { CopilotKit, useCopilotAction } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { useMemo } from "react";
import "@copilotkit/react-ui/styles.css";

function WeatherActionRenderer() {
  useCopilotAction({
    name: "getWeather",
    available: "disabled", // UI render only
    render: ({ status, args, result }) => (
      <div className="text-gray-500 mt-2">
        {status !== "complete" && "Calling weather API..."}
        {status === "complete" && (
          <div>
            <p>Called weather API for {args?.location}</p>
            {result?.message && <p>{result.message}</p>}
          </div>
        )}
      </div>
    ),
  });
  return null;
}

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", padding: "2rem" }}>
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <h1 style={{ marginBottom: 12 }}>VoltAgent + CopilotKit</h1>
        <p style={{ marginTop: 0, color: "#475569" }}>
          Connects to the VoltAgent CopilotKit endpoint at {"http://localhost:3141/copilotkit"}.
        </p>
        {/* Agent selection is handled by CopilotKit DevTools; leave agent unspecified here. */}
        <CopilotKit runtimeUrl="http://localhost:3141/copilotkit" agent="WeatherAgent">
          <WeatherActionRenderer />
          <CopilotChat
            className="copilot-kit-chat"
            labels={{
              initial: "Hi! How can I assist you today?",
              title: "Your Assistant",
            }}
            suggestions={[
              {
                title: "Weather in San Francisco",
                message: "What's the weather like in San Francisco?",
              },
              {
                title: "Weather in New York",
                message: "Tell me about the weather in New York.",
              },
              {
                title: "Weather in Tokyo",
                message: "How's the weather in Tokyo today?",
              },
            ]}
          />
        </CopilotKit>
      </div>
    </div>
  );
}
