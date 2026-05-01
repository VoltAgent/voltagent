import { GlideClient } from "@valkey/valkey-glide";
import { A2AServer, createValkeyTaskStore } from "@voltagent/a2a-server";
import { VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import {
  createResumableStreamAdapter,
  createResumableStreamValkeyStore,
} from "@voltagent/resumable-streams";
import { honoServer } from "@voltagent/server-hono";
import { assistant } from "./agents/assistant";

const logger = createPinoLogger({
  name: "with-valkey-store",
  level: "debug",
});

const host = process.env.VALKEY_HOST ?? "localhost";
const rawPort = process.env.VALKEY_PORT;
const port = rawPort !== undefined ? Number(rawPort) : 6379;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid VALKEY_PORT "${rawPort}": must be an integer between 1 and 65535`);
}

/**
 * Bootstraps a VoltAgent instance backed by Valkey for both A2A task
 * persistence and resumable streaming. Connects to the Valkey server
 * specified by `VALKEY_HOST` / `VALKEY_PORT` environment variables
 * (defaulting to `localhost:6379`), then starts an HTTP server on port 3141.
 */
async function main() {
  const valkeyClient = await GlideClient.createClient({
    addresses: [{ host, port }],
  });
  logger.info(`Connected to Valkey at ${host}:${port}`);

  const taskStore = await createValkeyTaskStore({
    client: valkeyClient,
    keyPrefix: "example-tasks",
    ttlSeconds: 3600,
  });

  const streamStore = await createResumableStreamValkeyStore({
    client: valkeyClient,
    clientConfig: { addresses: [{ host, port }] },
    keyPrefix: "example-streams",
    ttlSeconds: 600,
  });

  const streamAdapter = await createResumableStreamAdapter({
    streamStore,
  });

  const a2aServerFactory = () =>
    new A2AServer({
      name: "SupportAgent",
      version: "0.1.0",
      description: "A2A server with Valkey-backed task and stream persistence",
      taskStore,
    });

  new VoltAgent({
    agents: { assistant },
    a2aServers: { supportAgent: a2aServerFactory },
    server: honoServer({
      port: 3141,
      resumableStream: { adapter: streamAdapter },
    }),
    logger,
  });

  logger.info("VoltAgent with Valkey stores running on http://localhost:3141");
}

main().catch((err) => {
  logger.error("Failed to start", { error: err });
  process.exit(1);
});
