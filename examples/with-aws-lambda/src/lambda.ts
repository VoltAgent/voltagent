import { createAwsLambdaHandler } from "@voltagent/serverless-hono";
import { getVoltAgent } from "./index";

const voltAgent = getVoltAgent();

export const handler = createAwsLambdaHandler(voltAgent);