import { createNetlifyFunctionHandler } from "@voltagent/server-hono";
import { getVoltAgent } from "../../src/index";

const voltAgent = getVoltAgent();

export const handler = createNetlifyFunctionHandler(voltAgent);
