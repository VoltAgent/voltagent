import { VoltAgent, Agent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { ElevenLabsVoiceProvider } from "@voltagent/voice";
import { openai } from "@ai-sdk/openai";
import { join } from "path";
import { createReadStream, createWriteStream } from "fs";

// Initialize voice provider
const voiceProvider = new ElevenLabsVoiceProvider({
  apiKey: process.env.ELEVENLABS_API_KEY!,
  voice: "Adam", // Default voice, you can change to any available voice
  ttsModel: "eleven_multilingual_v2",
  speechModel: "scribe_v1",
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
  description: "A helpful assistant that can speak and listen using ElevenLabs' voice API",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  voice: voiceProvider,
});

// Create the VoltAgent with our voice-enabled agent

// Create logger
const logger = createPinoLogger({
  name: "with-voice-elevenlabs",
  level: "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
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
