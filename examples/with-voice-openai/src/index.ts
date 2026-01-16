import { createReadStream, createWriteStream } from "node:fs";
import path, { join } from "node:path";
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { OpenAIVoiceProvider } from "@voltagent/voice";

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

// Initialize agent with voice capabilities
const agent = new Agent({
  name: "Voice Assistant",
  instructions: "A helpful assistant that can speak and listen using OpenAI's voice API",
  model: "openai/gpt-4o-mini",
  voice: voiceProvider,
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({
      url: "file:./.voltagent/memory.db",
    }),
  }),
});

// Create the VoltAgent with our voice-enabled agent
new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({ port: 3141 }),
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
