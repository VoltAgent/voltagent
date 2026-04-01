import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Configstore from "configstore";
import dotenv from "dotenv";
import inquirer from "inquirer";

export interface AuthConfig {
  baseUrl: string;
  publicKey: string;
  secretKey: string;
}

export interface ResolveAuthOptions {
  promptIfMissing?: boolean;
}

export interface VoltOpsConfig {
  token: string;
  user: {
    email: string;
    name: string;
  };
  loginDate: string;
}

const ENV_FILE_NAME = ".env";
const normaliseBaseUrl = (input: string): string => input.replace(/\/?$/, "");
const DEFAULT_API_URL = "https://api.voltagent.dev";

interface LoadedEnvFile {
  path: string;
  parsed: boolean;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

let envCredentialMessageShown = false;

const loadLocalEnvFile = (): LoadedEnvFile | null => {
  const envPath = path.resolve(process.cwd(), ENV_FILE_NAME);
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath, override: false });
    return {
      path: envPath,
      parsed: result.parsed !== undefined,
    };
  }
  return null;
};

const upsertEnvValues = (envPath: string, values: Record<string, string>) => {
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    if (pattern.test(content)) {
      content = content.replace(pattern, line);
    } else {
      if (content && !content.endsWith("\n")) {
        content += "\n";
      }
      content += `${line}\n`;
    }
  }

  fs.writeFileSync(envPath, content, "utf-8");
};

export const resolveAuthConfig = async (options: ResolveAuthOptions = {}): Promise<AuthConfig> => {
  const envFile = loadLocalEnvFile();
  const envPath = envFile?.path ?? null;
  const envWasLoaded = envFile?.parsed ?? false;

  const envBaseUrl = process.env.VOLTAGENT_API_URL;
  const envPublic = process.env.VOLTAGENT_PUBLIC_KEY;
  const envSecret = process.env.VOLTAGENT_SECRET_KEY;

  if (isNonEmptyString(envBaseUrl) && isNonEmptyString(envPublic) && isNonEmptyString(envSecret)) {
    if (envWasLoaded && envPath && !envCredentialMessageShown) {
      const relativePath = path.relative(process.cwd(), envPath);
      const displayPath =
        relativePath && !relativePath.startsWith("..") ? relativePath || ENV_FILE_NAME : envPath;
      console.log(`Using VoltAgent credentials from ${displayPath}`);
      envCredentialMessageShown = true;
    }

    return {
      baseUrl: normaliseBaseUrl(envBaseUrl.trim()),
      publicKey: envPublic.trim(),
      secretKey: envSecret.trim(),
    };
  }

  if (!options.promptIfMissing) {
    throw new Error(
      "VoltAgent credentials not found. Set VOLTAGENT_API_URL, VOLTAGENT_PUBLIC_KEY, VOLTAGENT_SECRET_KEY in your environment or .env file.",
    );
  }

  const baseUrlSource = isNonEmptyString(envBaseUrl) ? envBaseUrl : DEFAULT_API_URL;
  const baseUrl = normaliseBaseUrl(baseUrlSource.trim());

  const prompts: Array<inquirer.QuestionCollection<{ publicKey?: string; secretKey?: string }>> =
    [];
  if (!isNonEmptyString(envPublic)) {
    prompts.push({
      type: "password",
      name: "publicKey",
      message: "VoltAgent public key",
      mask: "*",
      validate: (value: string) => (isNonEmptyString(value) ? true : "Public key cannot be empty"),
    });
  }

  if (!isNonEmptyString(envSecret)) {
    prompts.push({
      type: "password",
      name: "secretKey",
      message: "VoltAgent secret key",
      mask: "*",
      validate: (value: string) => (isNonEmptyString(value) ? true : "Secret key cannot be empty"),
    });
  }

  const answers =
    prompts.length > 0
      ? await inquirer.prompt<{ publicKey?: string; secretKey?: string }>(prompts)
      : ({ publicKey: envPublic, secretKey: envSecret } as {
          publicKey?: string;
          secretKey?: string;
        });

  const publicKeySource = isNonEmptyString(envPublic) ? envPublic : answers.publicKey;
  const secretKeySource = isNonEmptyString(envSecret) ? envSecret : answers.secretKey;

  if (!isNonEmptyString(publicKeySource) || !isNonEmptyString(secretKeySource)) {
    throw new Error(
      "VoltAgent credentials not found. Provide VOLTAGENT_PUBLIC_KEY and VOLTAGENT_SECRET_KEY.",
    );
  }

  const publicKey = publicKeySource.trim();
  const secretKey = secretKeySource.trim();

  process.env.VOLTAGENT_API_URL = baseUrl;
  process.env.VOLTAGENT_PUBLIC_KEY = publicKey;
  process.env.VOLTAGENT_SECRET_KEY = secretKey;

  const targetEnvPath = envPath ?? path.resolve(process.cwd(), ENV_FILE_NAME);
  upsertEnvValues(targetEnvPath, {
    VOLTAGENT_PUBLIC_KEY: publicKey,
    VOLTAGENT_SECRET_KEY: secretKey,
  });

  return {
    baseUrl,
    publicKey,
    secretKey,
  };
};

// VoltOps Token Management (for CLI login)

// Initialize configstore with globalConfigPath option
// This creates config at ~/.config/voltcli/config.json (Linux/macOS) or %APPDATA%\voltcli\config.json (Windows)
const voltOpsConfig = new Configstore(
  "voltcli",
  {},
  {
    globalConfigPath: true, // Use ~/.config/voltcli instead of ~/.config/configstore/voltcli
  },
);

// Migration: Move old config from ~/.voltcli to new location
const migrateOldConfig = (): void => {
  try {
    const homeDir = os.homedir();
    const oldConfigDir =
      process.platform === "win32"
        ? path.join(process.env.APPDATA || path.join(homeDir, "AppData", "Roaming"), "voltcli")
        : path.join(homeDir, ".voltcli");
    const oldConfigPath = path.join(oldConfigDir, "config.json");

    // Check if old config exists and new config doesn't
    if (fs.existsSync(oldConfigPath) && !voltOpsConfig.has("token")) {
      const oldConfigContent = fs.readFileSync(oldConfigPath, "utf-8");
      const oldConfig: VoltOpsConfig = JSON.parse(oldConfigContent);

      // Migrate to new location
      voltOpsConfig.set("token", oldConfig.token);
      voltOpsConfig.set("user", oldConfig.user);
      voltOpsConfig.set("loginDate", oldConfig.loginDate);

      // Delete old config file
      fs.unlinkSync(oldConfigPath);

      // Try to remove old directory if empty
      try {
        fs.rmdirSync(oldConfigDir);
      } catch {
        // Directory not empty or other error, ignore
      }
    }
  } catch (error) {
    // Migration failed, not critical
    console.error("Warning: Failed to migrate old config:", error);
  }
};

// Run migration once
migrateOldConfig();

export const readVoltOpsToken = (): string | null => {
  return voltOpsConfig.get("token") ?? null;
};

export const readVoltOpsConfig = (): VoltOpsConfig | null => {
  if (!voltOpsConfig.has("token")) {
    return null;
  }

  return {
    token: voltOpsConfig.get("token"),
    user: voltOpsConfig.get("user"),
    loginDate: voltOpsConfig.get("loginDate"),
  };
};

export const writeVoltOpsToken = (token: string, user: { email: string; name: string }): void => {
  voltOpsConfig.set({
    token,
    user,
    loginDate: new Date().toISOString(),
  });
};

export const deleteVoltOpsToken = (): void => {
  voltOpsConfig.clear();
};

export const getVoltOpsConfigPath = (): string => {
  return voltOpsConfig.path;
};

export const getTunnelPrefix = (): string | null => {
  // Load .env if exists
  loadLocalEnvFile();

  return process.env.VOLTAGENT_TUNNEL_PREFIX || null;
};

export const getTunnelPort = (): number => {
  // Load .env if exists
  loadLocalEnvFile();

  const port = process.env.VOLTAGENT_TUNNEL_PORT;
  return port ? Number.parseInt(port, 10) : 3141;
};
