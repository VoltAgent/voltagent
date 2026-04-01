---
id: voice
title: Voice
slug: voice
description: Add text-to-speech and speech-to-text to your agents.
---

# Voice

Enable your agents to speak and listen using voice providers like OpenAI or ElevenLabs.

## Quick Setup (OpenAI)

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { OpenAIVoiceProvider } from "@voltagent/voice";

const voiceProvider = new OpenAIVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY,
  voice: "nova", // alloy, echo, fable, onyx, nova, shimmer
  ttsModel: "tts-1", // or tts-1-hd for higher quality
});

const agent = new Agent({
  name: "Voice Assistant",
  instructions: "A helpful voice-enabled assistant",
  model: openai("gpt-4o-mini"),
  voice: voiceProvider,
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

## Text-to-Speech (Speak)

```typescript
// Generate speech from text
const audioStream = await agent.voice?.speak("Hello! How can I help you today?", { speed: 1.0 });

// Save to file
import { createWriteStream } from "node:fs";
audioStream?.pipe(createWriteStream("output.mp3"));
```

## Speech-to-Text (Listen)

```typescript
import { createReadStream } from "node:fs";

// Transcribe audio file
const audioFile = createReadStream("input.mp3");
const text = await agent.voice?.listen(audioFile, {
  language: "en",
});

console.log("Transcribed:", text);
```

## Available Voices

```typescript
const voices = await agent.voice?.getVoices();
console.log("Available voices:", voices);
```

## Event Listeners

```typescript
voiceProvider.on("speaking", (event) => {
  console.log(`Speaking: ${event.text.substring(0, 50)}...`);
});

voiceProvider.on("listening", () => {
  console.log("Listening to audio...");
});

voiceProvider.on("error", (error) => {
  console.error("Voice error:", error.message);
});
```

## ElevenLabs Provider

```typescript
import { ElevenLabsVoiceProvider } from "@voltagent/voice";

const voiceProvider = new ElevenLabsVoiceProvider({
  apiKey: process.env.ELEVENLABS_API_KEY,
  voiceId: "your-voice-id",
});
```

## Full Example

See the complete examples:

- [with-voice-openai on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-voice-openai)
- [with-voice-elevenlabs on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-voice-elevenlabs)
