import { describe, expect, it, vi } from "vitest";

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

import type { Resource } from "@modelcontextprotocol/sdk/types.js";
import { PromptBridge } from "./prompts";
import { ResourceBridge } from "./resources";

const createPromptServerStub = () =>
  ({
    sendPromptListChanged: vi.fn(async () => {}),
  }) as unknown as Server;

const createResourceServerStub = () =>
  ({
    sendResourceUpdated: vi.fn(async () => {}),
    sendResourceListChanged: vi.fn(async () => {}),
  }) as unknown as Server;

describe("PromptBridge", () => {
  it("merges static and dynamic prompts with caching", async () => {
    const bridge = new PromptBridge({
      staticPrompts: [
        {
          name: "static-help",
          description: "Static help prompt",
          messages: [],
        },
      ],
    });

    const adapter = {
      listPrompts: vi.fn(async () => [
        {
          name: "dynamic",
          description: "Dynamic prompt",
          arguments: [],
        },
      ]),
      getPrompt: vi.fn(async () => ({ description: "dynamic", messages: [] })),
    };

    bridge.attach({ adapter, server: createPromptServerStub() });

    const first = await bridge.listPrompts();
    const second = await bridge.listPrompts();

    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);
    expect(adapter.listPrompts).toHaveBeenCalledTimes(1);
    expect(first.map((item) => item.name).sort()).toEqual(["dynamic", "static-help"]);
  });

  it("falls back to static prompts when adapter lookup fails", async () => {
    const staticEntry = {
      name: "faq",
      description: "FAQ",
      messages: [{ role: "user", content: { type: "text", text: "faq" } }],
    } as const;

    const bridge = new PromptBridge({ staticPrompts: [staticEntry] });

    const adapter = {
      listPrompts: vi.fn(async () => [] as any[]),
      getPrompt: vi.fn(async () => {
        throw new Error("adapter down");
      }),
    };

    bridge.attach({ adapter, server: createPromptServerStub() });

    const result = await bridge.getPrompt({ name: "faq" });
    expect(result.description).toBe("FAQ");
    expect(result.messages).toEqual(staticEntry.messages);
  });

  it("broadcasts prompt list change notifications to all registered servers", async () => {
    const bridge = new PromptBridge({ staticPrompts: [] });
    const serverA = createPromptServerStub();
    const serverB = createPromptServerStub();

    bridge.attach({ server: serverA });
    bridge.registerServer(serverB);

    await bridge.notifyChanged();

    expect(serverA.sendPromptListChanged).toHaveBeenCalledTimes(1);
    expect(serverB.sendPromptListChanged).toHaveBeenCalledTimes(1);
  });
});

describe("ResourceBridge", () => {
  it("resolves static and dynamic resources", async () => {
    const bridge = new ResourceBridge({
      staticResources: [
        {
          uri: "volt://static",
          text: "hello",
          mimeType: "text/plain",
        },
      ],
    });

    const adapter = {
      listResources: vi.fn(async () => [
        {
          uri: "volt://dynamic",
          name: "Dyn",
          mimeType: "application/json",
        },
      ]),
      readResource: vi.fn(async () => ({
        uri: "volt://dynamic",
        mimeType: "application/json",
        text: "{}",
      })),
    };

    bridge.attach({ adapter, server: createResourceServerStub() });

    const resources = await bridge.listResources();
    expect(resources.map((entry) => entry.uri).sort()).toEqual(["volt://dynamic", "volt://static"]);

    const staticContents = await bridge.readResource("volt://static");
    expect(staticContents).toStrictEqual({
      uri: "volt://static",
      mimeType: "text/plain",
      text: "hello",
    });

    const dynamicContents = await bridge.readResource("volt://dynamic");
    expect(dynamicContents).toEqual({
      uri: "volt://dynamic",
      mimeType: "application/json",
      text: "{}",
    });
  });

  it("honours subscriptions when sending resource updates", async () => {
    const bridge = new ResourceBridge({ staticResources: [] });
    const server = createResourceServerStub();
    bridge.attach({ server });

    await bridge.handleSubscribe("volt://foo");
    await bridge.notifyUpdated("volt://foo");
    await bridge.notifyUpdated("volt://bar");

    expect((server as any).sendResourceUpdated).toHaveBeenCalledTimes(1);
    expect((server as any).sendResourceUpdated).toHaveBeenCalledWith({ uri: "volt://foo" });
  });

  it("raises list change notifications and clears caches", async () => {
    const bridge = new ResourceBridge({ staticResources: [] });
    const server = createResourceServerStub();
    const adapter = {
      listResources: vi.fn(async () => [] as Resource[]),
    };

    bridge.attach({ adapter, server });
    await bridge.listResources();
    await bridge.notifyListChanged();
    await bridge.listResources();

    expect(adapter.listResources).toHaveBeenCalledTimes(2);
    expect((server as any).sendResourceListChanged).toHaveBeenCalledTimes(1);
  });
});
