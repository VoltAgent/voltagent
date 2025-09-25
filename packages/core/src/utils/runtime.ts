export const isServerlessRuntime = (): boolean => {
  if (typeof globalThis === "undefined") {
    return false;
  }

  const globalRef = globalThis as typeof globalThis & {
    EdgeRuntime?: unknown;
    Deno?: unknown;
    Netlify?: unknown;
    navigator?: { userAgent?: string };
  };

  if (typeof globalRef.EdgeRuntime !== "undefined") {
    return true;
  }

  if (typeof globalRef.Deno !== "undefined") {
    return true;
  }

  if (typeof globalRef.Netlify !== "undefined") {
    return true;
  }

  const userAgent = globalRef.navigator?.userAgent;
  if (typeof userAgent === "string" && userAgent.includes("Cloudflare")) {
    return true;
  }

  return false;
};

export const isNodeRuntime = (): boolean => {
  if (typeof process === "undefined") {
    return false;
  }

  const versions = (process as typeof process & { versions?: { node?: string } }).versions;
  return !!versions?.node;
};

export const getEnvVar = (key: string): string | undefined => {
  if (typeof process === "undefined") {
    return undefined;
  }

  const env = (process as typeof process & { env?: Record<string, unknown> }).env;
  if (!env) {
    return undefined;
  }

  const value = env[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};
