import { VoltAgent, VoltOpsClient } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

import { cleanEnv, str } from "envalid";
import { generalAgent } from "#/agents/general";
import { geographyAgent } from "#/agents/geography";
import { historyAgent } from "#/agents/history";
import { mathAgent } from "#/agents/math";
import { scienceAgent } from "#/agents/science";
import { supervisorAgent } from "#/agents/supervisor";

const env = cleanEnv(process.env, {
  VOLTOPS_PUBLIC_KEY: str(),
  VOLTOPS_SECRET_KEY: str(),
});

export const voltagent = new VoltAgent({
  agents: {
    supervisor: supervisorAgent,
    general: generalAgent,
    math: mathAgent,
    geography: geographyAgent,
    history: historyAgent,
    science: scienceAgent,
  },
  voltOpsClient: new VoltOpsClient({
    publicKey: env.VOLTOPS_PUBLIC_KEY,
    secretKey: env.VOLTOPS_SECRET_KEY,
  }),
  server: honoServer(),
});
