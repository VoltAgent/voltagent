/** Offline scenario lab: pnpm --filter @voltagent/e2e playground:smoke */
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { createDemoAgents } from "./playground/agents";
import { createDemoWorkflows } from "./playground/workflows";

const runtime = new VoltAgent({
  agents: createDemoAgents(),
  workflows: createDemoWorkflows(),
  server: honoServer({ port: Number(process.env.PLAYGROUND_API_PORT ?? 3141) }),
  playground: { port: Number(process.env.PLAYGROUND_PORT ?? 3142) },
  checkDependencies: false,
});
await runtime.ready;
await runtime.startServer();
console.log(`Playground scenario lab: ${runtime.getPlaygroundUrl()}`);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, async () => {
    await runtime.shutdown();
    process.exit(0);
  });
