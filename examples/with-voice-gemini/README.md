# VoltAgent with Gemini 2.5 Native Voice TTS

This example demonstrates how to use VoltAgent with Google's Gemini 2.5 native text-to-speech capabilities.

## Features

- **30 High-Quality Voices**: Choose from Gemini's diverse voice collection
- **Single & Multi-Speaker TTS**: Support for conversations with up to 2 speakers
- **Controllable Speech**: Use natural language to control style, tone, pace, and accent
- **24 Language Support**: Automatic language detection for global applications
- **Professional Quality**: Native TTS integration for high-quality audio output

## Prerequisites

1. **Gemini API Key**: Get your API key from [Google AI Studio](https://aistudio.google.com/)
2. **OpenAI API Key**: For the LLM provider (or use any other supported provider)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
export GEMINI_API_KEY="your-gemini-api-key"
export OPENAI_API_KEY="your-openai-api-key"
```

3. Run the example:
```bash
npm run dev
```

## What This Example Does

### 1. Single-Speaker TTS
Converts text to speech using a single voice with style characteristics:
```typescript
const audioStream = await agent.voice?.speak(text, {
  voice: "Puck", // Upbeat style voice
});
```

### 2. Multi-Speaker Conversations
Creates conversations between multiple speakers (up to 2):
```typescript
const audioStream = await agent.voice?.speak(conversationText, {
  speakers: [
    { speaker: "Alice", voice: "Leda" }, // Youthful voice
    { speaker: "Bob", voice: "Gacrux" },  // Mature voice
  ],
});
```

### 3. Style-Controlled Speech
Uses natural language prompts to control speech characteristics:
```typescript
const audioStream = await agent.voice?.speak(text, {
  voice: "Fenrir", // Exciting voice
  style: "Say with great excitement and enthusiasm",
});
```

## Available Voices

Gemini 2.5 TTS supports 30 voices with different characteristics:

| Voice | Style | Voice | Style |
|-------|-------|-------|-------|
| Zephyr | Bright | Puck | Upbeat |
| Charon | Informative | Kore | Firm |
| Fenrir | Exciting | Leda | Youthful |
| Orus | Firm | Aoede | Breezy |
| Callirrhoe | Easygoing | Autonoe | Bright |
| Enceladus | Breathy | Iapetus | Clear |
| Umbriel | Easygoing | Algieba | Smooth |
| Despina | Smooth | Erinome | Clear |
| Algenib | Gravelly | Rasalgethi | Informative |
| Laomedeia | Upbeat | Achernar | Soft |
| Alnilam | Firm | Schedar | Even |
| Gacrux | Mature | Pulcherrima | Forward |
| Achird | Friendly | Zubenelgenubi | Casual |
| Vindemiatrix | Gentle | Sadachbia | Lively |
| Sadaltager | Wise | Sulafat | Warm |

## Supported Languages

Gemini TTS automatically detects and supports 24 languages:
- English (US, India)
- Spanish (US)
- French (France)
- German (Germany)
- Italian (Italy)
- Portuguese (Brazil)
- Japanese (Japan)
- Korean (Korea)
- Chinese (Simplified, Traditional)
- Hindi (India)
- Arabic (Egyptian)
- Russian (Russia)
- And many more...

## Output Files

The example generates three audio files:
- `single-speaker-output.wav` - Single voice demonstration
- `multi-speaker-output.wav` - Conversation between two speakers
- `styled-output.wav` - Style-controlled speech example

## Advanced Usage

### Custom Style Instructions
```typescript
await agent.voice?.speak("Your text here", {
  style: "Say in a spooky whisper with dramatic pauses",
  voice: "Enceladus", // Breathy voice complements the style
});
```

### Multi-Speaker with Individual Styles
```typescript
const prompt = `Make Speaker1 sound tired and bored, and Speaker2 sound excited:
Speaker1: So... what's on the agenda today?
Speaker2: You're never going to guess!`;

await agent.voice?.speak(prompt, {
  speakers: [
    { speaker: "Speaker1", voice: "Enceladus" }, // Breathy for tired effect
    { speaker: "Speaker2", voice: "Puck" },      // Upbeat for excitement
  ],
});
```

## Error Handling

The provider includes comprehensive error handling:
- API key validation
- Empty text detection
- Network error recovery
- Detailed error messages with codes

## Performance Notes

- **Latency**: Optimized for low-latency generation
- **Quality**: Professional-grade 24kHz, 16-bit, mono PCM audio
- **Streaming**: Audio is generated as complete files (like OpenAI TTS), not real-time streaming
- **Cost**: Efficient pricing model based on character count
- **Real-time**: For real-time audio streaming, use Gemini Live API instead

## Next Steps

- Explore the [Gemini API documentation](https://ai.google.dev/gemini-api/docs/speech-generation)
- Try different voice combinations for your use case
- Experiment with style prompts for creative applications
- Integrate with your existing VoltAgent workflows
