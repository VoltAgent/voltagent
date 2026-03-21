import { describe, expect, it, vi } from "vitest";
import {
  type GuardrailProvider,
  type GuardrailProviderContext,
  type GuardrailProviderDecision,
  createGuardrailsFromProvider,
} from "./guardrail-provider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal stub for the `agent` property in guardrail args. */
const stubAgent = { name: "test-agent" } as any;

/** Minimal operation context stub. */
const stubOc = {
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
} as any;

function makeInputArgs(text: string) {
  return {
    input: text,
    inputText: text,
    originalInput: text,
    originalInputText: text,
    agent: stubAgent,
    context: stubOc,
    operation: "generateText",
  } as any;
}

function makeOutputArgs(text: string) {
  return {
    output: text,
    outputText: text,
    originalOutput: text,
    originalOutputText: text,
    agent: stubAgent,
    context: stubOc,
    operation: "generateText",
    usage: undefined,
    finishReason: null,
    warnings: null,
  } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createGuardrailsFromProvider", () => {
  it("returns empty arrays when provider implements neither direction", () => {
    const provider: GuardrailProvider = { name: "Empty Provider" };
    const { inputGuardrails, outputGuardrails } = createGuardrailsFromProvider(provider);
    expect(inputGuardrails).toHaveLength(0);
    expect(outputGuardrails).toHaveLength(0);
  });

  it("creates an input guardrail when evaluateInput is implemented", () => {
    const provider: GuardrailProvider = {
      name: "Input Only",
      evaluateInput: () => ({ pass: true }),
    };
    const { inputGuardrails, outputGuardrails } = createGuardrailsFromProvider(provider);
    expect(inputGuardrails).toHaveLength(1);
    expect(outputGuardrails).toHaveLength(0);
  });

  it("creates an output guardrail when evaluateOutput is implemented", () => {
    const provider: GuardrailProvider = {
      name: "Output Only",
      evaluateOutput: () => ({ pass: true }),
    };
    const { inputGuardrails, outputGuardrails } = createGuardrailsFromProvider(provider);
    expect(inputGuardrails).toHaveLength(0);
    expect(outputGuardrails).toHaveLength(1);
  });

  it("creates both guardrails when provider implements both directions", () => {
    const provider: GuardrailProvider = {
      name: "Full Provider",
      evaluateInput: () => ({ pass: true }),
      evaluateOutput: () => ({ pass: true }),
    };
    const { inputGuardrails, outputGuardrails } = createGuardrailsFromProvider(provider);
    expect(inputGuardrails).toHaveLength(1);
    expect(outputGuardrails).toHaveLength(1);
  });

  it("sets guardrail metadata from provider properties", () => {
    const provider: GuardrailProvider = {
      name: "AIP Identity",
      description: "Cryptographic agent identity verification",
      severity: "critical",
      tags: ["identity", "security"],
      evaluateInput: () => ({ pass: true }),
    };
    const { inputGuardrails } = createGuardrailsFromProvider(provider);
    const guardrail = inputGuardrails[0] as any;
    expect(guardrail.name).toBe("AIP Identity (input)");
    expect(guardrail.id).toBe("aip-identity-input");
    expect(guardrail.description).toBe("Cryptographic agent identity verification");
    expect(guardrail.severity).toBe("critical");
    expect(guardrail.tags).toEqual(["identity", "security"]);
  });

  it("allows overriding metadata via options", () => {
    const provider: GuardrailProvider = {
      name: "My Provider",
      severity: "info",
      tags: ["base"],
      evaluateInput: () => ({ pass: true }),
    };
    const { inputGuardrails } = createGuardrailsFromProvider(provider, {
      id: "custom-id",
      severity: "warning",
      tags: ["extra"],
    });
    const guardrail = inputGuardrails[0] as any;
    expect(guardrail.id).toBe("custom-id-input");
    expect(guardrail.severity).toBe("warning");
    expect(guardrail.tags).toEqual(["base", "extra"]);
  });

  describe("input guardrail handler", () => {
    it("passes content through when provider returns pass: true", async () => {
      const evaluateInput = vi.fn().mockResolvedValue({ pass: true });
      const provider: GuardrailProvider = { name: "Allow", evaluateInput };
      const { inputGuardrails } = createGuardrailsFromProvider(provider);
      const result = await inputGuardrails[0].handler(makeInputArgs("hello"));
      expect(result.pass).toBe(true);
      expect(result.action).toBe("allow");
    });

    it("passes content through when provider returns undefined", async () => {
      const evaluateInput = vi.fn().mockResolvedValue(undefined);
      const provider: GuardrailProvider = { name: "NoOp", evaluateInput };
      const { inputGuardrails } = createGuardrailsFromProvider(provider);
      const result = await inputGuardrails[0].handler(makeInputArgs("hello"));
      expect(result.pass).toBe(true);
    });

    it("blocks content when provider returns pass: false", async () => {
      const evaluateInput = vi.fn().mockResolvedValue({
        pass: false,
        message: "Identity verification failed",
      });
      const provider: GuardrailProvider = { name: "Block", evaluateInput };
      const { inputGuardrails } = createGuardrailsFromProvider(provider);
      const result = await inputGuardrails[0].handler(makeInputArgs("hello"));
      expect(result.pass).toBe(false);
      expect(result.action).toBe("block");
      expect(result.message).toBe("Identity verification failed");
    });

    it("modifies content when provider returns action: modify", async () => {
      const evaluateInput = vi.fn().mockResolvedValue({
        pass: true,
        action: "modify",
        modifiedContent: "sanitized input",
        message: "Content redacted",
      });
      const provider: GuardrailProvider = { name: "Modify", evaluateInput };
      const { inputGuardrails } = createGuardrailsFromProvider(provider);
      const result = await inputGuardrails[0].handler(makeInputArgs("sensitive data"));
      expect(result.pass).toBe(true);
      expect(result.action).toBe("modify");
      expect(result.modifiedInput).toBe("sanitized input");
      expect(result.message).toBe("Content redacted");
    });

    it("passes the correct context to the provider", async () => {
      const evaluateInput = vi.fn().mockResolvedValue({ pass: true });
      const provider: GuardrailProvider = { name: "CtxCheck", evaluateInput };
      const { inputGuardrails } = createGuardrailsFromProvider(provider);
      await inputGuardrails[0].handler(makeInputArgs("test input"));
      expect(evaluateInput).toHaveBeenCalledWith("test input", {
        agentName: "test-agent",
        operation: "generateText",
        direction: "input",
      });
    });

    it("preserves metadata from provider decision", async () => {
      const evaluateInput = vi.fn().mockResolvedValue({
        pass: true,
        metadata: { trustScore: 0.95, did: "did:aip:abc123" },
      });
      const provider: GuardrailProvider = { name: "Meta", evaluateInput };
      const { inputGuardrails } = createGuardrailsFromProvider(provider);
      const result = await inputGuardrails[0].handler(makeInputArgs("hello"));
      expect(result.metadata).toEqual({ trustScore: 0.95, did: "did:aip:abc123" });
    });

    it("works with synchronous evaluateInput", async () => {
      const provider: GuardrailProvider = {
        name: "Sync",
        evaluateInput: () => ({ pass: true, message: "sync ok" }),
      };
      const { inputGuardrails } = createGuardrailsFromProvider(provider);
      const result = await inputGuardrails[0].handler(makeInputArgs("hello"));
      expect(result.pass).toBe(true);
      expect(result.message).toBe("sync ok");
    });
  });

  describe("output guardrail handler", () => {
    it("passes output through when provider returns pass: true", async () => {
      const evaluateOutput = vi.fn().mockResolvedValue({ pass: true });
      const provider: GuardrailProvider = { name: "AllowOut", evaluateOutput };
      const { outputGuardrails } = createGuardrailsFromProvider(provider);
      const result = await outputGuardrails[0].handler(makeOutputArgs("model response"));
      expect(result.pass).toBe(true);
      expect(result.action).toBe("allow");
    });

    it("blocks output when provider returns pass: false", async () => {
      const evaluateOutput = vi.fn().mockResolvedValue({
        pass: false,
        message: "Output contains PII",
      });
      const provider: GuardrailProvider = { name: "BlockOut", evaluateOutput };
      const { outputGuardrails } = createGuardrailsFromProvider(provider);
      const result = await outputGuardrails[0].handler(makeOutputArgs("name: John Doe"));
      expect(result.pass).toBe(false);
      expect(result.action).toBe("block");
      expect(result.message).toBe("Output contains PII");
    });

    it("modifies output when provider returns action: modify", async () => {
      const evaluateOutput = vi.fn().mockResolvedValue({
        pass: true,
        action: "modify",
        modifiedContent: "[redacted]",
      });
      const provider: GuardrailProvider = { name: "RedactOut", evaluateOutput };
      const { outputGuardrails } = createGuardrailsFromProvider(provider);
      const result = await outputGuardrails[0].handler(makeOutputArgs("secret data"));
      expect(result.pass).toBe(true);
      expect(result.action).toBe("modify");
      expect(result.modifiedOutput).toBe("[redacted]");
    });

    it("passes the correct context to the provider", async () => {
      const evaluateOutput = vi.fn().mockResolvedValue({ pass: true });
      const provider: GuardrailProvider = { name: "OutCtx", evaluateOutput };
      const { outputGuardrails } = createGuardrailsFromProvider(provider);
      await outputGuardrails[0].handler(makeOutputArgs("response text"));
      expect(evaluateOutput).toHaveBeenCalledWith("response text", {
        agentName: "test-agent",
        operation: "generateText",
        direction: "output",
      });
    });

    it("handles empty outputText gracefully", async () => {
      const evaluateOutput = vi.fn().mockResolvedValue({ pass: true });
      const provider: GuardrailProvider = { name: "EmptyOut", evaluateOutput };
      const { outputGuardrails } = createGuardrailsFromProvider(provider);
      const args = makeOutputArgs("");
      args.outputText = undefined;
      await outputGuardrails[0].handler(args);
      expect(evaluateOutput).toHaveBeenCalledWith("", expect.any(Object));
    });
  });

  describe("malformed modify decisions (fail-closed)", () => {
    it("blocks input when action is modify but modifiedContent is missing", async () => {
      const evaluateInput = vi.fn().mockResolvedValue({
        pass: true,
        action: "modify",
        // no modifiedContent
        message: "tried to modify",
      });
      const provider: GuardrailProvider = { name: "BadModify", evaluateInput };
      const { inputGuardrails } = createGuardrailsFromProvider(provider);
      const result = await inputGuardrails[0].handler(makeInputArgs("hello"));
      expect(result.pass).toBe(false);
      expect(result.action).toBe("block");
      expect(result.message).toBe("tried to modify");
    });

    it("blocks output when action is modify but modifiedContent is missing", async () => {
      const evaluateOutput = vi.fn().mockResolvedValue({
        pass: true,
        action: "modify",
        // no modifiedContent
      });
      const provider: GuardrailProvider = { name: "BadModifyOut", evaluateOutput };
      const { outputGuardrails } = createGuardrailsFromProvider(provider);
      const result = await outputGuardrails[0].handler(makeOutputArgs("response"));
      expect(result.pass).toBe(false);
      expect(result.action).toBe("block");
    });

    it("provides a default message when modify lacks both modifiedContent and message", async () => {
      const evaluateInput = vi.fn().mockResolvedValue({
        pass: true,
        action: "modify",
      });
      const provider: GuardrailProvider = { name: "NoMsg", evaluateInput };
      const { inputGuardrails } = createGuardrailsFromProvider(provider);
      const result = await inputGuardrails[0].handler(makeInputArgs("hello"));
      expect(result.pass).toBe(false);
      expect(result.message).toContain("NoMsg");
      expect(result.message).toContain("modify");
    });
  });

  describe("collision-safe IDs", () => {
    it("generates a fallback ID when provider name produces an empty slug", () => {
      const provider: GuardrailProvider = {
        name: "---",
        evaluateInput: () => ({ pass: true }),
      };
      const { inputGuardrails } = createGuardrailsFromProvider(provider);
      const guardrail = inputGuardrails[0] as any;
      expect(guardrail.id).toBeTruthy();
      expect(guardrail.id).not.toBe("-input");
    });

    it("uses explicit id option over generated slug", () => {
      const provider: GuardrailProvider = {
        name: "Some Provider",
        evaluateInput: () => ({ pass: true }),
      };
      const { inputGuardrails } = createGuardrailsFromProvider(provider, { id: "explicit" });
      const guardrail = inputGuardrails[0] as any;
      expect(guardrail.id).toBe("explicit-input");
    });
  });

  describe("multiple providers", () => {
    it("can combine guardrails from multiple providers", () => {
      const providerA: GuardrailProvider = {
        name: "Provider A",
        evaluateInput: () => ({ pass: true }),
      };
      const providerB: GuardrailProvider = {
        name: "Provider B",
        evaluateInput: () => ({ pass: true }),
        evaluateOutput: () => ({ pass: true }),
      };

      const a = createGuardrailsFromProvider(providerA);
      const b = createGuardrailsFromProvider(providerB);

      const combined = {
        inputGuardrails: [...a.inputGuardrails, ...b.inputGuardrails],
        outputGuardrails: [...a.outputGuardrails, ...b.outputGuardrails],
      };

      expect(combined.inputGuardrails).toHaveLength(2);
      expect(combined.outputGuardrails).toHaveLength(1);
    });
  });
});
