import { VoltOpsClient } from "@voltagent/core";

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || !value.trim()) {
    throw new Error(`[with-voltagent-actions] Missing required environment variable: ${key}`);
  }
  return value.trim();
}

const baseUrl = (process.env.VOLT_API_BASE_URL ?? "https://api.voltagent.dev").trim();
const publicKey = getRequiredEnv("VOLTAGENT_PUBLIC_KEY");
const secretKey = getRequiredEnv("VOLTAGENT_SECRET_KEY");

const credentialId = getRequiredEnv("AIRTABLE_CREDENTIAL_ID");
const baseId = getRequiredEnv("AIRTABLE_BASE_ID");
const tableId = getRequiredEnv("AIRTABLE_TABLE_ID");

const projectId = process.env.VOLTOPS_PROJECT_ID?.trim() ?? null;

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
  projectId,
} as const;
