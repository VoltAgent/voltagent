import { createNetlifyFunctionHandler } from "@voltagent/serverless-hono";
import { getVoltAgent } from "../../src/index";

const voltAgent = getVoltAgent();

export const handler = createNetlifyFunctionHandler(voltAgent);
