import {
  Agent,
  Memory,
  VoltAgent,
  createInputMiddleware,
  createOutputMiddleware,
} from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

const logger = createPinoLogger({
  name: "with-middleware",
  level: "info",
});

const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
});

const normalizeInput = createInputMiddleware({
  name: "NormalizeInput",
  handler: ({ input }) => {
    if (typeof input !== "string") {
      return input;
    }
    return input.trim();
  },
});

const requireSignature = createOutputMiddleware<string>({
  name: "RequireSignature",
  handler: ({ output, abort }) => {
    if (!output.includes("-- Support")) {
      abort(
        'Retry required. Respond again and end the response with "-- Support". Do not omit it.',
        {
          retry: true,
          metadata: { signature: "-- Support" },
        },
      );
    }
    return output;
  },
});

const agent = new Agent({
  name: "MiddlewareAgent",
  instructions: "Answer support questions with short, direct replies. ",
  model: "openai/gpt-4o-mini",
  memory,
  inputMiddlewares: [normalizeInput],
  outputMiddlewares: [requireSignature],
  maxMiddlewareRetries: 1,
});

new VoltAgent({
  agents: { agent },
  server: honoServer(),
  logger,
});
