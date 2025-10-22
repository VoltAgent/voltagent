/**
 * @deprecated The Observability SDK has been removed. Use the new Eval SDK helpers instead.
 */
export class VoltAgentObservabilitySDK {
  constructor() {
    throw new Error(
      "VoltAgentObservabilitySDK has been removed. Please migrate to the eval ingestion helpers in VoltOpsRestClient.",
    );
  }
}
