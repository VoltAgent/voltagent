import { Buffer } from "node:buffer";
import type { VoltAgent } from "@voltagent/core";

interface AwsLambdaEvent {
  httpMethod?: string;
  headers?: Record<string, string | undefined>;
  multiValueHeaders?: Record<string, (string | undefined)[] | undefined>;
  rawUrl?: string;
  rawQueryString?: string;
  rawPath?: string;
  path?: string;
  body?: string | null;
  isBase64Encoded?: boolean;
  requestContext?: {
    protocol?: string;
    domainName?: string;
    stage?: string;
  };
}

interface AwsLambdaResult {
  statusCode: number;
  headers?: Record<string, string>;
  multiValueHeaders?: Record<string, string[]>;
  body: string;
  isBase64Encoded: boolean;
}

interface AwsLambdaContext {
  callbackWaitsForEmptyEventLoop?: boolean;
  functionName?: string;
  functionVersion?: string;
  invokedFunctionArn?: string;
  memoryLimitInMB?: string;
  awsRequestId?: string;
  logGroupName?: string;
  logStreamName?: string;
  identity?: unknown;
  clientContext?: unknown;
  getRemainingTimeInMillis?: () => number;
}

type AwsLambdaHandler = (
  event: AwsLambdaEvent,
  context: AwsLambdaContext,
) => Promise<AwsLambdaResult>;

const TEXT_BODY_METHODS = new Set(["GET", "HEAD"]);

function buildUrl(event: AwsLambdaEvent): string {
  const scheme = event.headers?.["x-forwarded-proto"] || "https";
  const host = event.headers?.host || event.requestContext?.domainName || "localhost";
  const stage = event.requestContext?.stage || "";
  const path = event.rawPath || event.path || "/";
  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";

  // Remove stage prefix from path if it exists
  const cleanPath = stage && path.startsWith(`/${stage}`) ? path.slice(stage.length + 1) : path;

  return `${scheme}://${host}${cleanPath}${query}`;
}

function createRequest(event: AwsLambdaEvent): Request {
  const method = (event.httpMethod || "GET").toUpperCase();
  const headers = new Headers();

  if (event.multiValueHeaders) {
    for (const [key, values] of Object.entries(event.multiValueHeaders)) {
      if (!values) continue;
      for (const value of values) {
        if (value !== undefined) {
          headers.append(key, value);
        }
      }
    }
  }

  if (event.headers) {
    for (const [key, value] of Object.entries(event.headers)) {
      if (value !== undefined) {
        headers.set(key, value);
      }
    }
  }

  const url = event.rawUrl || buildUrl(event);

  const init: Record<string, unknown> = { method, headers };

  if (!TEXT_BODY_METHODS.has(method) && event.body) {
    init.body = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
  }

  return new Request(url, init as RequestInit);
}

function toAwsLambdaResponse(response: Response): Promise<AwsLambdaResult> {
  const single: Record<string, string> = {};
  const multi: Record<string, string[]> = {};

  response.headers.forEach((value, key) => {
    if (single[key]) {
      multi[key] = [single[key], value];
      delete single[key];
    } else if (multi[key]) {
      multi[key].push(value);
    } else {
      single[key] = value;
    }
  });

  return response.arrayBuffer().then((buffer) => ({
    statusCode: response.status,
    headers: Object.keys(single).length > 0 ? single : undefined,
    multiValueHeaders: Object.keys(multi).length > 0 ? multi : undefined,
    body: Buffer.from(buffer).toString("base64"),
    isBase64Encoded: true,
  }));
}

export function createAwsLambdaHandler(voltAgent: VoltAgent): AwsLambdaHandler {
  const provider = voltAgent.serverless();

  return async (event, context) => {
    // Prevent Lambda from waiting for empty event loop
    context.callbackWaitsForEmptyEventLoop = false;

    const request = createRequest(event);
    const response = await provider.handleRequest(request);
    return toAwsLambdaResponse(response);
  };
}

export type { AwsLambdaHandler, AwsLambdaEvent, AwsLambdaResult, AwsLambdaContext };