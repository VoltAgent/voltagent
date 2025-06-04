import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { type ExportResult, ExportResultCode } from "@opentelemetry/core";
import { VoltAgentObservabilitySDK } from "@voltagent/sdk";
import type { Usage } from "@voltagent/core";

/**
 * Configuration options for VoltAgentExporter
 */
export interface VoltAgentExporterOptions {
  // VoltAgent SaaS backend
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;

  // SDK options
  autoFlush?: boolean;
  flushInterval?: number;
  debug?: boolean;
}

/**
 * Span data structure for processing
 */
interface SpanData {
  startTime: string;
  endTime?: string;
  spanId: string;
  input: unknown;
  output: unknown;
  metadata: Record<string, unknown>;
}

/**
 * Trace metadata structure
 */
interface TraceMetadata {
  agentId?: string;
  userId?: string;
  conversationId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Agent information structure for multi-agent tracking
 */
interface AgentInfo {
  agentId: string;
  parentAgentId?: string;
  displayName?: string;
  startTime: string;
  spans: ReadableSpan[];
}

/**
 * VoltAgent OpenTelemetry Exporter for Vercel AI SDK
 *
 * This exporter converts OpenTelemetry spans from Vercel AI SDK into VoltAgent timeline events.
 * It follows the same pattern as LangfuseExporter but targets VoltAgent backend.
 *
 * Enhanced Multi-Agent Support:
 * - Each agent gets its own history entry
 * - Parent-child relationships are maintained
 * - Events are written to both agent's own history and parent's history
 */
export class VoltAgentExporter implements SpanExporter {
  private readonly sdk: VoltAgentObservabilitySDK;
  private readonly debug: boolean;

  // 🔧 Constants
  private static readonly DEFAULT_AGENT_ID = "ai-assistant";
  private static readonly ERROR_STATUS_CODE = 2;

  // 🔧 Debug message constants
  private static readonly DEBUG_MESSAGES = {
    TOOL_SPAN_DEBUG: "=== TOOL SPAN DEBUG ===",
    PARENT_SPAN_DEBUG: "=== PARENT SPAN DEBUG ===",
    AGENT_ID_FOUND: "✅ Found agentId from parent span:",
    USING_DEFAULT_AGENT: "Using default agent for tracking",
    TOOL_TRACKED_DEFAULT: "Tool execution tracked under default agent",
    FOUND_ON_RETRY: "✅ Found agentId on retry:",
    MULTI_AGENT_SCENARIO: "🔄 Multi-agent scenario detected",
    NO_PARENT_SPAN: "No parent span ID found",
  } as const;

  // Track active histories by agentId_traceId (each agent gets own history)
  private activeHistories = new Map<string, string>(); // agentHistoryKey -> UUID historyId mapping

  // Track parent-child relationships for event propagation
  private parentChildMap = new Map<string, string>(); // childAgentId -> parentAgentId

  // Track agents within each trace for multi-agent support
  private traceAgents = new Map<string, Map<string, AgentInfo>>();

  // Track history ID mappings for parent-child relationships
  private historyIdMap = new Map<string, string>(); // agentId_traceId -> UUID historyId

  // 🔗 Global agent tracking across all traces for parent-child relationships
  private globalAgentHistories = new Map<string, string>(); // agentId -> latest historyId (cross-trace)
  private globalParentChildMap = new Map<string, string>(); // childAgentId -> parentAgentId (cross-trace)

  // 🎯 Cache for tool span agentIds to avoid repeated lookups
  private toolSpanAgentCache = new Map<string, string>(); // spanId -> agentId

  // 🕐 Deferred span mechanism for tool spans that can't find agentId immediately
  private deferredSpans = new Map<
    string,
    {
      span: ReadableSpan;
      traceId: string;
      traceMetadata: TraceMetadata;
      agentInfo?: AgentInfo;
      isRootSpan: boolean;
    }
  >(); // spanId -> deferred span data

  // Track which traces have already shown the default agent guidance
  private traceGuidanceShown = new Set<string>();

  // 🔄 Store trace objects for proper cleanup using trace.end()
  private activeTraces = new Map<string, any>(); // agentHistoryKey -> trace object

  constructor(options: VoltAgentExporterOptions) {
    this.debug = options.debug ?? false;

    // Initialize VoltAgent SDK
    this.sdk = new VoltAgentObservabilitySDK({
      publicKey: options.publicKey ?? "",
      secretKey: options.secretKey ?? "",
      baseUrl: options.baseUrl ?? "https://api.voltagent.dev",
      autoFlush: options.autoFlush ?? true,
      flushInterval: options.flushInterval ?? 5000,
    });

    if (this.debug) {
      this.logDebug("VoltAgentExporter initialized with options:", options);
    }
  }

  export(allSpans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    this.logDebug(`Exporting ${allSpans.length} spans...`);

    // Process asynchronously but don't await in the export method
    this.processSpansAsync(allSpans, resultCallback);
  }

  private async processSpansAsync(
    allSpans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): Promise<void> {
    try {
      // Group spans by trace ID
      const traceSpanMap = new Map<string, ReadableSpan[]>();

      for (const span of allSpans) {
        if (!this.isVercelAiSpan(span)) {
          this.logDebug("Ignoring non-Vercel AI span", span.name);
          continue;
        }

        const traceId = span.spanContext().traceId;
        traceSpanMap.set(traceId, (traceSpanMap.get(traceId) ?? []).concat(span));
      }

      // Process each trace
      for (const [traceId, spans] of traceSpanMap) {
        await this.processTraceSpans(traceId, spans);
      }

      this.logDebug(`Processed ${traceSpanMap.size} traces.`);

      // Force flush after processing all spans (like Langfuse does)
      await this.sdk.flush();

      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (err) {
      this.logDebug("Error exporting spans:", err);
      resultCallback({
        code: ExportResultCode.FAILED,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  private async processTraceSpans(traceId: string, spans: ReadableSpan[]): Promise<void> {
    // Extract trace metadata once for the entire trace
    const traceMetadata = this.extractTraceMetadata(spans);

    // Discover and organize agents within this trace
    const agentsInTrace = this.discoverAgentsInTrace(spans);
    this.traceAgents.set(traceId, agentsInTrace);

    // Build parent-child relationship map for this trace
    this.buildParentChildMap(agentsInTrace);

    // Create histories for each agent in the trace
    await this.createAgentHistories(traceId, agentsInTrace, traceMetadata, spans);

    // Process each span as VoltAgent events
    for (const span of spans) {
      const allSpansInTrace = this.getAllSpansForTrace(traceId);
      const agentId = this.extractAgentIdFromSpan(
        span,
        allSpansInTrace.length > 0 ? allSpansInTrace : [span],
      );
      const agentInfo = agentsInTrace.get(agentId);
      const isRootSpan = this.findRootSpan(spans) === span;

      await this.processSpanAsVoltAgentEvents(traceId, span, traceMetadata, agentInfo, isRootSpan);
    }

    // 🕐 Process any deferred spans that might now have their parent spans available
    await this.processDeferredSpans(traceId, spans, traceMetadata, agentsInTrace);

    // Check if this trace is complete and update histories accordingly
    if (this.isTraceComplete(spans)) {
      await this.completeAgentHistories(traceId, agentsInTrace, spans);
    }

    // Clean up trace agents after processing
    this.traceAgents.delete(traceId);
  }

  /**
   * Build parent-child relationship map for event propagation
   * Both trace-specific and cross-trace relationships
   */
  private buildParentChildMap(agentsInTrace: Map<string, AgentInfo>): void {
    for (const [agentId, agentInfo] of agentsInTrace) {
      if (agentInfo.parentAgentId) {
        // Store trace-specific relationship
        this.parentChildMap.set(agentId, agentInfo.parentAgentId);

        // 🔗 Store cross-trace relationship for multi-trace scenarios
        this.globalParentChildMap.set(agentId, agentInfo.parentAgentId);

        this.logDebug(`Parent-child relationship: ${agentId} -> ${agentInfo.parentAgentId}`);
      }
    }
  }

  /**
   * Create separate history for each agent in the trace
   * Process agents in dependency order: parents first, then children
   */
  private async createAgentHistories(
    traceId: string,
    agentsInTrace: Map<string, AgentInfo>,
    traceMetadata: TraceMetadata,
    spans: ReadableSpan[],
  ): Promise<void> {
    const rootSpan = this.findRootSpan(spans);

    // Sort agents by dependency: parents first, then children
    const sortedAgents = this.sortAgentsByDependency(agentsInTrace);

    for (const [agentId, agentInfo] of sortedAgents) {
      const agentHistoryKey = this.getAgentHistoryKey(agentId, traceId);

      // Skip if history already exists for this agent
      if (this.activeHistories.has(agentHistoryKey)) {
        this.logDebug(`Using existing history for agent: ${agentId}`);
        continue;
      }

      // Find agent's first span for input parsing
      const agentFirstSpan =
        agentInfo.spans.sort((a, b) => {
          const aTime = a.startTime[0] * 1e9 + a.startTime[1];
          const bTime = b.startTime[0] * 1e9 + b.startTime[1];
          return aTime - bTime;
        })[0] || rootSpan;

      // Parse model parameters and completion start time
      const modelParameters = agentFirstSpan
        ? this.parseModelParameters(agentFirstSpan.attributes)
        : {};
      const completionStartTime = agentFirstSpan
        ? this.parseCompletionStartTime(
            agentFirstSpan,
            this.hrTimeToISOString(agentFirstSpan.startTime),
          )
        : undefined;

      // Combine trace metadata with model parameters and timing
      const combinedMetadata = {
        ...traceMetadata.metadata,
        modelParameters,
        ...(completionStartTime && { completionStartTime }),
        // Add parent information for child agents
        ...(agentInfo.parentAgentId && {
          agentId: agentInfo.parentAgentId,
          parentHistoryId: this.getParentHistoryId(agentInfo.parentAgentId, traceId),
        }),
      };

      // Create unique history ID for this agent
      const agentHistoryId = this.generateUUID();

      // Create new history for this agent
      const trace = await this.sdk.trace({
        id: agentHistoryId,
        agentId: agentId,
        input: this.parseSpanInput(agentFirstSpan),
        metadata: combinedMetadata,
        userId: traceMetadata.userId,
        conversationId: traceMetadata.conversationId,
        completionStartTime: completionStartTime,
        tags: traceMetadata.tags && traceMetadata.tags.length > 0 ? traceMetadata.tags : undefined,
        startTime: agentFirstSpan
          ? this.hrTimeToISOString(agentFirstSpan.startTime)
          : new Date().toISOString(),
        version: "1.0.0",
      });

      this.activeHistories.set(agentHistoryKey, agentHistoryId);
      this.historyIdMap.set(agentHistoryKey, agentHistoryId);

      // 🔄 Store the trace object for later use with trace.end()
      this.activeTraces.set(agentHistoryKey, trace);

      // 🔗 Store in global map for cross-trace access
      this.globalAgentHistories.set(agentId, agentHistoryId);

      this.logDebug(
        `Created new history ${agentHistoryId} for agent ${agentId} (parent: ${agentInfo.parentAgentId || "none"})`,
      );
    }
  }

  /**
   * Sort agents by dependency order: parents first, then children
   */
  private sortAgentsByDependency(
    agentsInTrace: Map<string, AgentInfo>,
  ): Array<[string, AgentInfo]> {
    const result: [string, AgentInfo][] = [];
    const processed = new Set<string>();
    const visiting = new Set<string>(); // Track agents currently being processed to detect cycles
    const agentsArray = Array.from(agentsInTrace.entries());

    const addAgentWithDependencies = (agentId: string, agentInfo: AgentInfo): void => {
      // Skip if already processed
      if (processed.has(agentId)) {
        return;
      }

      // 🔄 CIRCULAR REFERENCE DETECTION: Check if we're already visiting this agent
      if (visiting.has(agentId)) {
        this.logDebug(
          `Circular dependency detected: ${agentId}, skipping to prevent infinite loop`,
        );
        return;
      }

      // Mark as currently visiting
      visiting.add(agentId);

      // If this agent has a parent, add parent first
      if (agentInfo.parentAgentId) {
        const parentEntry = agentsArray.find(([id]) => id === agentInfo.parentAgentId);
        if (parentEntry && !processed.has(agentInfo.parentAgentId)) {
          addAgentWithDependencies(parentEntry[0], parentEntry[1]);
        }
      }

      // Now add this agent
      if (!processed.has(agentId)) {
        result.push([agentId, agentInfo]);
        processed.add(agentId);
      }

      // Remove from visiting set when done
      visiting.delete(agentId);
    };

    // Process all agents, starting with root agents
    const rootAgents = agentsArray.filter(([, agentInfo]) => !agentInfo.parentAgentId);
    const childAgents = agentsArray.filter(([, agentInfo]) => agentInfo.parentAgentId);

    // First add all root agents
    for (const [agentId, agentInfo] of rootAgents) {
      addAgentWithDependencies(agentId, agentInfo);
    }

    // Then add remaining child agents (in case some parents weren't found)
    for (const [agentId, agentInfo] of childAgents) {
      addAgentWithDependencies(agentId, agentInfo);
    }

    this.logDebug(
      "Sorted agents by dependency:",
      result.map(
        ([id, info]) =>
          `${id}${info.parentAgentId ? ` (parent: ${info.parentAgentId})` : " (root)"}`,
      ),
    );

    return result;
  }

  /**
   * Get parent history ID if parent agent exists
   * Checks both trace-specific and cross-trace relationships
   */
  private getParentHistoryId(parentAgentId: string, traceId: string): string | undefined {
    // First try to find parent in the same trace
    const parentHistoryKey = this.getAgentHistoryKey(parentAgentId, traceId);
    let parentHistoryId = this.historyIdMap.get(parentHistoryKey);

    if (parentHistoryId) {
      this.logDebug(`Found parent ${parentAgentId} history in same trace: ${parentHistoryId}`);
      return parentHistoryId;
    }

    // 🔗 If not found in same trace, check global histories (cross-trace)
    parentHistoryId = this.globalAgentHistories.get(parentAgentId);
    if (parentHistoryId) {
      this.logDebug(
        `Found parent ${parentAgentId} history in global map (cross-trace): ${parentHistoryId}`,
      );
      return parentHistoryId;
    }

    this.logDebug(`Parent ${parentAgentId} history not found in trace ${traceId} or globally`);
    return undefined;
  }

  /**
   * Complete all agent histories when trace is done
   */
  private async completeAgentHistories(
    traceId: string,
    agentsInTrace: Map<string, AgentInfo>,
    _spans: ReadableSpan[],
  ): Promise<void> {
    for (const [agentId, agentInfo] of agentsInTrace) {
      const agentHistoryKey = this.getAgentHistoryKey(agentId, traceId);
      const trace = this.activeTraces.get(agentHistoryKey);

      if (!trace) {
        this.logDebug(`No trace object found for agent ${agentId} in trace ${traceId}`);
        continue;
      }

      // Find agent's last span for output parsing
      const agentLastSpan = agentInfo.spans
        .filter((span) => span.endTime)
        .sort((a, b) => {
          if (!a.endTime || !b.endTime) return 0;
          const aTime = a.endTime[0] * 1e9 + a.endTime[1];
          const bTime = b.endTime[0] * 1e9 + b.endTime[1];
          return bTime - aTime;
        })[0];

      if (agentLastSpan?.endTime) {
        const finalOutput = this.parseSpanOutput(agentLastSpan);
        const finalUsage = this.parseUsage(agentLastSpan.attributes);
        const endTime = this.hrTimeToISOString(agentLastSpan.endTime);

        // Complete the history using trace.end() instead of sdk.endHistory()
        await trace.end({
          output: finalOutput,
          usage: finalUsage
            ? {
                promptTokens: finalUsage.promptTokens || 0,
                completionTokens: finalUsage.completionTokens || 0,
                totalTokens:
                  finalUsage.totalTokens ||
                  (finalUsage.promptTokens || 0) + (finalUsage.completionTokens || 0),
              }
            : undefined,
          endTime: endTime,
          status: "completed",
        });

        this.logDebug(`Agent ${agentId} trace completed using trace.end()`);
      }
    }
  }

  /**
   * Get agent history key for tracking
   */
  private getAgentHistoryKey(agentId: string, traceId: string): string {
    return `${agentId}_${traceId}`;
  }

  /**
   * Get agent history ID (UUID)
   */
  private getAgentHistoryId(agentId: string, traceId: string): string {
    const historyKey = this.getAgentHistoryKey(agentId, traceId);
    const historyId = this.activeHistories.get(historyKey) || this.historyIdMap.get(historyKey);
    if (!historyId) {
      throw new Error(`No history ID found for agent ${agentId} in trace ${traceId}`);
    }
    return historyId;
  }

  /**
   * Add event to agent's history and propagate to parent if needed
   * Uses both trace-specific and cross-trace parent relationships
   * Now supports RECURSIVE propagation up the entire hierarchy
   */
  private async addEventToTrace(agentId: string, traceId: string, event: any): Promise<void> {
    const agentHistoryId = this.getAgentHistoryId(agentId, traceId);

    // Add event to agent's own history
    await this.sdk.addEventToTrace(agentHistoryId, event);
    this.logDebug(`Added event ${event.name} to agent ${agentId} history ${agentHistoryId}`);

    // 🔄 RECURSIVE PROPAGATION: Propagate to ALL ancestors up the hierarchy
    await this.propagateEventToAncestors(agentId, traceId, event, agentId, 0, new Set([agentId]));
  }

  /**
   * Recursively propagate events up the entire agent hierarchy
   * This ensures that deeply nested agents' events appear in all ancestor histories
   */
  private async propagateEventToAncestors(
    agentId: string,
    traceId: string,
    event: any,
    originalAgentId: string,
    depth: number,
    visitedAgents: Set<string> = new Set(),
  ): Promise<void> {
    // Prevent infinite recursion (safety check)
    if (depth > 10) {
      this.logDebug(`Max propagation depth reached for agent ${agentId}`);
      return;
    }

    // Find parent of current agent
    let parentAgentId = this.parentChildMap.get(agentId);
    if (!parentAgentId) {
      // 🔗 Check global parent-child map if not found in trace-specific map
      parentAgentId = this.globalParentChildMap.get(agentId);
    }

    if (!parentAgentId) {
      // No parent found, stop propagation
      return;
    }

    // 🔄 CIRCULAR REFERENCE PROTECTION: Check if we've already visited this agent
    if (visitedAgents.has(parentAgentId)) {
      this.logDebug(
        `Circular reference detected: ${agentId} → ${parentAgentId}, stopping propagation`,
      );
      return;
    }

    try {
      // Try to get parent history ID from same trace first, then globally
      let parentHistoryId: string | undefined;

      try {
        parentHistoryId = this.getAgentHistoryId(parentAgentId, traceId);
      } catch {
        // If parent not found in same trace, use global lookup
        parentHistoryId = this.globalAgentHistories.get(parentAgentId);
      }

      if (parentHistoryId) {
        // Modify event metadata to indicate it's from a descendant agent
        // Preserve the original agentId so the event is attributed correctly
        const propagatedEvent = {
          ...event,
          metadata: {
            ...event.metadata,
            fromChildAgent: agentId, // Immediate child
            originalAgentId: originalAgentId, // Ultimate originator
            propagationDepth: depth + 1, // Track how deep this propagation is
            propagationPath: this.buildPropagationPath(originalAgentId, parentAgentId),
          },
        };

        await this.sdk.addEventToTrace(parentHistoryId, propagatedEvent);
        this.logDebug(
          `Propagated event ${event.name} from ${originalAgentId} to ancestor ${parentAgentId} (depth: ${depth + 1}, immediate child: ${agentId}, cross-trace: ${!this.parentChildMap.has(agentId)})`,
        );

        // 🔄 RECURSIVE CALL: Continue propagating to parent's parent
        const newVisitedAgents = new Set(visitedAgents);
        newVisitedAgents.add(parentAgentId);

        await this.propagateEventToAncestors(
          parentAgentId,
          traceId,
          event,
          originalAgentId,
          depth + 1,
          newVisitedAgents,
        );
      } else {
        this.logDebug(
          `Parent ${parentAgentId} history not found for event propagation (depth: ${depth + 1})`,
        );
      }
    } catch (error) {
      this.logDebug(
        `Failed to propagate event to ancestor ${parentAgentId} (depth: ${depth + 1}):`,
        error,
      );
    }
  }

  /**
   * Build a human-readable propagation path for debugging
   */
  private buildPropagationPath(originalAgentId: string, currentParentId: string): string {
    return `${originalAgentId} → ... → ${currentParentId}`;
  }

  /**
   * Get all spans for a specific trace ID
   * This helps with finding parent spans when processing deferred tool spans
   */
  private getAllSpansForTrace(traceId: string): ReadableSpan[] {
    const agentsInTrace = this.traceAgents.get(traceId);
    if (!agentsInTrace) {
      return [];
    }

    const allSpans: ReadableSpan[] = [];
    for (const agentInfo of agentsInTrace.values()) {
      allSpans.push(...agentInfo.spans);
    }
    return allSpans;
  }

  private async processSpanAsVoltAgentEvents(
    traceId: string,
    span: ReadableSpan,
    traceMetadata: TraceMetadata,
    agentInfo?: AgentInfo,
    isRootSpan = false,
  ): Promise<void> {
    const spanType = this.getSpanType(span);
    const startTime = this.hrTimeToISOString(span.startTime);
    const endTime = span.endTime ? this.hrTimeToISOString(span.endTime) : undefined;
    const spanId = span.spanContext().spanId;
    const input = this.parseSpanInput(span);
    const output = this.parseSpanOutput(span);
    const metadata = this.parseSpanMetadata(span);

    // Get agent ID for this span
    const allSpansInTrace = this.getAllSpansForTrace(traceId);
    const agentId = this.extractAgentIdFromSpan(
      span,
      allSpansInTrace.length > 0 ? allSpansInTrace : [span],
    );

    switch (spanType) {
      case "generation":
        // Create agent events for each agent's generation spans
        await this.processGenerationSpan(
          traceId,
          agentId,
          span,
          {
            startTime,
            endTime,
            spanId,
            input,
            output,
            metadata,
          },
          traceMetadata,
          agentInfo,
          isRootSpan,
        );
        break;

      case "tool":
        // 🕐 Check if we can find agentId for this tool span
        if (agentId === VoltAgentExporter.DEFAULT_AGENT_ID) {
          // This is the default fallback, means we couldn't find a proper agentId
          this.showDefaultAgentGuidance(traceId);
          await this.processToolSpan(
            traceId,
            agentId,
            span,
            {
              startTime,
              endTime,
              spanId,
              input,
              output,
              metadata,
            },
            traceMetadata,
            agentInfo,
          );
        } else {
          // We found a proper agentId, process normally
          this.logDebug(
            `${VoltAgentExporter.DEBUG_MESSAGES.TOOL_TRACKED_DEFAULT} ${span.name} found agentId: ${agentId}`,
          );
          await this.processToolSpan(
            traceId,
            agentId,
            span,
            {
              startTime,
              endTime,
              spanId,
              input,
              output,
              metadata,
            },
            traceMetadata,
            agentInfo,
          );
        }
        break;

      default:
        this.logDebug(`Unknown span type for span: ${span.name}`);
    }
  }

  private async processGenerationSpan(
    traceId: string,
    agentId: string,
    span: ReadableSpan,
    data: SpanData,
    _traceMetadata: TraceMetadata,
    agentInfo?: AgentInfo,
    _isRootSpan = false,
  ): Promise<void> {
    const displayName = agentInfo?.displayName ?? (data.metadata.displayName as string) ?? agentId;
    const usage = this.parseUsage(span.attributes);
    const modelParameters = this.parseModelParameters(span.attributes);
    const completionStartTime = this.parseCompletionStartTime(span, data.startTime);

    // For multi-agent scenarios, create agent:start event for each new agent
    // Check if this is the first generation span for this agent
    if (agentInfo && this.isFirstGenerationSpanForAgent(span, agentInfo)) {
      const agentStartEvent = {
        name: "agent:start" as const,
        type: "agent" as const,
        startTime: agentInfo.startTime,
        status: "running" as const,
        input: {
          input: data.input as any[],
        },
        metadata: {
          displayName,
          id: agentId,
          ...(agentInfo.parentAgentId && { agentId: agentInfo.parentAgentId }),
          instructions: data.metadata.instructions as string,
          usage,
          modelParameters,
          completionStartTime,
        },
      };

      await this.addEventToTrace(agentId, traceId, agentStartEvent);
      this.logDebug(`Added agent:start event for agent: ${agentId}`);
    }

    // Agent completion event (if span is finished)
    if (data.endTime) {
      const hasError = span.status?.code === VoltAgentExporter.ERROR_STATUS_CODE; // ERROR

      if (hasError) {
        const errorEvent = {
          name: "agent:error" as const,
          type: "agent" as const,
          startTime: data.startTime,
          endTime: data.endTime,
          status: "error" as const,
          level: "ERROR" as const,
          metadata: {
            displayName,
            id: agentId,
            ...(agentInfo?.parentAgentId && {
              agentId: agentInfo.parentAgentId,
            }),
            usage,
            modelParameters,
            completionStartTime,
          },
          error: {
            message: span.status?.message || "Unknown error",
          },
        };

        await this.addEventToTrace(agentId, traceId, errorEvent);
      } else {
        // Only add success event if this is the last generation span for this agent
        if (agentInfo && this.isLastGenerationSpanForAgent(span, agentInfo)) {
          const successEvent = {
            name: "agent:success" as const,
            type: "agent" as const,
            startTime: data.endTime,
            endTime: data.endTime,
            status: "completed" as const,
            output: data.output as Record<string, unknown> | null,
            metadata: {
              displayName,
              id: agentId,
              ...(agentInfo?.parentAgentId && {
                agentId: agentInfo.parentAgentId,
              }),
              usage,
              modelParameters,
              completionStartTime,
            },
          };

          await this.addEventToTrace(agentId, traceId, successEvent);
          this.logDebug(`Added agent:success event for agent: ${agentId}`);
        }
      }
    }
  }

  private async processToolSpan(
    traceId: string,
    agentId: string,
    span: ReadableSpan,
    data: SpanData,
    _traceMetadata: TraceMetadata,
    _agentInfo?: AgentInfo,
  ): Promise<void> {
    const toolName = (data.metadata.toolName as string) ?? span.name;

    this.logDebug(
      `Processing tool span: ${toolName}, agentId: ${agentId}, span agentId: ${span.attributes["ai.telemetry.metadata.agentId"] ?? "not found"}`,
    );

    // Tool start event
    const startEvent = {
      name: "tool:start" as const,
      type: "tool" as const,
      startTime: data.startTime,
      status: "running" as const,
      input: data.input as Record<string, unknown> | null,
      metadata: {
        displayName: toolName,
        id: toolName,
        agentId: agentId,
      },
    };

    await this.addEventToTrace(agentId, traceId, startEvent);

    // Tool completion event (if span is finished)
    if (data.endTime) {
      const hasError = span.status?.code === VoltAgentExporter.ERROR_STATUS_CODE; // ERROR

      if (hasError) {
        const errorEvent = {
          name: "tool:error" as const,
          type: "tool" as const,
          startTime: data.startTime,
          endTime: data.endTime,
          status: "error" as const,
          level: "ERROR" as const,
          metadata: {
            displayName: toolName,
            id: toolName,
            agentId: agentId,
          },
          error: {
            message: span.status?.message || "Tool execution failed",
          },
        };

        await this.addEventToTrace(agentId, traceId, errorEvent);
      } else {
        const successEvent = {
          name: "tool:success" as const,
          type: "tool" as const,
          startTime: data.endTime,
          endTime: data.endTime,
          status: "completed" as const,
          output: data.output as Record<string, unknown> | null,
          metadata: {
            displayName: toolName,
            id: toolName,
            agentId: agentId,
          },
        };

        await this.addEventToTrace(agentId, traceId, successEvent);
      }
    }
  }

  // Utility methods
  private isVercelAiSpan(span: ReadableSpan): boolean {
    // Check if this is a Vercel AI SDK span
    const instrumentationScopeName =
      (span as any).instrumentationLibrary?.name ?? (span as any).instrumentationScope?.name;
    return instrumentationScopeName === "ai";
  }

  private findRootSpan(spans: ReadableSpan[]): ReadableSpan | undefined {
    // Find the span with no parent (root span)
    const spanIds = new Set(spans.map((span) => span.spanContext().spanId));

    for (const span of spans) {
      const parentSpanId = this.getParentSpanId(span);
      if (!parentSpanId || !spanIds.has(parentSpanId)) {
        return span;
      }
    }

    return spans[0]; // Fallback to first span
  }

  private getSpanType(span: ReadableSpan): "generation" | "tool" | "unknown" {
    const spanName = span.name.toLowerCase();

    if (
      spanName.includes("generate") ||
      spanName.includes("stream") ||
      spanName.includes("generateobject") ||
      spanName.includes("streamobject")
    ) {
      return "generation";
    }

    if (spanName.includes("tool") || span.attributes["ai.toolCall.name"]) {
      return "tool";
    }

    return "unknown";
  }

  private extractTraceMetadata(spans: ReadableSpan[]): {
    agentId?: string;
    userId?: string;
    conversationId?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  } {
    const metadata: Record<string, unknown> = {};
    let agentId: string | undefined;
    let userId: string | undefined;
    let conversationId: string | undefined;

    for (const span of spans) {
      const attrs = span.attributes;

      // Extract standard metadata
      if (attrs["ai.telemetry.metadata.agentId"]) {
        agentId = String(attrs["ai.telemetry.metadata.agentId"]);
      }
      if (attrs["ai.telemetry.metadata.userId"]) {
        userId = String(attrs["ai.telemetry.metadata.userId"]);
      }
      if (attrs["ai.telemetry.metadata.conversationId"]) {
        conversationId = String(attrs["ai.telemetry.metadata.conversationId"]);
      }

      // Extract custom metadata with prefix
      for (const [key, value] of Object.entries(attrs)) {
        if (key.startsWith("ai.telemetry.metadata.") && value != null) {
          const cleanKey = key.substring("ai.telemetry.metadata.".length);
          metadata[cleanKey] = value;
        }
      }
    }

    // Parse tags from spans
    const tags = this.parseTagsTraceAttribute(spans);

    return { agentId, userId, conversationId, tags, metadata };
  }

  private parseTagsTraceAttribute(spans: ReadableSpan[]): string[] {
    return [
      ...new Set(
        spans
          .map((span) => this.parseSpanMetadata(span).tags)
          .filter((tags) => Array.isArray(tags) && tags.every((tag) => typeof tag === "string"))
          .reduce((acc, tags) => acc.concat(tags as string[]), []),
      ),
    ];
  }

  private parseSpanInput(span: ReadableSpan | undefined): any {
    if (!span) return undefined;

    const attrs = span.attributes;

    // Try to parse input from various attributes
    if (attrs["ai.prompt.messages"]) {
      return this.safeJsonParse(String(attrs["ai.prompt.messages"]));
    }
    if (attrs["ai.prompt"]) {
      return attrs["ai.prompt"];
    }
    if (attrs["ai.toolCall.args"]) {
      return this.safeJsonParse(String(attrs["ai.toolCall.args"]));
    }

    return undefined;
  }

  private parseSpanOutput(span: ReadableSpan | undefined): any {
    if (!span) return undefined;

    const attrs = span.attributes;

    // Try to parse output from various attributes
    // Priority: object first (for generateObject), then text, then others
    if (attrs["ai.response.object"]) {
      const objectResult = this.safeJsonParse(String(attrs["ai.response.object"]));
      // If we also have text, combine them
      if (attrs["ai.response.text"]) {
        return {
          object: objectResult,
          text: attrs["ai.response.text"],
        };
      }
      return { object: objectResult };
    }
    if (attrs["ai.response.text"]) {
      return { text: attrs["ai.response.text"] };
    }
    if (attrs["ai.result.text"]) {
      return { text: attrs["ai.result.text"] };
    }
    if (attrs["ai.toolCall.result"]) {
      return this.safeJsonParse(String(attrs["ai.toolCall.result"]));
    }
    if (attrs["ai.response.toolCalls"]) {
      return this.safeJsonParse(String(attrs["ai.response.toolCalls"]));
    }
    // Embedding outputs
    if (attrs["ai.embedding"]) {
      return { embedding: this.safeJsonParse(String(attrs["ai.embedding"])) };
    }
    if (attrs["ai.embeddings"]) {
      return { embeddings: this.safeJsonParse(String(attrs["ai.embeddings"])) };
    }

    return undefined;
  }

  private parseSpanMetadata(span: ReadableSpan): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};
    const attrs = span.attributes;

    // Extract tool-specific metadata
    if (attrs["ai.toolCall.name"]) {
      metadata.toolName = attrs["ai.toolCall.name"];
    }
    if (attrs["ai.toolCall.id"]) {
      metadata.toolId = attrs["ai.toolCall.id"];
    }

    // Extract agent metadata
    if (attrs["ai.telemetry.metadata.displayName"]) {
      metadata.displayName = attrs["ai.telemetry.metadata.displayName"];
    }
    if (attrs["ai.telemetry.metadata.agentId"]) {
      metadata.agentId = attrs["ai.telemetry.metadata.agentId"];
    }

    // Extract object generation schema information
    if (attrs["ai.schema"]) {
      metadata.schema = this.safeJsonParse(String(attrs["ai.schema"]));
    }
    if (attrs["ai.schema.name"]) {
      metadata.schemaName = attrs["ai.schema.name"];
    }
    if (attrs["ai.schema.description"]) {
      metadata.schemaDescription = attrs["ai.schema.description"];
    }

    // Extract custom metadata
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith("ai.telemetry.metadata.") && value != null) {
        const cleanKey = key.substring("ai.telemetry.metadata.".length);
        metadata[cleanKey] = value;
      }
    }

    return metadata;
  }

  private parseUsage(attributes: Record<string, any>): Usage | undefined {
    const inputTokens =
      "gen_ai.usage.prompt_tokens" in attributes // Backward compat, input_tokens used in latest ai SDK versions
        ? Number.parseInt(attributes["gen_ai.usage.prompt_tokens"]?.toString() ?? "0")
        : "gen_ai.usage.input_tokens" in attributes
          ? Number.parseInt(attributes["gen_ai.usage.input_tokens"]?.toString() ?? "0")
          : "ai.usage.promptTokens" in attributes
            ? Number.parseInt(attributes["ai.usage.promptTokens"]?.toString() ?? "0")
            : undefined;

    const outputTokens =
      "gen_ai.usage.completion_tokens" in attributes // Backward compat, output_tokens used in latest ai SDK versions
        ? Number.parseInt(attributes["gen_ai.usage.completion_tokens"]?.toString() ?? "0")
        : "gen_ai.usage.output_tokens" in attributes
          ? Number.parseInt(attributes["gen_ai.usage.output_tokens"]?.toString() ?? "0")
          : "ai.usage.completionTokens" in attributes
            ? Number.parseInt(attributes["ai.usage.completionTokens"]?.toString() ?? "0")
            : undefined;
    // Input tokens - Backward compatibility, input_tokens used in latest AI SDK versions
    return {
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: inputTokens && outputTokens ? inputTokens + outputTokens : undefined,
    };
  }

  private parseModelParameters(attributes: Record<string, any>): Record<string, any> {
    return {
      toolChoice:
        "ai.prompt.toolChoice" in attributes
          ? (attributes["ai.prompt.toolChoice"]?.toString() ?? null)
          : null,
      maxTokens:
        "gen_ai.request.max_tokens" in attributes
          ? (attributes["gen_ai.request.max_tokens"]?.toString() ?? null)
          : null,
      finishReason:
        "gen_ai.response.finish_reasons" in attributes
          ? (attributes["gen_ai.response.finish_reasons"]?.toString() ?? null)
          : "gen_ai.finishReason" in attributes // Legacy support for ai SDK versions < 4.0.0
            ? (attributes["gen_ai.finishReason"]?.toString() ?? null)
            : null,
      system:
        "gen_ai.system" in attributes
          ? (attributes["gen_ai.system"]?.toString() ?? null)
          : "ai.model.provider" in attributes
            ? (attributes["ai.model.provider"]?.toString() ?? null)
            : null,
      maxRetries:
        "ai.settings.maxRetries" in attributes
          ? (attributes["ai.settings.maxRetries"]?.toString() ?? null)
          : null,
      mode:
        "ai.settings.mode" in attributes
          ? (attributes["ai.settings.mode"]?.toString() ?? null)
          : null,
      output:
        "ai.settings.output" in attributes
          ? (attributes["ai.settings.output"]?.toString() ?? null)
          : null,
      temperature:
        "gen_ai.request.temperature" in attributes
          ? (attributes["gen_ai.request.temperature"]?.toString() ?? null)
          : null,
      model:
        "ai.response.model" in attributes
          ? attributes["ai.response.model"]?.toString()
          : "gen_ai.request.model" in attributes
            ? attributes["gen_ai.request.model"]?.toString()
            : "ai.model.id" in attributes
              ? attributes["ai.model.id"]?.toString()
              : undefined,
    };
  }

  private parseCompletionStartTime(span: ReadableSpan, startTime: string): string | undefined {
    const attributes = span.attributes;

    // Calculate completion start time based on msToFirstChunk
    const msToFirstChunk =
      "ai.response.msToFirstChunk" in attributes
        ? Number(attributes["ai.response.msToFirstChunk"])
        : "ai.stream.msToFirstChunk" in attributes // Legacy support for ai SDK versions < 4.0.0
          ? Number(attributes["ai.stream.msToFirstChunk"])
          : null;

    if (msToFirstChunk !== null && !Number.isNaN(msToFirstChunk)) {
      const startDate = new Date(startTime);
      const completionStartDate = new Date(startDate.getTime() + msToFirstChunk);
      return completionStartDate.toISOString();
    }

    return undefined;
  }

  private getParentSpanId(span: ReadableSpan): string | undefined {
    return (span as any).parentSpanId ?? (span as any).parentSpanContext?.spanId;
  }

  private hrTimeToISOString(hrtime: [number, number]): string {
    const nanoSeconds = hrtime[0] * 1e9 + hrtime[1];
    const milliSeconds = nanoSeconds / 1e6;
    return new Date(milliSeconds).toISOString();
  }

  private safeJsonParse(jsonString: string | undefined | null): any {
    if (typeof jsonString !== "string") return jsonString;
    try {
      return JSON.parse(jsonString);
    } catch (_e) {
      return jsonString;
    }
  }

  private logDebug(message: string, ...args: any[]): void {
    if (this.debug) {
      console.log(`[${new Date().toISOString()}] [VoltAgentExporter] ${message}`, ...args);
    }
  }

  private logInfo(message: string, ...args: any[]): void {
    console.log(`[${new Date().toISOString()}] [VoltAgentExporter] ${message}`, ...args);
  }

  async forceFlush(): Promise<void> {
    this.logDebug("Force flushing VoltAgent SDK...");

    // End any remaining active histories using trace.end() (only on force flush/shutdown)
    for (const [agentHistoryKey, trace] of this.activeTraces) {
      try {
        await trace.end();
        this.logDebug(`Force completed trace for key ${agentHistoryKey}`);
      } catch (error) {
        this.logDebug(`Error force completing trace for key ${agentHistoryKey}:`, error);
      }
    }

    this.activeHistories.clear();
    this.activeTraces.clear(); // 🔄 Clear trace objects map
    this.parentChildMap.clear();
    this.historyIdMap.clear();

    // 🔗 Clear global maps
    this.globalAgentHistories.clear();
    this.globalParentChildMap.clear();

    // 🎯 Clear tool span cache
    this.toolSpanAgentCache.clear();

    // 🕐 Clear deferred spans
    if (this.deferredSpans.size > 0) {
      this.logDebug(`Clearing ${this.deferredSpans.size} deferred spans on force flush`);
      this.deferredSpans.clear();
    }

    // Clear trace guidance tracking
    this.traceGuidanceShown.clear();

    // Force flush the SDK
    await this.sdk.flush();
  }

  async shutdown(): Promise<void> {
    this.logDebug("Shutting down VoltAgent exporter...");
    await this.forceFlush();
  }

  // New utility methods for multi-agent support

  private discoverAgentsInTrace(spans: ReadableSpan[]): Map<string, AgentInfo> {
    const agents = new Map<string, AgentInfo>();

    for (const span of spans) {
      const agentId = this.extractAgentIdFromSpan(span, spans);
      const parentAgentId = this.extractParentAgentIdFromSpan(span);
      const displayName = this.extractAgentDisplayNameFromSpan(span);

      if (!agents.has(agentId)) {
        agents.set(agentId, {
          agentId,
          parentAgentId,
          displayName,
          startTime: this.hrTimeToISOString(span.startTime),
          spans: [],
        });
      }

      const agent = agents.get(agentId);
      if (agent) {
        agent.spans.push(span);
      }
    }

    this.logDebug(`Discovered ${agents.size} agents in trace:`, Array.from(agents.keys()));
    return agents;
  }

  /**
   * Helper method to get agentId directly from span attributes
   */
  private getAgentIdFromAttributes(span: ReadableSpan, spanType: string): string | undefined {
    const attrs = span.attributes;
    if (attrs["ai.telemetry.metadata.agentId"]) {
      const agentId = String(attrs["ai.telemetry.metadata.agentId"]);
      this.logDebug(`Found agentId in span attributes for ${spanType} span: ${agentId}`);
      return agentId;
    }
    return undefined;
  }

  /**
   * Helper method to find agentId from immediate parent span
   */
  private findAgentIdFromParentSpan(
    span: ReadableSpan,
    allSpans: ReadableSpan[],
  ): string | undefined {
    const parentSpanId = this.getParentSpanId(span);
    if (!parentSpanId) {
      this.logDebug(`${VoltAgentExporter.DEBUG_MESSAGES.NO_PARENT_SPAN} ${span.name}`);
      return undefined;
    }

    const parentSpan = allSpans.find((s) => s.spanContext().spanId === parentSpanId);
    if (!parentSpan) {
      this.logDebug(`Parent span ${parentSpanId} not found in current spans list`);
      this.logDebug(VoltAgentExporter.DEBUG_MESSAGES.MULTI_AGENT_SCENARIO);
      return undefined;
    }

    // 🔍 Debug logging for parent span (only in debug mode)
    if (this.debug) {
      this.logDebug(VoltAgentExporter.DEBUG_MESSAGES.PARENT_SPAN_DEBUG);
      this.logDebug(`Parent span name: ${parentSpan.name}`);
      this.logDebug("Parent span attributes:", JSON.stringify(parentSpan.attributes, null, 2));
    }

    // Try to get agentId from parent span
    if (parentSpan.attributes["ai.telemetry.metadata.agentId"]) {
      const foundAgentId = String(parentSpan.attributes["ai.telemetry.metadata.agentId"]);
      this.logDebug(`${VoltAgentExporter.DEBUG_MESSAGES.AGENT_ID_FOUND} ${foundAgentId}`);
      return foundAgentId;
    }

    this.logDebug("Parent span has no agentId, checking parent chain...");
    // If parent doesn't have agentId, check parent's parent recursively
    return this.findAgentIdInParentChain(parentSpan, allSpans);
  }

  /**
   * Helper method to find agentId from closest generation span
   */
  private findAgentIdFromClosestGenerationSpan(
    span: ReadableSpan,
    allSpans: ReadableSpan[],
  ): string | undefined {
    this.logDebug("No parent span found, searching for most recent generation span...");

    const toolStartTime = span.startTime[0] * 1e9 + span.startTime[1];
    let closestGenerationSpan: { span: ReadableSpan; timeDiff: number } | undefined;

    for (const otherSpan of allSpans) {
      if (
        this.getSpanType(otherSpan) === "generation" &&
        otherSpan.attributes["ai.telemetry.metadata.agentId"]
      ) {
        const spanStartTime = otherSpan.startTime[0] * 1e9 + otherSpan.startTime[1];
        const timeDiff = Math.abs(toolStartTime - spanStartTime);

        if (!closestGenerationSpan || timeDiff < closestGenerationSpan.timeDiff) {
          closestGenerationSpan = { span: otherSpan, timeDiff };
        }
      }
    }

    if (closestGenerationSpan) {
      const foundAgentId = String(
        closestGenerationSpan.span.attributes["ai.telemetry.metadata.agentId"],
      );
      this.logDebug(
        `Found agentId from closest generation span: ${foundAgentId} (time diff: ${closestGenerationSpan.timeDiff}ns)`,
      );
      return foundAgentId;
    }

    return undefined;
  }

  private extractAgentIdFromSpan(span: ReadableSpan, allSpans?: ReadableSpan[]): string {
    const spanType = this.getSpanType(span);
    const spanId = span.spanContext().spanId;

    // 🎯 For tool spans, check cache first
    if (spanType === "tool" && this.toolSpanAgentCache.has(spanId)) {
      const cachedAgentId = this.toolSpanAgentCache.get(spanId);
      if (cachedAgentId) {
        this.logDebug(`Found cached agentId for tool span: ${cachedAgentId}`);
        return cachedAgentId;
      }
    }

    // Try to get agentId from telemetry metadata
    const agentIdFromAttributes = this.getAgentIdFromAttributes(span, spanType);
    if (agentIdFromAttributes) {
      // 🎯 Cache tool span agentId
      if (spanType === "tool") {
        this.toolSpanAgentCache.set(spanId, agentIdFromAttributes);
      }
      return agentIdFromAttributes;
    }

    // For tool calls, try to find agentId from parent spans
    if (allSpans && spanType === "tool") {
      let foundAgentId: string | undefined;

      // 🔍 Only show detailed debug for tool spans in debug mode
      if (this.debug) {
        this.logDebug(VoltAgentExporter.DEBUG_MESSAGES.TOOL_SPAN_DEBUG);
        this.logDebug(`Tool span name: ${span.name}`);
        this.logDebug("Tool span attributes:", JSON.stringify(span.attributes, null, 2));
        this.logDebug(`Parent span ID: ${this.getParentSpanId(span)}`);
      }

      // Strategy 1: Get agentId from immediate parent span
      foundAgentId = this.findAgentIdFromParentSpan(span, allSpans);

      // Strategy 2: If no parent found, find the most recent generation span in trace
      if (!foundAgentId) {
        foundAgentId = this.findAgentIdFromClosestGenerationSpan(span, allSpans);
      }

      if (foundAgentId) {
        // 🎯 Cache the found agentId
        this.toolSpanAgentCache.set(spanId, foundAgentId);
        return foundAgentId;
      }

      // If we reach here for tool spans, we'll use default - this is normal
      this.showDefaultAgentGuidance(span.spanContext().traceId);
    }

    // Fallback to default agent id - this is perfectly fine
    const defaultAgentId = VoltAgentExporter.DEFAULT_AGENT_ID;

    // Show guidance when using default agent
    this.showDefaultAgentGuidance(span.spanContext().traceId);

    // 🎯 Cache even the default agentId for tool spans
    if (spanType === "tool") {
      this.toolSpanAgentCache.set(spanId, defaultAgentId);
    }

    return defaultAgentId;
  }

  /**
   * Recursively find agentId in parent chain (similar to Langfuse approach)
   */
  private findAgentIdInParentChain(
    span: ReadableSpan,
    allSpans: ReadableSpan[],
  ): string | undefined {
    const parentSpanId = this.getParentSpanId(span);
    if (!parentSpanId) {
      return undefined;
    }

    const parentSpan = allSpans.find((s) => s.spanContext().spanId === parentSpanId);
    if (!parentSpan) {
      return undefined;
    }

    // Check if this parent has agentId
    if (parentSpan.attributes["ai.telemetry.metadata.agentId"]) {
      const agentId = String(parentSpan.attributes["ai.telemetry.metadata.agentId"]);
      this.logDebug(`Found agentId in parent chain: ${agentId}`);
      return agentId;
    }

    // Recursively check parent's parent
    return this.findAgentIdInParentChain(parentSpan, allSpans);
  }

  private extractParentAgentIdFromSpan(span: ReadableSpan): string | undefined {
    const attrs = span.attributes;

    // Try to get parentAgentId from telemetry metadata
    if (attrs["ai.telemetry.metadata.parentAgentId"]) {
      return String(attrs["ai.telemetry.metadata.parentAgentId"]);
    }

    return undefined;
  }

  private extractAgentDisplayNameFromSpan(span: ReadableSpan): string | undefined {
    const attrs = span.attributes;

    // Try to get display name from telemetry metadata
    if (attrs["ai.telemetry.metadata.displayName"]) {
      return String(attrs["ai.telemetry.metadata.displayName"]);
    }

    if (attrs["ai.telemetry.metadata.agentName"]) {
      return String(attrs["ai.telemetry.metadata.agentName"]);
    }

    return undefined;
  }

  private isFirstGenerationSpanForAgent(span: ReadableSpan, agentInfo: AgentInfo): boolean {
    // Check if this is the first generation span for this agent
    const generationSpans = agentInfo.spans.filter((s) => this.getSpanType(s) === "generation");
    const sortedSpans = generationSpans.sort((a, b) => {
      const aTime = a.startTime[0] * 1e9 + a.startTime[1];
      const bTime = b.startTime[0] * 1e9 + b.startTime[1];
      return aTime - bTime;
    });

    return sortedSpans[0] === span;
  }

  private isLastGenerationSpanForAgent(span: ReadableSpan, agentInfo: AgentInfo): boolean {
    // Check if this is the last completed generation span for this agent
    const generationSpans = agentInfo.spans.filter(
      (s) => this.getSpanType(s) === "generation" && s.endTime,
    );
    const sortedSpans = generationSpans.sort((a, b) => {
      const aEndTime = a.endTime;
      const bEndTime = b.endTime;
      if (!aEndTime || !bEndTime) return 0;

      const aTime = aEndTime[0] * 1e9 + aEndTime[1];
      const bTime = bEndTime[0] * 1e9 + bEndTime[1];
      return bTime - aTime; // Sort by end time descending
    });

    return sortedSpans[0] === span;
  }

  private isTraceComplete(spans: ReadableSpan[]): boolean {
    // Check if all spans in the trace are completed
    return spans.every((span) => span.endTime && span.endTime[0] > 0);
  }

  private generateUUID(): string {
    return crypto.randomUUID();
  }

  private async processDeferredSpans(
    traceId: string,
    spans: ReadableSpan[],
    traceMetadata: TraceMetadata,
    agentsInTrace: Map<string, AgentInfo>,
  ): Promise<void> {
    const deferredSpans = Array.from(this.deferredSpans.values());
    this.deferredSpans.clear();

    for (const { span, traceId: deferredTraceId } of deferredSpans) {
      if (deferredTraceId === traceId) {
        // Clear cache for this span so it can re-evaluate with complete span set
        this.toolSpanAgentCache.delete(span.spanContext().spanId);

        const allSpansInTrace = this.getAllSpansForTrace(traceId);
        const agentId = this.extractAgentIdFromSpan(
          span,
          allSpansInTrace.length > 0 ? allSpansInTrace : [span],
        );
        const deferredAgentInfo = agentsInTrace.get(agentId);
        const deferredIsRootSpan = this.findRootSpan(spans) === span;

        await this.processSpanAsVoltAgentEvents(
          traceId,
          span,
          traceMetadata,
          deferredAgentInfo,
          deferredIsRootSpan,
        );
      }
    }
  }

  private showDefaultAgentGuidance(traceId: string): void {
    if (!this.traceGuidanceShown.has(traceId)) {
      this.logInfo("📋 VoltAgent: Using default agent for tracking.");
      this.logInfo("💡 For better tracking, add agentId to your metadata:");
      this.logInfo("   experimental_telemetry: {");
      this.logInfo("     isEnabled: true,");
      this.logInfo("     metadata: { agentId: 'my-agent' }");
      this.logInfo("   }");
      this.traceGuidanceShown.add(traceId);
    }
  }
}
