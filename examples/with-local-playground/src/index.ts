import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { approval, browser, conversation, support } from "./agents.js";
import { triage } from "./workflows.js";

const runtime = new VoltAgent({
  agents: { support, approval, browser, conversation },
  workflows: { triage },
  server: honoServer({ port: Number(process.env.API_PORT ?? 3151) }),
  playground: { enabled: true, port: Number(process.env.PLAYGROUND_PORT ?? 3152) },
});
await runtime.ready;
await runtime.startServer();
console.log(`Real-model playground: ${runtime.getPlaygroundUrl()}`);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await runtime.shutdown();
    process.exit(0);
  });
}
