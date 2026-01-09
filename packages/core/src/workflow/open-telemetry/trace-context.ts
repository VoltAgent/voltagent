/**
 * WorkflowTraceContext - Manages trace hierarchy and common attributes for workflows
 *
 * Similar to AgentTraceContext but tailored for workflow execution:
 * 1. Common attributes (workflowId, executionId, userId, etc.) are set once and inherited
 * 2. Parent-child span relationships for workflow steps
 * 3. Support for parallel step execution
 * 4. Suspend/resume state tracking
 * 5. Clean integration with VoltAgentObservability
 */

import {
  type Context,
  type Span,
  SpanKind,
  type SpanOptions,
  SpanStatusCode,
  type Tracer,
  context,
  trace,
} from "@opentelemetry/api";
import { safeStringify } from "@voltagent/internal/utils";
import type { VoltAgentObservability } from "../../observability";
import type { WorkflowRunOptions } from "../types";

type SpanBridge = {
  ___voltagent_push_span?: (span: Span) => void;
  ___voltagent_pop_span?: (span: Span) => void;
};

const spanBridge = globalThis as typeof globalThis & SpanBridge;

const pushActiveSpan = (span: Span) => {
  spanBridge.___voltagent_push_span?.(span);
};

const popActiveSpan = (span: Span) => {
  spanBridge.___voltagent_pop_span?.(span);
};

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === "object" && value !== null && typeof (value as any).then === "function";

export interface WorkflowTraceContextOptions {
  workflowId: string;
  workflowName: string;
  executionId: string;
  userId?: string;
  conversationId?: string;
  parentSpan?: Span;
  input?: any;
  context?: Map<string | symbol, unknown>;
  resumedFrom?: {
    traceId: string;
    spanId: string;
  };
}

export class WorkflowTraceContext {
  private rootSpan: Span;
  private tracer: Tracer;
  private commonAttributes: Record<string, any>;
  private activeContext: Context;
  private stepSpans: Map<string, Span> = new Map();

  constructor(
    observability: VoltAgentObservability,
    operationName: string,
    options: WorkflowTraceContextOptions,
  ) {
    this.tracer = observability.getTracer();

    // Store common attributes once - these will be inherited by all child spans
    this.commonAttributes = {
      "entity.id": options.workflowId,
      "entity.type": "workflow",
      "entity.name": options.workflowName,
      "workflow.execution.id": options.executionId,
      ...(options.userId && { "user.id": options.userId }),
      ...(options.conversationId && { "conversation.id": options.conversationId }),
    };

    // If there's a parent span (e.g., from an agent), use it as context
    const parentContext = options.parentSpan
      ? trace.setSpan(context.active(), options.parentSpan)
      : context.active();

    // Create root span with common attributes
    const spanAttributes: Record<string, any> = {
      ...this.commonAttributes,
      "voltagent.label": options.workflowName || options.workflowId, // Add label for UI display
    };

    // Add input if provided
    if (options.input !== undefined) {
      const inputStr =
        typeof options.input === "string" ? options.input : safeStringify(options.input);
      spanAttributes.input = inputStr;
    }

    // Add context if provided
    if (options.context) {
      const contextObj = Object.fromEntries(options.context.entries());
      if (Object.keys(contextObj).length > 0) {
        spanAttributes["workflow.context"] = safeStringify(contextObj);
      }
    }

    // Create span links if resuming from a previous execution
    const links = options.resumedFrom
      ? [
          {
            context: {
              traceId: options.resumedFrom.traceId,
              spanId: options.resumedFrom.spanId,
              traceFlags: 1, // Sampled
              traceState: undefined,
            },
            attributes: {
              "link.type": "resume",
              "workflow.resumed": true,
            },
          },
        ]
      : undefined;

    this.rootSpan = this.tracer.startSpan(
      operationName,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          ...spanAttributes,
          "workflow.state": "running", // Track initial workflow state
          ...(options.resumedFrom && {
            "workflow.resumed": true,
            "workflow.previous_trace_id": options.resumedFrom.traceId,
            "workflow.previous_span_id": options.resumedFrom.spanId,
          }),
        },
        links,
      },
      parentContext,
    );

    // Set active context with root span
    this.activeContext = trace.setSpan(context.active(), this.rootSpan);
    pushActiveSpan(this.rootSpan);
  }

  /**
   * Create a child span for a workflow step
   */
  createStepSpan(
    stepIndex: number,
    stepType: string,
    stepName: string,
    options?: {
      stepId?: string;
      parentStepId?: string;
      parallelIndex?: number;
      input?: any;
      attributes?: Record<string, any>;
    },
  ): Span {
    const spanName = `workflow.step.${stepType}`;

    // Add voltagent.label for UI display
    const label = (() => {
      // If stepName is not the default "Step X" format, use it
      if (stepName && !stepName.startsWith("Step ")) {
        return stepName;
      }
      // Otherwise use stepId if available
      if (options?.stepId) {
        return options.stepId;
      }
      // Fall back to stepName
      return stepName;
    })();

    const spanOptions: SpanOptions = {
      kind: SpanKind.INTERNAL,
      attributes: {
        ...this.commonAttributes, // Inherit common attributes
        "span.type": "workflow-step",
        "voltagent.label": label, // Add label for UI display
        "workflow.step.state": "running", // Track initial step state
        "workflow.step.index": stepIndex,
        "workflow.step.type": stepType,
        "workflow.step.name": stepName,
        ...(options?.stepId && { "workflow.step.id": options.stepId }),
        ...(options?.parentStepId && { "workflow.step.parent_id": options.parentStepId }),
        ...(options?.parallelIndex !== undefined && {
          "workflow.step.parallel_index": options.parallelIndex,
        }),
        ...(options?.attributes || {}),
      },
    };

    // Add input if provided
    if (options?.input !== undefined) {
      const inputStr =
        typeof options.input === "string" ? options.input : safeStringify(options.input);
      spanOptions.attributes = { ...(spanOptions.attributes ?? {}), input: inputStr };
    }

    // Create span with parent context
    const parentContext =
      options?.parentStepId && this.stepSpans.has(options.parentStepId)
        ? trace.setSpan(this.activeContext, this.stepSpans.get(options.parentStepId) as Span)
        : this.activeContext;

    const span = this.tracer.startSpan(spanName, spanOptions, parentContext);

    // Store step span for parallel execution tracking
    if (options?.stepId) {
      this.stepSpans.set(options.stepId, span);
    }

    return span;
  }

  /**
   * Create spans for parallel steps
   */
  createParallelStepSpans(
    parentStepIndex: number,
    parentStepType: string,
    parentStepName: string,
    parallelSteps: Array<{
      index: number;
      type: string;
      name: string;
      id?: string;
    }>,
  ): { parentSpan: Span; childSpans: Span[] } {
    // Create parent span for the parallel execution
    const parentSpan = this.createStepSpan(parentStepIndex, parentStepType, parentStepName, {
      attributes: {
        "workflow.step.parallel_count": parallelSteps.length,
      },
    });

    // Create child spans for each parallel step
    const childSpans = parallelSteps.map((step, parallelIndex) =>
      this.createStepSpan(step.index, step.type, step.name, {
        stepId: step.id,
        parentStepId: parentStepName,
        parallelIndex,
      }),
    );

    return { parentSpan, childSpans };
  }

  /**
   * Create a generic child span under the workflow root or an optional parent span
   */
  createChildSpan(
    name: string,
    type: string,
    options?: {
      label?: string;
      attributes?: Record<string, any>;
      kind?: SpanKind;
      parentSpan?: Span;
    },
  ): Span {
    const spanOptions: SpanOptions = {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: {
        ...this.commonAttributes,
        "span.type": type,
        ...(options?.label && { "span.label": options.label }),
        ...(options?.attributes || {}),
      },
    };

    const parentContext = options?.parentSpan
      ? trace.setSpan(this.activeContext, options.parentSpan)
      : this.activeContext;

    return this.tracer.startSpan(name, spanOptions, parentContext);
  }

  /**
   * Record a suspension event on the workflow
   */
  recordSuspension(stepIndex: number, reason: string, suspendData?: any, checkpoint?: any): void {
    this.rootSpan.addEvent("workflow.suspended", {
      "suspension.step_index": stepIndex,
      "suspension.reason": reason,
      ...(suspendData && { "suspension.data": safeStringify(suspendData) }),
      ...(checkpoint && { "suspension.checkpoint": safeStringify(checkpoint) }),
    });

    // Update span status
    this.rootSpan.setStatus({
      code: SpanStatusCode.OK,
      message: `Workflow suspended: ${reason}`,
    });
  }

  /**
   * Record a cancellation event on the workflow
   */
  recordCancellation(reason?: string): void {
    this.rootSpan.addEvent("workflow.cancelled", {
      ...(reason ? { "cancellation.reason": reason } : {}),
    });

    this.rootSpan.setStatus({
      code: SpanStatusCode.OK,
      message: reason ? `Workflow cancelled: ${reason}` : "Workflow cancelled",
    });
  }

  /**
   * Record a resume event on the workflow
   */
  recordResume(stepIndex: number, resumeData?: any): void {
    this.rootSpan.addEvent("workflow.resumed", {
      "resume.step_index": stepIndex,
      ...(resumeData && { "resume.data": safeStringify(resumeData) }),
    });
  }

  /**
   * Execute a function within a span's context
   */
  async withSpan<T>(span: Span, fn: () => T | Promise<T>): Promise<T> {
    const spanContext = trace.setSpan(this.activeContext, span);
    pushActiveSpan(span);
    try {
      const result = context.with(spanContext, fn);
      if (isPromiseLike(result)) {
        return (result as unknown as Promise<T>).finally(() => {
          popActiveSpan(span);
        }) as T;
      }
      popActiveSpan(span);
      return result as T;
    } catch (error) {
      popActiveSpan(span);
      throw error;
    }
  }

  /**
   * Get the root span
   */
  getRootSpan(): Span {
    return this.rootSpan;
  }

  /**
   * Set input on the root span
   */
  setInput(input: any): void {
    const inputStr = typeof input === "string" ? input : safeStringify(input);
    this.rootSpan.setAttribute("input", inputStr);
  }

  /**
   * Set output on the root span
   */
  setOutput(output: any): void {
    const outputStr = typeof output === "string" ? output : safeStringify(output);
    this.rootSpan.setAttribute("output", outputStr);
  }

  /**
   * Set usage information on the root span
   */
  setUsage(usage: any): void {
    if (usage) {
      this.rootSpan.setAttribute("workflow.usage", safeStringify(usage));
    }
  }

  /**
   * End the root span with a status
   */
  end(status: "completed" | "suspended" | "cancelled" | "error", error?: Error | any): void {
    // Set the final workflow state
    this.rootSpan.setAttribute("workflow.state", status);

    if (status === "completed") {
      this.rootSpan.setStatus({ code: SpanStatusCode.OK });
    } else if (status === "suspended") {
      this.rootSpan.setStatus({
        code: SpanStatusCode.OK,
        message: "Workflow suspended",
      });
    } else if (status === "cancelled") {
      this.rootSpan.setStatus({
        code: SpanStatusCode.OK,
        message: "Workflow cancelled",
      });
    } else {
      this.rootSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error?.message || "Workflow failed",
      });
      if (error) {
        // Record exception
        this.rootSpan.recordException(error);

        // Add detailed error attributes
        const errorAttributes: Record<string, any> = {
          "error.type": error.name || "Error",
          "error.message": error.message || String(error),
        };

        if (error.stack) {
          errorAttributes["error.stack"] = error.stack;
        }

        this.rootSpan.setAttributes(errorAttributes);
      }
    }
    this.rootSpan.end();
    popActiveSpan(this.rootSpan);
  }

  /**
   * End a step span with proper status
   */
  endStepSpan(
    span: Span,
    status: "completed" | "skipped" | "suspended" | "cancelled" | "error",
    options?: {
      output?: any;
      error?: Error | any;
      attributes?: Record<string, any>;
      skippedReason?: string;
      suspensionReason?: string;
      cancellationReason?: string;
    },
  ): void {
    // Set the final state of the step
    span.setAttribute("workflow.step.state", status);

    if (options?.output !== undefined) {
      const outputStr =
        typeof options.output === "string" ? options.output : safeStringify(options.output);
      span.setAttribute("output", outputStr);
    }

    if (options?.attributes) {
      span.setAttributes(options.attributes);
    }

    if (status === "completed") {
      span.setStatus({ code: SpanStatusCode.OK });
    } else if (status === "skipped") {
      span.setStatus({
        code: SpanStatusCode.OK,
        message: options?.skippedReason || "Step skipped",
      });
      span.setAttribute("workflow.step.skipped", true);
      if (options?.skippedReason) {
        span.setAttribute("workflow.step.skipped_reason", options.skippedReason);
      }
    } else if (status === "suspended") {
      span.setStatus({
        code: SpanStatusCode.OK,
        message: "Step suspended",
      });
      span.setAttribute("workflow.step.suspended", true);
      if (options?.suspensionReason) {
        span.setAttribute("workflow.step.suspension_reason", options.suspensionReason);
      }
    } else if (status === "cancelled") {
      span.setStatus({
        code: SpanStatusCode.OK,
        message: options?.cancellationReason || "Step cancelled",
      });
      span.setAttribute("workflow.step.cancelled", true);
      if (options?.cancellationReason) {
        span.setAttribute("workflow.step.cancellation_reason", options.cancellationReason);
      }
    } else {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: options?.error?.message || "Step failed",
      });
      if (options?.error) {
        span.recordException(options.error);

        // Add detailed error attributes
        const errorAttributes: Record<string, any> = {
          "error.type": options.error.name || "Error",
          "error.message": options.error.message || String(options.error),
        };

        if (options.error.stack) {
          errorAttributes["error.stack"] = options.error.stack;
        }

        span.setAttributes(errorAttributes);
      }
    }

    span.end();
  }

  /**
   * Get the active context for manual context propagation
   */
  getActiveContext(): Context {
    return this.activeContext;
  }

  /**
   * Update active context with a new span
   */
  updateActiveContext(span: Span): void {
    this.activeContext = trace.setSpan(this.activeContext, span);
  }

  /**
   * Clear step spans (useful for cleanup after parallel execution)
   */
  clearStepSpans(): void {
    this.stepSpans.clear();
  }
}

/**
 * Add workflow attributes to a span
 */
export function addWorkflowAttributesToSpan(
  span: Span | undefined,
  options?: WorkflowRunOptions,
): void {
  if (!span) return;

  // Workflow-specific options
  if (options?.userId !== undefined) {
    span.setAttribute("user.id", options.userId);
  }

  if (options?.conversationId !== undefined) {
    span.setAttribute("conversation.id", options.conversationId);
  }

  if (options?.executionId !== undefined) {
    span.setAttribute("workflow.execution.id", options.executionId);
  }

  // Context
  if (options?.context) {
    const contextObj =
      options.context instanceof Map
        ? Object.fromEntries(options.context.entries())
        : options.context;

    if (Object.keys(contextObj).length > 0) {
      span.setAttribute("workflow.context", safeStringify(contextObj));
    }
  }

  // Resume information
  if (options?.resumeFrom) {
    span.setAttribute("workflow.resumed", true);
    span.setAttribute("workflow.resume.execution_id", options.resumeFrom.executionId);
    span.setAttribute("workflow.resume.step_index", options.resumeFrom.resumeStepIndex);
    if (options.resumeFrom.resumeData) {
      span.setAttribute("workflow.resume.data", safeStringify(options.resumeFrom.resumeData));
    }
  }
}
