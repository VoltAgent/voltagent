import { Readable } from "node:stream";
import type { ServerProviderDeps, Voice } from "@voltagent/core";
import { z } from "zod";

export const voiceSpeakSchema = z.object({
  text: z.string().trim().min(1).max(10000),
  options: z
    .object({
      voice: z.string().max(100).optional(),
      speed: z.number().min(0.25).max(4).optional(),
      pitch: z.number().min(-20).max(20).optional(),
    })
    .optional(),
});
export const voiceListenSchema = z.object({ language: z.string().max(30).optional() });

export class VoiceRequestError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 409 | 413 | 422 = 400,
  ) {
    super(message);
  }
}

export function getAgentVoice(id: string, deps: ServerProviderDeps): Voice | undefined {
  const agent = deps.agentRegistry.getAgent(id);
  if (!agent) throw new VoiceRequestError("Agent not found", 404);
  return agent.voice;
}

export async function handleVoiceSpeak(id: string, body: unknown, deps: ServerProviderDeps) {
  const input = voiceSpeakSchema.safeParse(body);
  if (!input.success)
    throw new VoiceRequestError(
      "Speech requires non-empty text (up to 10,000 characters) and valid voice options",
    );
  const voice = getAgentVoice(id, deps);
  if (!voice) throw new VoiceRequestError("Voice is not configured for this agent", 409);
  return voice.speak(input.data.text, input.data.options);
}

export async function handleVoiceListen(
  id: string,
  audio: Uint8Array,
  mimeType: string,
  options: unknown,
  deps: ServerProviderDeps,
) {
  const input = voiceListenSchema.safeParse(options);
  if (!input.success) throw new VoiceRequestError("Invalid transcription options");
  if (!audio.byteLength) throw new VoiceRequestError("Audio is empty");
  if (audio.byteLength > 20 * 1024 * 1024)
    throw new VoiceRequestError("Audio must be smaller than 20 MB", 413);
  const format = (
    {
      "audio/webm": "webm",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/mp4": "mp4",
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
    } as Record<string, string>
  )[mimeType.split(";")[0]];
  if (!format) throw new VoiceRequestError("Unsupported audio format");
  const voice = getAgentVoice(id, deps);
  if (!voice) throw new VoiceRequestError("Voice is not configured for this agent", 409);
  // Providers such as OpenAI use the format to name uploaded recordings correctly.
  const listenOptions = { ...input.data, format, stream: false };
  const result: unknown = await voice.listen(Readable.from(Buffer.from(audio)), listenOptions);
  if (typeof result !== "string")
    throw new VoiceRequestError("Voice provider did not return a transcription", 422);
  return result;
}
