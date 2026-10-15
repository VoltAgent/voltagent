import { useQuery } from "@tanstack/react-query";
import { safeStringify } from "@voltagent/internal";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

interface Reply {
  id: string;
  text: string;
}
export function VoiceControls({
  agentId,
  running,
  blocked,
  reply,
  onDraft,
  onSend,
}: {
  agentId: string;
  running: boolean;
  blocked: boolean;
  reply?: Reply;
  onDraft: (text: string) => void;
  onSend: (text: string) => Promise<void>;
}) {
  const base = `/agents/${encodeURIComponent(agentId)}/voice`;
  const capability = useQuery({
    queryKey: ["voice", agentId],
    queryFn: () => api<{ enabled: boolean; mode: string }>(`${base}/listener`),
    retry: false,
  });
  const [phase, setPhase] = useState<
    "idle" | "recording" | "transcribing" | "waiting" | "speaking"
  >("idle");
  const [continuous, setContinuous] = useState(false);
  const [error, setError] = useState<string>();
  const [voice, setVoice] = useState("");
  const voices = useQuery({
    queryKey: ["voices", agentId],
    queryFn: () => api<Array<{ id: string; name: string }>>(`${base}/voices`),
    enabled: capability.data?.enabled === true,
    retry: false,
  });
  const session = useRef(false);
  const recorder = useRef<MediaRecorder | undefined>(undefined);
  const stream = useRef<MediaStream | undefined>(undefined);
  const audioContext = useRef<AudioContext | undefined>(undefined);
  const player = useRef<HTMLAudioElement | undefined>(undefined);
  const audioUrl = useRef<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const request = useRef<AbortController | undefined>(undefined);
  const cancelled = useRef(false);
  const generation = useRef(0);
  const lastSpoken = useRef("");
  const sawRun = useRef(false);
  const restart = useRef<() => void>(() => {});
  const callbacks = useRef({ onDraft, onSend });
  callbacks.current = { onDraft, onSend };
  const releaseMic = useCallback(() => {
    clearInterval(timer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = undefined;
    void audioContext.current?.close().catch(() => {});
    audioContext.current = undefined;
  }, []);
  const stop = useCallback(() => {
    generation.current += 1;
    cancelled.current = true;
    session.current = false;
    request.current?.abort();
    if (recorder.current?.state === "recording") recorder.current.stop();
    releaseMic();
    player.current?.pause();
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = undefined;
    setContinuous(false);
    setPhase("idle");
  }, [releaseMic]);
  useEffect(() => () => stop(), [stop]);
  const fail = useCallback(
    (cause: unknown) => {
      if (cancelled.current) return;
      stop();
      setError(cause instanceof Error ? cause.message : String(cause));
    },
    [stop],
  );
  const speak = useCallback(
    async (text: string) => {
      const currentGeneration = ++generation.current;
      cancelled.current = false;
      request.current = new AbortController();
      setError(undefined);
      setPhase("speaking");
      try {
        const response = await fetch(`/api${base}/speak`, {
          method: "POST",
          signal: request.current.signal,
          headers: { "Content-Type": "application/json" },
          body: safeStringify({ text, options: voice ? { voice } : {} }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "Speech generation failed");
        }
        const blob = await response.blob();
        if (cancelled.current || currentGeneration !== generation.current) return;
        if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
        audioUrl.current = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl.current);
        player.current = audio;
        audio.onended = () => {
          if (currentGeneration !== generation.current) return;
          if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
          audioUrl.current = undefined;
          setPhase("idle");
          if (session.current) restart.current();
        };
        audio.onerror = () => {
          if (currentGeneration === generation.current)
            fail(new Error("The browser could not play this voice response"));
        };
        await audio.play();
      } catch (cause) {
        if (currentGeneration === generation.current) fail(cause);
      }
    },
    [base, voice, fail],
  );
  const record = async (conversation: boolean) => {
    const currentGeneration = ++generation.current;
    cancelled.current = false;
    setError(undefined);
    setPhase("recording");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
        throw new Error("Microphone recording is not supported in this browser");
      const capture = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (cancelled.current || currentGeneration !== generation.current) {
        capture.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = capture;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      if (!mimeType) throw new Error("The browser has no supported recording format");
      const current = new MediaRecorder(capture, { mimeType });
      recorder.current = current;
      const chunks: Blob[] = [];
      let heardSpeech = !conversation;
      current.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      current.onerror = () => {
        if (currentGeneration === generation.current)
          fail(new Error("Microphone recording failed"));
      };
      current.onstop = async () => {
        if (currentGeneration !== generation.current) return;
        releaseMic();
        if (cancelled.current || currentGeneration !== generation.current) return;
        if (!heardSpeech) {
          stop();
          setError("No speech detected. Start voice again when ready.");
          return;
        }
        setPhase("transcribing");
        request.current = new AbortController();
        try {
          const form = new FormData();
          form.append(
            "audio",
            new Blob(chunks, { type: mimeType }),
            mimeType.includes("mp4") ? "recording.mp4" : "recording.webm",
          );
          const response = await fetch(`/api${base}/listen`, {
            method: "POST",
            body: form,
            signal: request.current.signal,
          });
          const data = await response.json();
          if (!response.ok || !data.success) throw new Error(data.error ?? "Transcription failed");
          if (cancelled.current || currentGeneration !== generation.current) return;
          const text = String(data.data?.text ?? "").trim();
          if (!text) throw new Error("No speech was recognized");
          if (conversation && session.current) {
            sawRun.current = false;
            setPhase("waiting");
            await callbacks.current.onSend(text);
          } else {
            callbacks.current.onDraft(text);
            setPhase("idle");
          }
        } catch (cause) {
          if (currentGeneration === generation.current) fail(cause);
        }
      };
      current.start();
      setPhase("recording");
      const started = Date.now();
      let lastSound = started;
      let analyser: AnalyserNode | undefined;
      if (conversation) {
        const context = new AudioContext();
        audioContext.current = context;
        await context.resume();
        if (currentGeneration !== generation.current) return;
        analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        context.createMediaStreamSource(capture).connect(analyser);
      }
      const samples = new Float32Array(2048);
      timer.current = setInterval(() => {
        if (analyser) {
          analyser.getFloatTimeDomainData(samples);
          const level = Math.sqrt(
            samples.reduce((sum, item) => sum + item * item, 0) / samples.length,
          );
          if (level > 0.015) {
            heardSpeech = true;
            lastSound = Date.now();
          }
        }
        if (
          Date.now() - started > 60000 ||
          (conversation &&
            ((heardSpeech && Date.now() - lastSound > 1400) ||
              (!heardSpeech && Date.now() - started > 15000)))
        ) {
          clearInterval(timer.current);
          if (current.state === "recording") current.stop();
        }
      }, 100);
    } catch (cause) {
      if (currentGeneration === generation.current) fail(cause);
    }
  };
  restart.current = () => {
    void record(true);
  };
  useEffect(() => {
    if (!session.current || phase !== "waiting") return;
    if (running) {
      sawRun.current = true;
      return;
    }
    if (blocked) {
      stop();
      setError("Voice paused. Resolve the tool action or error in chat to continue.");
      return;
    }
    if (reply && reply.id !== lastSpoken.current && reply.text.trim()) {
      lastSpoken.current = reply.id;
      void speak(reply.text);
    } else if (sawRun.current) {
      stop();
      setError("The run ended without a text reply. Inspect the tool results in chat.");
    }
  }, [reply, running, phase, blocked, speak, stop]);
  if (!capability.data?.enabled) return null;
  return (
    <details className="voice-controls">
      <summary>Voice{phase !== "idle" ? ` · ${phase}` : ""}</summary>
      <p className="muted">
        Dictate a draft, or start a conversation: speak, pause for a reply, then speak again.
      </p>
      {voices.data?.length ? (
        <label className="field">
          <span>Speaker</span>
          <select
            value={voice}
            onChange={(event) => setVoice(event.target.value)}
            disabled={phase !== "idle"}
          >
            <option value="">Agent default</option>
            {voices.data.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="voice-buttons">
        {phase === "idle" ? (
          <>
            <button
              type="button"
              disabled={running || blocked}
              onClick={() => {
                void record(false);
              }}
            >
              Dictate
            </button>
            <button
              type="button"
              disabled={running || blocked}
              onClick={() => {
                session.current = true;
                setContinuous(true);
                lastSpoken.current = reply?.id ?? "";
                void record(true);
              }}
            >
              Start voice conversation
            </button>
            {reply?.text && (
              <button
                type="button"
                disabled={running}
                onClick={() => {
                  void speak(reply.text);
                }}
              >
                Read last reply
              </button>
            )}
          </>
        ) : (
          <>
            {phase === "recording" && !continuous && (
              <button type="button" onClick={() => recorder.current?.stop()}>
                Use recording
              </button>
            )}
            <button type="button" onClick={stop}>
              {continuous ? "End voice conversation" : "Cancel voice"}
            </button>
          </>
        )}
      </div>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
    </details>
  );
}
