/**
 * Generate a cryptographically strong UUID in both Node.js and edge runtimes.
 *
 * Prefers the WHATWG crypto API when available (Cloudflare Workers, modern Node),
 * falling back to a best-effort random implementation if necessary.
 */
export const randomUUID = (): string => {
  const cryptoApi = typeof globalThis !== "undefined" ? (globalThis as any).crypto : undefined;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID (should be rare)
  const fallback = () => {
    let uuid = "";
    const random = () => Math.floor(Math.random() * 0xffff);
    uuid += random().toString(16).padStart(4, "0");
    uuid += random().toString(16).padStart(4, "0");
    uuid += "-";
    uuid += random().toString(16).padStart(4, "0");
    uuid += "-";
    uuid += ((random() & 0x0fff) | 0x4000).toString(16).padStart(4, "0");
    uuid += "-";
    uuid += ((random() & 0x3fff) | 0x8000).toString(16).padStart(4, "0");
    uuid += "-";
    uuid += random().toString(16).padStart(4, "0");
    uuid += random().toString(16).padStart(4, "0");
    uuid += random().toString(16).padStart(4, "0");
    return uuid;
  };

  return fallback();
};
