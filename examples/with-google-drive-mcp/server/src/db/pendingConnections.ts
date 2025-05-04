import type { ConnectionRequest } from "composio-core";

// Store the last initiated request details (Not suitable for multi-instance/user production)
let lastPendingRequest: { userId: string; request: ConnectionRequest } | null = null;

export function storePendingConnection(userId: string, request: ConnectionRequest): void {
  console.log(`Storing pending request for potential user: ${userId}`);
  lastPendingRequest = { userId, request };
}

export function getPendingConnection(): {
  userId: string;
  request: ConnectionRequest;
} | null {
  return lastPendingRequest;
}

export function removePendingConnection(): void {
  console.log("Removing pending request.");
  lastPendingRequest = null;
}
