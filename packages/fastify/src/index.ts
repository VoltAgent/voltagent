import type { VoltAgent } from "@voltagent/core";

export type { FastifyVoltAgent, FastifyVoltAgentOptions } from "./types";

declare module "fastify" {
  interface FastifyInstance {
    volt: VoltAgent;
  }
}
