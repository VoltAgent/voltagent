import { VoltAgent, VoltAgentExporter, type VoltAgentExporterOptions } from "@voltagent/core";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { FastifyVoltAgent, FastifyVoltAgentOptions } from "./types";

/**
 * Fastify plugin that allows you to share the same `prisma` connection across your entire fastify app.
 *
 * @example
 *  ```typescript
 * await fastify.register(fastifyVoltAgent, {
 *   agents: { myAgent },
 *   telemetryExporter: new VoltAgentExporter(),
 * });
 *
 * // OR
 *
 * await fastify.register(fastifyVoltAgent, {
 *   agents: { myAgent },
 *   telemetryExporter: {
 *     publicKey: "YOUR_PUBLIC_KEY",
 *     privateKey: "YOUR_PRIVATE_KEY",
 *     baseUrl: "https://api.voltagent.dev",
 *   },
 * });
 *
 * fastify.get('/agents', async (request, reply) => {
 *   const agents = fastify.volt.getAgents();
 *   return agents;
 * });
 * ```
 */
export default fp(
  async (fastify: FastifyInstance, { agents, ...opts }: FastifyVoltAgentOptions): Promise<void> => {
    if (!fastify.hasDecorator("volt")) {
      // Decorate the fastify instance with the Prisma client
      fastify.decorate(
        "volt",
        new VoltAgent({
          ...opts,
          // We allow for agents to be added later using the plugin
          agents: agents ?? {},
          telemetryExporter: createTelemetryExporter(opts.telemetryExporter),
        }),
      );
    } else {
      throw new Error(
        "A `volt` decorator has already been registered, please ensure you are not registering multiple instances of this plugin",
      );
    }
  },
  {
    name: "@voltagent/fastify",
    fastify: "5.x",
  },
) satisfies FastifyVoltAgent;

/**
 * Create a telemetry exporter from the given options
 * @param exporter - The exporter to create
 * @returns The created exporter
 */
function createTelemetryExporter(
  exporter?: VoltAgentExporter | VoltAgentExporterOptions,
): VoltAgentExporter | undefined {
  if (isNil(exporter)) {
    return undefined;
  }

  if (exporter instanceof VoltAgentExporter) {
    return exporter;
  }

  return new VoltAgentExporter(exporter);
}

function isNil(value: any): value is null | undefined {
  return value === null || value === undefined;
}
