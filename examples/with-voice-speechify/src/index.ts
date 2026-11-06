import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { SpeechifyVoiceProvider } from "@voltagent/voice";

// Create logger
const logger = createPinoLogger({
  name: "with-voice-speechify",
  level: "info",
});

// Initialize voice provider
const voiceProvider = new SpeechifyVoiceProvider({
  apiKey: process.env.SPEECHIFY_API_KEY || "",
  voice: "geffen_32", // Default voice, list more with getVoices()
  ttsModel: "simba-3.5",
  options: {
    format: "mp3_24000_128",
  },
});

// Initialize agent with voice capabilities
const agent = new Agent({
  name: "Speechify Voice Assistant",
  instructions: "A helpful assistant that answers in short, spoken-friendly sentences",
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
  try {
    // List available voices
    const voices = await agent.voice?.getVoices();
    console.log(`Found ${voices?.length ?? 0} Speechify voices`);

    // Ask the agent something, then speak the answer
    const response = await agent.generateText("Tell me a fun fact about the ocean.");

    console.log("Generating speech...");
    const audioStream = await agent.voice?.speak(response.text);
    if (!audioStream) return;

    // Save the audio stream to a file
    const outputPath = join(process.cwd(), "output.mp3");
    await pipeline(audioStream, createWriteStream(outputPath));
    console.log("Audio saved to:", outputPath);
  } catch (error) {
    console.error("Error:", error);
  }
})();

// Event listeners for voice interactions
voiceProvider.on("speaking", (event: { text: string }) => {
  console.log(`Speaking: ${event.text.substring(0, 50)}...`);
});

voiceProvider.on("error", (error: { message: string }) => {
  console.error("Voice error:", error.message);
});
