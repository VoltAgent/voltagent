---
title: Voice
slug: /agents/voice
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Voice

The `@voltagent/voice` package provides text-to-speech (TTS) and speech-to-text (STT) capabilities through various providers. It allows your applications to speak text and transcribe audio with minimal setup.

## Installation

Install the package using your preferred package manager:

<Tabs>
  <TabItem value="npm" label="npm" default>

```bash
npm install @voltagent/voice
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn add @voltagent/voice
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm add @voltagent/voice
```

  </TabItem>
</Tabs>

## Supported Providers

- **OpenAI**: High-quality voices and transcription.
- **ElevenLabs**: Realistic, customizable voices.
- **xsAI**: Lightweight OpenAI-compatible voice API.

## Basic Usage

First, initialize a voice provider instance.

### Initialize a Voice Provider

```typescript
// Initialize with OpenAI
import { OpenAIVoiceProvider } from "@voltagent/voice";

const openAIVoice = new OpenAIVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY, // Ensure API key is set in environment variables
  ttsModel: "tts-1",
  voice: "alloy", // Available voices: alloy, echo, fable, onyx, nova, shimmer
});

// Or initialize with ElevenLabs
import { ElevenLabsVoiceProvider } from "@voltagent/voice";

const elevenLabsVoice = new ElevenLabsVoiceProvider({
  apiKey: process.env.ELEVENLABS_API_KEY, // Ensure API key is set
  ttsModel: "eleven_multilingual_v2",
  voice: "Rachel", // Example voice ID
});

// Or initialize with xsAI
import { XsAIVoiceProvider } from "@voltagent/voice";

const xsAIVoice = new XsAIVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  ttsModel: "tts-1",
  voice: "alloy",
  // If you are not using OpenAI, simply specify the `baseURL`
});
```

**Note:** It's recommended to manage API keys securely, for example, using environment variables.

### Text-to-Speech (TTS)

Convert text into an audio stream. You can then process this stream, for example, by saving it to a file.

```typescript
import { createWriteStream } from "node:fs";
import { PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises"; // Use pipeline for better error handling

// --- Example 1: Basic Speak and Save to File ---

console.log("Generating audio...");
// Get the audio stream for the text
const audioStream = await openAIVoice.speak("Hello from VoltAgent!");

console.log("Saving audio to output.mp3...");
// Create a file stream to write the audio
const fileStream = createWriteStream("output.mp3");

try {
  // Pipe the audio stream to the file stream and wait for completion
  await pipeline(audioStream, fileStream);
  console.log("Audio successfully saved to output.mp3");
} catch (error) {
  console.error("Failed to save audio:", error);
}

// --- Example 2: Speak with Options and Save ---

console.log("Generating custom audio...");
const customAudioStream = await elevenLabsVoice.speak("Speaking faster now.", {
  // Provider-specific options can be passed here.
  // For OpenAI, you might use:
  // voice: "nova", // Override the default voice
  // speed: 1.5,    // Adjust speaking speed (1.0 is default)
});

console.log("Saving custom audio to custom_output.mp3...");
const customFileStream = createWriteStream("custom_output.mp3");

try {
  // Pipe the custom audio stream to the file stream
  await pipeline(customAudioStream, customFileStream);
  console.log("Custom audio successfully saved to custom_output.mp3");
} catch (error) {
  console.error("Failed to save custom audio:", error);
}

// Note: The audioStream is a standard Node.js Readable stream.
// You can pipe it to other destinations or process it directly.
```

### Speech-to-Text (STT)

Transcribe audio from a stream into text.

```typescript
import { createReadStream } from "node:fs";

// Ensure you have an audio file (e.g., input.mp3)
const audioFileStream = createReadStream("input.mp3");

// Basic transcription with OpenAI
const transcribedText = await openAIVoice.listen(audioFileStream);
console.log("Transcription:", transcribedText);

// Transcription with options (e.g., language hint)
const transcribedSpanish = await openAIVoice.listen(audioFileStream, {
  language: "es", // Specify the language code
});
console.log("Spanish Transcription:", transcribedSpanish);

// Streaming transcription (Provider-dependent, e.g., OpenAI)
try {
  const streamingTranscription = await openAIVoice.listen(audioFileStream, {
    stream: true, // Enable streaming
  });

  for await (const chunk of streamingTranscription) {
    // Process transcription chunks as they arrive
    // The structure of 'chunk' depends on the provider
    console.log("Stream Chunk:", chunk);
  }
} catch (error) {
  console.error("Streaming transcription failed:", error);
}
```

### List Available Voices

Fetch the list of voices supported by the provider.

```typescript
// Using the initialized openAIVoice instance
const availableVoices = await openAIVoice.getVoices();
console.log("Available OpenAI Voices:", availableVoices);
/* Example Output:
[
  { id: 'alloy', name: 'Alloy', language: 'en', gender: 'neutral' },
  { id: 'echo', name: 'Echo', language: 'en', gender: 'male' },
  // ... other voices
]
*/

const elevenLabsVoices = await elevenLabsVoice.getVoices();
console.log("Available ElevenLabs Voices:", elevenLabsVoices); // Structure might differ
```

## Integrating with Agent

You can integrate the voice provider directly into an `Agent` instance.

```typescript
import { Agent, OpenAIAgentProvider } from "@voltagent/core";
import { OpenAIVoiceProvider } from "@voltagent/voice";

// Initialize the voice provider
const voice = new OpenAIVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY,
  ttsModel: "tts-1",
  voice: "nova",
});

// Initialize the agent provider
const provider = new OpenAIAgentProvider({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create the agent, passing the voice instance
const voiceEnabledAgent = new Agent({
  name: "VoiceBot",
  instructions: "An agent that can speak.",
  provider,
  model: "openai/gpt-4o", // Choose an appropriate model
  voice: voice, // Assign the voice provider here
});

// Now the agent instance potentially uses the voice capabilities
// (Specific usage within the agent depends on future VoltAgent features or custom implementations)

// Example: Manually trigger speech from agent's response
// const response = await voiceEnabledAgent.generateText("Tell me a short story.");
// if (voiceEnabledAgent.voice) {
//   const audio = await voiceEnabledAgent.voice.speak(response.text);
//   // Pipe audio to output
//   audio.pipe(createWriteStream("story.mp3"));
// }
```

**Note:** The direct integration of `voice` within the `Agent`'s core methods (`generateText`, `streamText`, etc.) for automatic speaking/listening is under development. Currently, you can access the `agent.voice` property to manually trigger TTS or STT.

## Event Handling

Listen for events emitted by the voice provider instance.

```typescript
// Using the initialized openAIVoice instance

// Listen for the start of speech synthesis
openAIVoice.on("speaking", (data) => {
  console.log(`[Speaking Started] Text: "${data.text}"`);
});

// Listen for the start of transcription
openAIVoice.on("listening", (data) => {
  // data might contain information about the audio stream
  console.log("[Listening Started]");
});

// Handle errors
openAIVoice.on("error", (errorData) => {
  console.error(
    `[Voice Error] Code: ${errorData.code}, Message: ${errorData.message}`,
    errorData.details
  );
});

// Trigger an action that emits events
try {
  await openAIVoice.speak("Testing event listeners.");
  // const audioInput = createReadStream("input.mp3");
  // await openAIVoice.listen(audioInput);
} catch (error) {
  // Errors caught here might also be emitted via the 'error' event
  console.error("Direct action failed:", error);
}
```

## Creating a Custom Voice Provider

Extend the `BaseVoiceProvider` to integrate other TTS/STT services.

```typescript
import {
  BaseVoiceProvider,
  VoiceProviderEvents,
  VoiceMetadata,
  VoiceSpeakOptions,
  VoiceListenOptions,
} from "@voltagent/voice";
import { PassThrough, Readable } from "node:stream"; // Import Readable

// Define your custom provider options
type MyCustomProviderOptions = {
  apiKey: string;
  region?: string;
  // Add other necessary options
};

// Define potential errors specific to your provider
enum MyCustomErrorCode {
  AuthError = "AUTH_ERROR",
  ApiError = "API_ERROR",
  InvalidInput = "INVALID_INPUT",
}

export class MyCustomVoiceProvider extends BaseVoiceProvider<
  MyCustomProviderOptions,
  VoiceProviderEvents
> {
  private readonly apiKey: string;
  private readonly region: string;
  // Add client instances or other state needed

  constructor(options: MyCustomProviderOptions) {
    super(options); // Pass options to the base class
    this.apiKey = options.apiKey;
    this.region = options.region || "default-region";
    // Initialize your API client here
  }

  /**
   * Connect to the service if needed (e.g., WebSockets).
   */
  async connect(): Promise<void> {
    console.log("Connecting to Custom Voice Service...");
    // Add connection logic if required
    // Simulating async operation
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log("Connected.");
  }

  /**
   * Disconnect from the service.
   */
  disconnect(): void {
    console.log("Disconnecting from Custom Voice Service...");
    // Add disconnection logic
  }

  /**
   * Send audio data (e.g., for streaming STT).
   */
  async send(audioData: Readable): Promise<void> {
    console.log("Sending audio data chunk...");
    // Implementation for sending streaming audio
    // Read from audioData stream and send to your API
    // Example: audioData.pipe(yourApiStream);
    await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate async send
  }

  /**
   * Convert text to speech.
   */
  async speak(
    text: string, // Assuming text is always string for simplicity here
    options?: VoiceSpeakOptions // Use standardized options type
  ): Promise<Readable> {
    // Return standard Readable stream
    this.emit("speaking", { text }); // Emit standard event

    try {
      console.log(`Speaking text: "${text}" with voice: ${options?.voice}`);
      // --- Your TTS API Call Logic ---
      // const apiResponse = await yourTTSClient.synthesize({
      //   text: text,
      //   voice: options?.voice || 'default-voice',
      //   apiKey: this.apiKey,
      //   // map other options like speed if applicable
      // });
      // -----------------------------

      // Simulate receiving audio data from API
      await new Promise((resolve) => setTimeout(resolve, 500));
      const audioBuffer = Buffer.from(`Simulated audio for: ${text}`);

      // Return audio data as a Readable stream
      const passThrough = new PassThrough();
      passThrough.end(audioBuffer);
      return passThrough;
    } catch (error: any) {
      const errorMessage = error.message || "Unknown TTS error";
      this.emit("error", {
        message: errorMessage,
        code: MyCustomErrorCode.ApiError, // Use your specific error codes
        details: error,
      });
      throw new Error(`Custom TTS failed: ${errorMessage}`); // Re-throw a standard error
    }
  }

  /**
   * Convert speech to text.
   */
  async listen(
    audio: Readable, // Expect a Readable stream
    options?: VoiceListenOptions // Use standardized options type
  ): Promise<string | AsyncIterable<any>> {
    // Return string or stream based on options
    this.emit("listening", { audio }); // Emit standard event

    try {
      console.log(`Listening with language: ${options?.language}, stream: ${options?.stream}`);

      // --- Your STT API Call Logic ---
      // Handle both standard and streaming modes
      if (options?.stream) {
        // Implement streaming transcription logic
        // Example: const transcriptStream = yourSTTClient.startStream(audio, { language: options.language });
        // return transcriptStream; // Return the async iterable from your client

        // --- Placeholder for streaming ---
        async function* generateChunks() {
          yield { delta: "Simulated " };
          await new Promise((resolve) => setTimeout(resolve, 200));
          yield { delta: "streamed " };
          await new Promise((resolve) => setTimeout(resolve, 200));
          yield { delta: "transcript." };
        }
        return generateChunks();
        // --- End Placeholder ---
      } else {
        // Implement non-streaming transcription logic
        // Example: const result = await yourSTTClient.transcribe(audio, { language: options?.language });
        // return result.text;

        // --- Placeholder for non-streaming ---
        // Simulate reading the stream and getting a result
        let fullAudio = Buffer.alloc(0);
        for await (const chunk of audio) {
          fullAudio = Buffer.concat([fullAudio, chunk]);
        }
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
        return "Simulated full transcript of audio.";
        // --- End Placeholder ---
      }
      // -----------------------------
    } catch (error: any) {
      const errorMessage = error.message || "Unknown STT error";
      this.emit("error", {
        message: errorMessage,
        code: MyCustomErrorCode.ApiError, // Use your specific error codes
        details: error,
      });
      throw new Error(`Custom STT failed: ${errorMessage}`); // Re-throw a standard error
    }
  }

  /**
   * Fetch available voices from your service.
   */
  async getVoices(): Promise<VoiceMetadata[]> {
    try {
      // --- Your API Call Logic to Get Voices ---
      // const apiVoices = await yourClient.listVoices({ apiKey: this.apiKey });
      // return apiVoices.map(v => ({ id: v.id, name: v.name, language: v.lang, gender: v.gender }));
      // ---------------------------------------

      // --- Placeholder ---
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate API call
      return [
        { id: "custom-voice-1", name: "Custom Voice One", language: "en", gender: "female" },
        { id: "custom-voice-2", name: "Custom Voice Two", language: "es", gender: "male" },
      ];
      // --- End Placeholder ---
    } catch (error: any) {
      const errorMessage = error.message || "Failed to fetch custom voices";
      this.emit("error", {
        message: errorMessage,
        code: MyCustomErrorCode.ApiError,
        details: error,
      });
      // Return empty array or throw, depending on desired behavior
      return [];
    }
  }
}

// Example usage of the custom provider
// const myVoice = new MyCustomVoiceProvider({ apiKey: "YOUR_CUSTOM_API_KEY" });
// const audio = await myVoice.speak("Hello from my custom provider!");
// audio.pipe(createWriteStream("custom_output.mp3"));
```

This updated custom provider example uses standardized types like `VoiceSpeakOptions`, `VoiceListenOptions`, `VoiceMetadata`, and `Readable` stream types for better consistency and type safety. It also includes more detailed placeholders for API logic and error handling.
