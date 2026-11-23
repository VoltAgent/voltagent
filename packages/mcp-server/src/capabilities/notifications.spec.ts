import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  PromptListChangedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PromptBridge } from "./prompts";
import { ResourceBridge } from "./resources";

const clients: Client[] = [];
const servers: Server[] = [];

function createServer() {
  const server = new Server(
    { name: "notification-test", version: "1.0.0" },
    {
      capabilities: {
        prompts: { listChanged: true },
        resources: { listChanged: true, subscribe: true },
      },
    },
  );
  servers.push(server);
  return server;
}

async function connectServer() {
  const server = createServer();
  const client = new Client({ name: "notification-client", version: "1.0.0" });
  clients.push(client);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { server, client };
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("capability notifications with disconnected servers", () => {
  it("delivers prompt changes while ignoring unconnected and closed servers", async () => {
    const bridge = new PromptBridge();
    bridge.attach({ server: createServer() });
    const active = await connectServer();
    const closed = await connectServer();
    bridge.registerServer(active.server);
    bridge.registerServer(closed.server);
    await closed.client.close();

    const received = vi.fn();
    active.client.setNotificationHandler(PromptListChangedNotificationSchema, received);

    await expect(bridge.notifyChanged()).resolves.toBeUndefined();
    await vi.waitFor(() => expect(received).toHaveBeenCalledTimes(1));
    await active.client.close();
    await expect(bridge.notifyChanged()).resolves.toBeUndefined();
  });

  it("delivers resource list changes while ignoring unconnected and closed servers", async () => {
    const bridge = new ResourceBridge();
    bridge.attach({ server: createServer() });
    const active = await connectServer();
    const closed = await connectServer();
    bridge.registerServer(active.server);
    bridge.registerServer(closed.server);
    await closed.client.close();

    const received = vi.fn();
    active.client.setNotificationHandler(ResourceListChangedNotificationSchema, received);

    await expect(bridge.notifyListChanged()).resolves.toBeUndefined();
    await vi.waitFor(() => expect(received).toHaveBeenCalledTimes(1));
    await active.client.close();
    await expect(bridge.notifyListChanged()).resolves.toBeUndefined();
  });

  it("delivers resource updates while ignoring unconnected and closed servers", async () => {
    const bridge = new ResourceBridge();
    bridge.attach({ server: createServer() });
    const active = await connectServer();
    const closed = await connectServer();
    bridge.registerServer(active.server);
    bridge.registerServer(closed.server);
    await closed.client.close();
    await bridge.handleSubscribe("volt://changed");

    const received = vi.fn();
    active.client.setNotificationHandler(ResourceUpdatedNotificationSchema, received);

    await expect(bridge.notifyUpdated("volt://changed")).resolves.toBeUndefined();
    await vi.waitFor(() => expect(received).toHaveBeenCalledTimes(1));
    await active.client.close();
    await expect(bridge.notifyUpdated("volt://changed")).resolves.toBeUndefined();
  });

  it("still propagates notification errors from connected servers", async () => {
    const bridge = new PromptBridge();
    const active = await connectServer();
    bridge.attach({ server: active.server });
    const error = new Error("active transport send failed");
    vi.spyOn(active.server, "sendPromptListChanged").mockRejectedValue(error);

    await expect(bridge.notifyChanged()).rejects.toBe(error);
  });
});
