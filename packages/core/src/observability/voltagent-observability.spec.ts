import { afterEach, describe, expect, it } from "vitest";
import { VoltAgentObservability as NodeVoltAgentObservability } from "./node/volt-agent-observability";

describe("VoltAgentObservability", () => {
  let observability: VoltAgentObservability | undefined;

  afterEach(async () => {
    if (observability) {
      await observability.shutdown();
      observability = undefined;
    }
  });

  it("uses the VoltAgent instrumentation scope by default", () => {
    observability = new NodeVoltAgentObservability();
    const tracer = observability.getTracer() as any;
    expect(tracer.instrumentationScope?.name).toBe("@voltagent/core");
  });

  it("allows overriding the instrumentation scope name", () => {
    observability = new NodeVoltAgentObservability({ instrumentationScopeName: "custom-scope" });
    const tracer = observability.getTracer() as any;
    expect(tracer.instrumentationScope?.name).toBe("custom-scope");
  });
});
