import type {
  Agent,
  VoltAgentExporter,
  VoltAgentExporterOptions,
  VoltAgentOptions,
} from "@voltagent/core";
import type { FastifyPluginAsync } from "fastify";

export type FastifyVoltAgentOptions = Omit<VoltAgentOptions, "agents" | "telemetryExporter"> & {
  agents?: Record<string, Agent<any>>;
  telemetryExporter?: VoltAgentExporter | VoltAgentExporterOptions;
};

export type FastifyVoltAgent = FastifyPluginAsync<FastifyVoltAgentOptions>;
