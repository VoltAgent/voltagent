import crypto from "node:crypto";
import os from "node:os";
import { PostHog } from "posthog-node";
import { v4 as uuidv4 } from "uuid";

// Check if telemetry is disabled via environment variable
const isTelemetryDisabled = (): boolean => {
  return (
    process.env.VOLTAGENT_TELEMETRY_DISABLED === "1" ||
    process.env.VOLTAGENT_TELEMETRY_DISABLED === "true"
  );
};

// Initialize PostHog client
const client = new PostHog("phc_cLPjGbbZ9BdRtLG3cxoHNch3ZJnQvNhXCHRkeWUI6z5", {
  host: "https://us.i.posthog.com",
  flushAt: 1,
  flushInterval: 0,
  disableGeoip: false,
});

// Generate a machine-specific but anonymous ID
const getMachineId = (): string => {
  try {
    // Create a hash from stable machine properties
    const hostname = os.hostname();
    const cpus = os.cpus().length;
    const platform = os.platform();
    const arch = os.arch();

    const dataToHash = `${hostname}-${cpus}-${platform}-${arch}`;
    return crypto.createHash("sha256").update(dataToHash).digest("hex").substring(0, 32);
  } catch {
    // Fallback to a random UUID if machine info isn't accessible
    return uuidv4();
  }
};

// Get OS info for analytics with fallback
const getOSInfo = () => {
  try {
    return {
      os_platform: os.platform(),
      os_release: os.release(),
      os_version: os.version(),
      os_arch: os.arch(),
    };
  } catch {
    // Fallback to minimal info if OS info isn't accessible due to security restrictions
    return {
      os_platform: "unknown",
      os_release: "unknown",
      os_version: "unknown",
      os_arch: "unknown",
    };
  }
};

// Function to capture project creation events
export const captureProjectCreation = (options: {
  projectName: string;
  packageManager?: string;
  typescript: boolean;
  fromExample?: string;
  ide?: string;
}) => {
  // Skip if telemetry is disabled
  if (isTelemetryDisabled()) return;

  client.capture({
    distinctId: getMachineId(),
    event: "project_created",
    properties: {
      project_name: options.projectName,
      package_manager: options.packageManager || "unknown",
      typescript: options.typescript,
      from_example: options.fromExample || null,
      ide: options.ide || "none",
      machine_id: getMachineId(),
      ...getOSInfo(),
    },
  });
};

// Function to capture error events
export const captureError = (options: {
  projectName: string;
  errorMessage: string;
  distinctId?: string;
}) => {
  // Skip if telemetry is disabled
  if (isTelemetryDisabled()) return;

  client.capture({
    distinctId: getMachineId(),
    event: "project_creation_error",
    properties: {
      project_name: options.projectName,
      error_message: options.errorMessage,
      machine_id: getMachineId(),
      ...getOSInfo(),
    },
  });
};

export default client;
