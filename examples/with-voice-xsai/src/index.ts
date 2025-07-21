import { join } from "path";
import { createReadStream, createWriteStream } from "fs";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { VoltAgent, Agent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { XSAIVoiceProvider } from "@voltagent/voice";
import { openai } from "@ai-sdk/openai";

const voiceProvider = new XSAIVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY!,
});

const agent = new Agent({
  name: "Voice Assistant",
  description: "Speaks & listens via xsAI",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  voice: voiceProvider,
});

// Create the VoltAgent with our voice-enabled agent

// Create logger
const logger = createPinoLogger({
  name: "with-voice-xsai",
  level: process.env.VOLTAGENT_LOG_LEVEL || "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});

(async () => {
  const voices = await agent.voice?.getVoices();
  console.log("Available voices:", voices);

  const audioStream = await agent.voice?.speak(
    "Hello, VoltAgent is best framework for building voice agents! Yeah!",
    {
      speed: 1.0,
    },
  );

  console.log("audioStream", audioStream);

  // Save the audio stream to a file (for demonstration)
  const outputPath = join(process.cwd(), "output.mp3");
  const writeStream = createWriteStream(outputPath);
  audioStream?.pipe(writeStream);
  console.log("Audio saved to:", outputPath);

  const audioFile = createReadStream(outputPath);
  const transcribedText = await agent.voice?.listen(audioFile, {
    language: "en",
    stream: false,
  });
  console.log("Transcribed text:", transcribedText);
})();

// Event listeners for voice interactions
voiceProvider.on("speaking", (event: { text: string }) => {
  console.log(`Speaking: ${event.text.substring(0, 50)}...`);
});

voiceProvider.on("listening", () => {
  console.log("Listening to audio input...");
});

voiceProvider.on("error", (error: { message: string }) => {
  console.error("Voice error:", error.message);
});
