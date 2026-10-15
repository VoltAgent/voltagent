import { record, recordedNumber } from "./span-insights";

export function safeMediaUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (
    /^https?:\/\//i.test(value) ||
    /^data:(image\/(png|jpeg|webp|gif)|audio\/[a-z0-9.+-]+);base64,/i.test(value)
  )
    return value;
  return undefined;
}

/** Trace audio uses signed 16-bit little-endian PCM; browsers need a WAV container. */
export function pcmAudioUrl(base64: string, sampleRate = 24000, channels = 1) {
  if (
    !Number.isInteger(sampleRate) ||
    sampleRate <= 0 ||
    sampleRate > 384000 ||
    !Number.isInteger(channels) ||
    channels < 1 ||
    channels > 32
  )
    return undefined;
  try {
    const pcm = atob(base64);
    if (!pcm.length || pcm.length % (channels * 2) !== 0) return undefined;
    const bytes = new Uint8Array(44 + pcm.length);
    const view = new DataView(bytes.buffer);
    const ascii = (offset: number, text: string) => {
      for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i);
    };
    ascii(0, "RIFF");
    view.setUint32(4, 36 + pcm.length, true);
    ascii(8, "WAVE");
    ascii(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    ascii(36, "data");
    view.setUint32(40, pcm.length, true);
    for (let i = 0; i < pcm.length; i++) bytes[44 + i] = pcm.charCodeAt(i);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return `data:audio/wav;base64,${btoa(binary)}`;
  } catch {
    return undefined;
  }
}

export function recordedAudioUrl(data: Record<string, unknown>): string | undefined {
  const storage = record(data.storage);
  const format = String(data.format ?? storage?.format ?? "mpeg");
  const mime = String(data.mimeType ?? storage?.mimeType ?? `audio/${format}`);
  const bytes = data.data ?? data.dataBase64;
  let embedded: string | undefined;
  if (typeof bytes === "string" && bytes.length > 0) {
    embedded =
      /pcm/i.test(mime) || /^pcm(16)?$/i.test(format)
        ? pcmAudioUrl(bytes, recordedNumber(data.sampleRate), recordedNumber(data.channels))
        : safeMediaUrl(`data:${mime};base64,${bytes}`);
  }
  return (
    embedded ??
    safeMediaUrl(
      storage?.status === "pending" || storage?.status === "error"
        ? undefined
        : (storage?.url ?? data.url),
    )
  );
}
