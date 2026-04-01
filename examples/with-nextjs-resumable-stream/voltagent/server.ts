import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { agent } from "./agents";

new VoltAgent({
  agents: {
    agent,
  },
  server: honoServer(),
});
