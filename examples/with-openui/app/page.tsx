"use client";

import {
  AgentInterface,
  createTheme,
  fetchLLM,
  openAIAdapter,
  openAIMessageFormat,
} from "@openuidev/react-ui";
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib";
import { useMemo } from "react";

const voltAgentTheme = createTheme({
  background: "oklch(0.15 0.015 162 / 1)",
  foreground: "oklch(0.2 0.018 162 / 1)",
  interactiveAccentDefault: "oklch(0.76 0.18 157 / 1)",
  interactiveAccentHover: "oklch(0.82 0.17 157 / 1)",
  textBrand: "oklch(0.82 0.17 157 / 1)",
});

export default function Home() {
  const llm = useMemo(
    () =>
      fetchLLM({
        url: "/api/chat",
        streamAdapter: openAIAdapter(),
        messageFormat: openAIMessageFormat,
      }),
    [],
  );

  return (
    <main className="h-screen w-screen overflow-hidden">
      <AgentInterface
        llm={llm}
        componentLibrary={openuiChatLibrary}
        agentName="VoltAgent + OpenUI"
        theme={{ mode: "dark", darkTheme: voltAgentTheme }}
        starterVariant="short"
        starters={[
          {
            displayText: "2024 permits by borough",
            prompt:
              "Using only the official 2025 Housing Supply Report PDF, show 2024 residential building permits for all five New York City boroughs as a labeled bar chart. Cite the source page and end with two relevant follow-up suggestions.",
          },
          {
            displayText: "Explain NYC housing supply",
            prompt:
              "Using only the official source report, present the most important 2024 housing supply and vacancy signals as a compact dashboard with a headline takeaway, key-metrics table, and borough comparison visual. Keep prose brief, cite source pages, and end with two next questions.",
          },
          {
            displayText: "Housing analysis form",
            prompt:
              "Create a validated housing analysis form with required focus area and audience fields plus notes. Add a primary Analyze button that sends the completed values to you.",
          },
        ]}
      />
    </main>
  );
}
