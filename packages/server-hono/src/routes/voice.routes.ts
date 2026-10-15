import { Readable } from "node:stream";
import type { ServerProviderDeps } from "@voltagent/core";
import {
  VoiceRequestError,
  getAgentVoice,
  handleVoiceListen,
  handleVoiceSpeak,
} from "@voltagent/server-core";
import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { OpenAPIHonoType } from "../zod-openapi-compat";

function failure(c: Context, error: unknown) {
  return c.json(
    { success: false, error: error instanceof Error ? error.message : "Voice request failed" },
    error instanceof VoiceRequestError ? error.status : 500,
  );
}

/** Runs behind the same authentication middleware as all other agent routes. */
export function registerVoiceRoutes(app: OpenAPIHonoType, deps: ServerProviderDeps) {
  const parameters = [
    { name: "id", in: "path" as const, required: true, schema: { type: "string" as const } },
  ];
  for (const [action, summary] of [
    ["listener", "Check agent voice capability"],
    ["voices", "List available speakers"],
  ]) {
    app.openAPIRegistry.registerPath({
      method: "get",
      path: `/agents/{id}/voice/${action}`,
      tags: ["Voice"],
      summary,
      parameters,
      responses: {
        200: { description: "Voice capability or speakers, wrapped in success/data" },
        404: { description: "Agent not found" },
      },
    });
  }
  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/agents/{id}/voice/speak",
    tags: ["Voice"],
    summary: "Generate speech with the agent voice provider",
    parameters,
    request: {
      body: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["text"],
              properties: {
                text: { type: "string", minLength: 1, maxLength: 10000 },
                options: {
                  type: "object",
                  properties: {
                    voice: { type: "string" },
                    speed: { type: "number", minimum: 0.25, maximum: 4 },
                    pitch: { type: "number", minimum: -20, maximum: 20 },
                  },
                },
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "MP3 audio stream",
        content: { "audio/mpeg": { schema: { type: "string", format: "binary" } } },
      },
      400: { description: "Invalid text or options" },
      409: { description: "Voice is not configured" },
      413: { description: "Request exceeds 100 KB" },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/agents/{id}/voice/listen",
    tags: ["Voice"],
    summary: "Transcribe a recording with the agent voice provider",
    parameters,
    request: {
      body: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["audio"],
              properties: {
                audio: {
                  type: "string",
                  format: "binary",
                  description: "WebM, MP4, WAV, or MP3 recording; maximum 20 MB",
                },
                options: { type: "string", description: "JSON object with optional language" },
              },
            },
          },
        },
      },
    },
    responses: {
      200: { description: "Transcribed text in data.text" },
      400: { description: "Invalid audio or options" },
      409: { description: "Voice is not configured" },
      413: { description: "Recording exceeds 20 MB" },
    },
  });
  app.get("/agents/:id/voice/listener", (c) => {
    try {
      return c.json({
        success: true,
        data: { enabled: Boolean(getAgentVoice(c.req.param("id"), deps)), mode: "turn-based" },
      });
    } catch (error) {
      return failure(c, error);
    }
  });
  app.get("/agents/:id/voice/voices", async (c) => {
    try {
      const voice = getAgentVoice(c.req.param("id"), deps);
      return c.json({ success: true, data: voice ? await voice.getVoices() : [] });
    } catch (error) {
      return failure(c, error);
    }
  });
  app.post("/agents/:id/voice/speak", bodyLimit({ maxSize: 100 * 1024 }), async (c) => {
    try {
      const body = await c.req.json().catch(() => {
        throw new VoiceRequestError("Invalid JSON request");
      });
      const stream = await handleVoiceSpeak(c.req.param("id"), body, deps);
      const readable = stream instanceof Readable ? stream : new Readable().wrap(stream);
      const abort = () => readable.destroy();
      c.req.raw.signal.addEventListener("abort", abort, { once: true });
      readable.once("close", () => c.req.raw.signal.removeEventListener("abort", abort));
      return new Response(Readable.toWeb(readable) as ReadableStream<Uint8Array>, {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
      });
    } catch (error) {
      return failure(c, error);
    }
  });
  app.post("/agents/:id/voice/listen", bodyLimit({ maxSize: 21 * 1024 * 1024 }), async (c) => {
    try {
      const form = await c.req.formData().catch(() => {
        throw new VoiceRequestError("Expected an audio file upload");
      });
      const audio = form.get("audio");
      if (!(audio instanceof File)) throw new VoiceRequestError("Upload an audio file");
      let options: unknown = {};
      const raw = form.get("options");
      if (typeof raw === "string") {
        try {
          options = JSON.parse(raw);
        } catch {
          throw new VoiceRequestError("Invalid transcription options");
        }
      }
      const text = await handleVoiceListen(
        c.req.param("id"),
        new Uint8Array(await audio.arrayBuffer()),
        audio.type,
        options,
        deps,
      );
      return c.json({ success: true, data: { text } });
    } catch (error) {
      return failure(c, error);
    }
  });
}
