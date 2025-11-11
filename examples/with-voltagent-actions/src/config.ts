import { VoltOpsClient } from "@voltagent/core";

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || !value.trim()) {
    throw new Error(`[with-voltagent-actions] Missing required environment variable: ${key}`);
  }
  return value.trim();
}

const rawBaseUrl = (process.env.VOLT_API_BASE_URL ?? "https://api.voltagent.dev").trim();
const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
const publicKey = getRequiredEnv("VOLTAGENT_PUBLIC_KEY");
const secretKey = getRequiredEnv("VOLTAGENT_SECRET_KEY");

const credentialId = getRequiredEnv("AIRTABLE_CREDENTIAL_ID");
const baseId = getRequiredEnv("AIRTABLE_BASE_ID");
const tableId = getRequiredEnv("AIRTABLE_TABLE_ID");

export const actionsClient = new VoltOpsClient({
  baseUrl,
  publicKey,
  secretKey,
});

export const actionsConfig = {
  airtable: {
    credentialId,
    baseId,
    tableId,
  },
} as const;

const baseHeaders: Record<string, string> = {
  "X-Public-Key": publicKey,
  "X-Secret-Key": secretKey,
};

const MCP_ENDPOINTS: Record<string, string> = {
  airtable: "mcp/airtable",
  slack: "mcp/slack",
  all: "mcp",
};

export function createVoltOpsMcpServer(service = "airtable") {
  const normalizedService = service.trim().toLowerCase();
  const endpoint = MCP_ENDPOINTS[normalizedService] ?? MCP_ENDPOINTS.airtable;
  const url = endpoint === "mcp" ? `${baseUrl}/mcp` : `${baseUrl}/${endpoint}`;

  return {
    type: "streamable-http" as const,
    url,
    requestInit: {
      headers: { ...baseHeaders },
    },
  };
}

export function createComposio() {
  return {
    type: "streamable-http" as const,
    url: "https://backend.composio.dev/v3/mcp/83744b34-49a0-425b-b6ac-fc62ec987571/mcp?user_id=pg-test-150eb3eb-0417-4acf-9823-cd2d3aaa0a86",
    requestInit: {
      headers: {
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1c2VyXzAxSzlHQkQ5RUtHVERIMFJGN1cwNTM1NEVWIiwib3JnSWQiOiJvcmdfMDFLOUdCREJTUlZHRUpFRFJRNzdNNzJTUVQiLCJpYXQiOjE3NjI1NTk0NDd9.UHWLcSfHYp4rWh-ZFBMSj-mF0crR_PrYk92nmQweBog",
      },
    },
  };
}
