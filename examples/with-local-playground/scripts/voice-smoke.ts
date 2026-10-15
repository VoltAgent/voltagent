import assert from "node:assert/strict";
import { safeStringify } from "@voltagent/internal";

// Uses only the running server; credentials are never loaded into this test process.
const base = `${process.env.TEST_API_URL ?? "http://localhost:3151"}/agents/real-support/voice`;
const capability = await fetch(`${base}/listener`).then((response) => response.json());
assert.equal(capability.data?.enabled, true, "Support agent voice must be configured");
const response = await fetch(`${base}/speak`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: safeStringify({ text: "The local playground voice test is working." }),
  signal: AbortSignal.timeout(60000),
});
assert.equal(response.status, 200, "Speech generation must succeed");
assert.match(response.headers.get("content-type") ?? "", /audio\//);
const audio = await response.blob();
assert.ok(audio.size > 100, "The provider must return audio bytes");
const form = new FormData();
form.append("audio", audio, "synthetic-test.mp3");
form.append("options", safeStringify({ language: "en" }));
const transcription = await fetch(`${base}/listen`, {
  method: "POST",
  body: form,
  signal: AbortSignal.timeout(60000),
});
assert.equal(transcription.status, 200, "Transcription must succeed");
const result = await transcription.json();
assert.match(result.data?.text ?? "", /playground/i);
assert.match(result.data?.text ?? "", /working/i);
console.log("Voice round trip passed: synthetic speech → transcription. No microphone used.");
