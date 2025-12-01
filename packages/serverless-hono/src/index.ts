import type { ServerProviderDeps } from "@voltagent/core";
import { HonoServerlessProvider } from "./serverless-provider";
import type { ServerlessConfig } from "./types";

export function serverlessHono(config?: ServerlessConfig) {
  return (deps: ServerProviderDeps) => new HonoServerlessProvider(deps, config);
}

export { HonoServerlessProvider } from "./serverless-provider";
export type { ServerlessConfig, ServerlessRuntime } from "./types";
export { detectServerlessRuntime } from "./utils/runtime-detection";
export {
  createNetlifyFunctionHandler,
  type NetlifyFunctionEvent,
  type NetlifyFunctionHandler,
  type NetlifyFunctionResult,
} from "./netlify-function";
export {
  createAwsLambdaHandler,
  type AwsLambdaEvent,
  type AwsLambdaHandler,
  type AwsLambdaResult,
  type AwsLambdaContext,
} from "./aws-lambda";
export default serverlessHono;
