import { createReadStream, createWriteStream } from "node:fs";
import path, { join } from "node:path";
import { openai } from "@ai-sdk/openai";
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { OpenAIRealtimeVoiceProvider, OpenAIVoiceProvider } from "@voltagent/voice";
import { weatherTool } from "./tools/weather";

// Create logger
const logger = createPinoLogger({
  name: "with-voice-openai",
  level: "info",
});

// Initialize voice provider
const voiceProvider = new OpenAIVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY || "",
  voice: "nova", // Using a female voice, you can change to any available voice
  ttsModel: "tts-1", // Using standard TTS model, can be upgraded to tts-1-hd
});

// Initialize realtime voice provider (PCM16 streaming)
const realtimeVoiceProvider = new OpenAIRealtimeVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY || "",
  model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-mini",
  voice: "alloy",
  inputAudioFormat: "pcm16",
  outputAudioFormat: "pcm16",
});

// Initialize agent with voice capabilities
const agent = new Agent({
  name: "Voice Assistant",
  instructions: "A helpful assistant that can speak and listen using OpenAI's voice API",
  model: openai("gpt-4o-mini"),
  voice: voiceProvider,
});

const realtimeAgent = new Agent({
  name: "Realtime Voice Assistant",
  instructions: "A helpful assistant that responds in real time using OpenAI Realtime voice.",
  model: openai("gpt-4o-mini"),
  voice: realtimeVoiceProvider,
  tools: [weatherTool],
});

// Create the VoltAgent with our voice-enabled agent
new VoltAgent({
  agents: {
    agent,
    realtimeAgent,
  },
  logger,
  server: honoServer({ port: 3141 }),
});

/* (async () => {
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
 */
