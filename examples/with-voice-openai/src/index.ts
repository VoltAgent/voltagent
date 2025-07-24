import { VoltAgent, Agent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { OpenAIVoiceProvider } from "@voltagent/voice";
import { openai } from "@ai-sdk/openai";
import path, { join } from "path";
import { createReadStream, createWriteStream } from "fs";

// Initialize voice provider
const voiceProvider = new OpenAIVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  voice: "nova", // Using a female voice, you can change to any available voice
  ttsModel: "tts-1", // Using standard TTS model, can be upgraded to tts-1-hd
});

// Initialize agent with voice capabilities
const agent = new Agent({
  name: "Voice Assistant",
  description: "A helpful assistant that can speak and listen using OpenAI's voice API",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  voice: voiceProvider,
});

// Create the VoltAgent with our voice-enabled agent

// Create logger
const logger = createPinoLogger({
  name: "with-voice-openai",
  level: "info",
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
    "Hello, VoltAgent is best framework for building voice agents",
    {
      speed: 1.0,
    },
  );

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
