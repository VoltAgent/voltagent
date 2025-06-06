import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { GeminiVoiceProvider } from "@voltagent/voice";
import { openai } from "@ai-sdk/openai";
import { createWriteStream } from "fs";
import { join } from "path";

// Initialize Gemini voice provider
const voiceProvider = new GeminiVoiceProvider({
  apiKey: process.env.GEMINI_API_KEY!,
  model: "gemini-2.5-flash-preview-tts", // Using Gemini 2.5 Flash TTS model
  voice: "Kore", // Using Kore voice (firm style)
});

// Initialize agent with voice capabilities
const agent = new Agent({
  name: "Gemini Voice Assistant",
  description: "A helpful assistant that can speak using Gemini 2.5 native TTS",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  voice: voiceProvider,
});

// Create the VoltAgent with our voice-enabled agent
new VoltAgent({
  agents: {
    agent,
  },
});

(async () => {
  console.log("🎤 Gemini Voice Provider Example");
  console.log("================================");

  try {
    // Get available voices
    console.log("\n📋 Available Gemini voices:");
    const voices = await agent.voice?.getVoices();
    voices?.slice(0, 5).forEach((voice) => {
      console.log(`  • ${voice.name} (${voice.metadata?.style || 'neutral'})`);
    });
    console.log(`  ... and ${(voices?.length || 0) - 5} more voices`);

    // Example 1: Single-speaker TTS
    console.log("\n🗣️  Single-speaker TTS example:");
    const singleSpeakerText = "Hello! I'm using Gemini 2.5 native text-to-speech. This is a demonstration of VoltAgent's new Gemini voice provider.";
    
    const audioStream1 = await agent.voice?.speak(singleSpeakerText, {
      voice: "Puck", // Using Puck voice (upbeat style)
    });

    if (audioStream1) {
      const outputPath1 = join(process.cwd(), "single-speaker-output.wav");
      const writeStream1 = createWriteStream(outputPath1);
      audioStream1.pipe(writeStream1);
      console.log(`  ✅ Single-speaker audio saved to: ${outputPath1}`);
    }

    // Example 2: Multi-speaker TTS
    console.log("\n👥 Multi-speaker TTS example:");
    const multiSpeakerText = `TTS the following conversation between Alice and Bob:
Alice: Hi Bob! Have you tried the new Gemini voice features?
Bob: Yes! The quality is amazing and it supports so many voices.
Alice: I love how we can control the style with natural language prompts.
Bob: Absolutely! It's perfect for creating podcasts and audiobooks.`;

    const audioStream2 = await agent.voice?.speak(multiSpeakerText, {
      speakers: [
        { speaker: "Alice", voice: "Leda" }, // Youthful voice for Alice
        { speaker: "Bob", voice: "Gacrux" },  // Mature voice for Bob
      ],
    });

    if (audioStream2) {
      const outputPath2 = join(process.cwd(), "multi-speaker-output.wav");
      const writeStream2 = createWriteStream(outputPath2);
      audioStream2.pipe(writeStream2);
      console.log(`  ✅ Multi-speaker audio saved to: ${outputPath2}`);
    }

    // Example 3: Style-controlled TTS
    console.log("\n🎭 Style-controlled TTS example:");
    const styledText = "Welcome to the future of voice technology!";
    
    const audioStream3 = await agent.voice?.speak(styledText, {
      voice: "Fenrir", // Exciting voice
      style: "Say with great excitement and enthusiasm",
    });

    if (audioStream3) {
      const outputPath3 = join(process.cwd(), "styled-output.wav");
      const writeStream3 = createWriteStream(outputPath3);
      audioStream3.pipe(writeStream3);
      console.log(`  ✅ Styled audio saved to: ${outputPath3}`);
    }

    console.log("\n🎉 All examples completed successfully!");
    console.log("\nFeatures demonstrated:");
    console.log("  ✓ 30 high-quality Gemini voices");
    console.log("  ✓ Single-speaker text-to-speech");
    console.log("  ✓ Multi-speaker conversations (up to 2 speakers)");
    console.log("  ✓ Style control with natural language prompts");
    console.log("  ✓ 24 language support with auto-detection");
    console.log("  ✓ Professional-grade audio quality (24kHz, 16-bit, mono PCM)");

  } catch (error) {
    console.error("❌ Error:", error);
  }
})();

// Event listeners for voice interactions
voiceProvider.on("speaking", (event: { text: string }) => {
  console.log(`🔊 Speaking: ${event.text.substring(0, 50)}...`);
});

voiceProvider.on("error", (error: { message: string; code?: string }) => {
  console.error(`❌ Voice error [${error.code}]: ${error.message}`);
});
