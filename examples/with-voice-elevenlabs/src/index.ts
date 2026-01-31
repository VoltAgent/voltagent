import { createReadStream, createWriteStream } from "node:fs";
import { join } from "node:path";
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { ElevenLabsVoiceProvider } from "@voltagent/voice";

// Create logger
const logger = createPinoLogger({
  name: "with-voice-elevenlabs",
  level: "info",
});

// Initialize voice provider
const voiceProvider = new ElevenLabsVoiceProvider({
  apiKey: process.env.ELEVENLABS_API_KEY || "",
  voice: "Adam", // Default voice, you can change to any available voice
  ttsModel: "eleven_multilingual_v2",
  speechModel: "scribe_v2",
  options: {
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0,
    useSpeakerBoost: true,
  },
});

// Initialize agent with voice capabilities
const agent = new Agent({
  name: "ElevenLabs Voice Assistant",
  instructions: "A helpful assistant that can speak and listen using ElevenLabs' voice API",
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
    console.log("Available ElevenLabs voices:", voices);

    // Text-to-speech: Generate speech from text
    console.log("Generating speech...");
    const audioStream = await agent.voice?.speak(
      "Hello, VoltAgent with ElevenLabs provides natural sounding voices for your agent applications.",
      {
        speed: 1.0,
      },
    );

    // Save the audio stream to a file
    const outputPath = join(process.cwd(), "output.mp3");
    const writeStream = createWriteStream(outputPath);
    audioStream?.pipe(writeStream);
    console.log("Audio saved to:", outputPath);

    // Wait for write to finish before reading
    await new Promise((resolve) => {
      writeStream.on("finish", () => resolve(true));
    });

    // Speech-to-text: Transcribe the audio file
    console.log("Transcribing audio...");
    const audioFile = createReadStream(outputPath);
    const transcribedText = await agent.voice?.listen(audioFile, {
      language: "en",
    });
    console.log("Transcribed text:", transcribedText);
  } catch (error) {
    console.error("Error:", error);
  }
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
