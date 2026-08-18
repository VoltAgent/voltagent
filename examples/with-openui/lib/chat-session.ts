import { createHash, randomUUID } from "node:crypto";

export const anonymousUserCookie = "voltagent-openui-user";

const anonymousIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readAnonymousId(cookieHeader: string | null) {
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator === -1) continue;

    const name = cookie.slice(0, separator).trim();
    const value = cookie.slice(separator + 1).trim();
    if (name === anonymousUserCookie && anonymousIdPattern.test(value)) return value;
  }

  return undefined;
}

export function resolveAnonymousSession(
  cookieHeader: string | null,
  generateId: () => string = randomUUID,
) {
  const existingId = readAnonymousId(cookieHeader);
  const anonymousId = existingId ?? generateId();

  return {
    userId: `anonymous:${anonymousId}`,
    setCookie: existingId
      ? undefined
      : `${anonymousUserCookie}=${anonymousId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${
          process.env.NODE_ENV === "production" ? "; Secure" : ""
        }`,
  };
}

export function deriveConversationId(userId: string, clientThreadId: string) {
  const digest = createHash("sha256")
    .update(userId)
    .update("\0")
    .update(clientThreadId)
    .digest("hex");

  return `openui:${digest}`;
}
