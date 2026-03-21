/**
 * GuardrailProvider — A pluggable interface for external guardrail implementations.
 *
 * External packages (e.g., AIP, APort) implement this interface to provide
 * identity verification, trust scoring, content filtering, or any other
 * guardrail logic. VoltAgent agents can then use any provider without
 * coupling to a specific implementation.
 *
 * @example
 * ```typescript
 * import { Agent, createGuardrailsFromProvider } from "@voltagent/core";
 * import { AIPGuardrailProvider } from "@aip/voltagent-provider";
 *
 * const provider = new AIPGuardrailProvider({ trustThreshold: 0.7 });
 * const { inputGuardrails, outputGuardrails } = createGuardrailsFromProvider(provider);
 *
 * const agent = new Agent({
 *   name: "my-agent",
 *   inputGuardrails,
 *   outputGuardrails,
 * });
 * ```
 */

import type {
  GuardrailAction,
  GuardrailSeverity,
  InputGuardrail,
  InputGuardrailArgs,
  InputGuardrailResult,
  OutputGuardrail,
  OutputGuardrailArgs,
  OutputGuardrailResult,
} from "./types";

// ---------------------------------------------------------------------------
// Provider types
// ---------------------------------------------------------------------------

/**
 * Context passed to a guardrail provider for each evaluation.
 * Keeps the provider decoupled from VoltAgent internals while giving it
 * the information it needs.
 */
export interface GuardrailProviderContext {
  /** The name of the agent being guarded. */
  agentName: string;
  /** The operation being performed (e.g., "generateText", "streamText"). */
  operation: string;
  /** Direction of the guardrail check. */
  direction: "input" | "output";
}

/**
 * The decision returned by a guardrail provider after evaluation.
 */
export interface GuardrailProviderDecision {
  /** Whether the content passes the guardrail check. */
  pass: boolean;
  /**
   * The action to take.
   * - `"allow"` — let the content through (default when pass is true)
   * - `"modify"` — replace the content with `modifiedContent`
   * - `"block"` — reject the content (default when pass is false)
   */
  action?: GuardrailAction;
  /** Human-readable reason for the decision. */
  message?: string;
  /**
   * Replacement content when action is `"modify"`.
   * For input guardrails this replaces the user input.
   * For output guardrails this replaces the model output.
   */
  modifiedContent?: unknown;
  /** Arbitrary metadata attached to the guardrail span for observability. */
  metadata?: Record<string, unknown>;
}

/**
 * Abstract interface that external guardrail packages implement.
 *
 * At minimum a provider must implement {@link evaluateInput} or
 * {@link evaluateOutput} (or both). Methods that are not implemented
 * are skipped — no guardrail is created for that direction.
 *
 * The optional {@link name}, {@link description}, {@link severity}, and
 * {@link tags} properties control how the guardrail appears in
 * observability traces.
 */
export interface GuardrailProvider {
  /** Display name for this provider (used in traces and logs). */
  readonly name: string;

  /** Optional human-readable description. */
  readonly description?: string;

  /** Severity level used when the guardrail blocks content. */
  readonly severity?: GuardrailSeverity;

  /** Tags for filtering and categorization in traces. */
  readonly tags?: string[];

  /**
   * Evaluate input content before it reaches the model.
   * Return `undefined` or `{ pass: true }` to allow the input through.
   */
  evaluateInput?(
    content: string,
    context: GuardrailProviderContext,
  ): Promise<GuardrailProviderDecision> | GuardrailProviderDecision;

  /**
   * Evaluate output content before it is returned to the caller.
   * Return `undefined` or `{ pass: true }` to allow the output through.
   */
  evaluateOutput?(
    content: string,
    context: GuardrailProviderContext,
  ): Promise<GuardrailProviderDecision> | GuardrailProviderDecision;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Options for {@link createGuardrailsFromProvider}.
 */
export interface CreateGuardrailsFromProviderOptions {
  /**
   * Override the provider's default severity for the generated guardrails.
   */
  severity?: GuardrailSeverity;
  /**
   * Additional tags merged with the provider's own tags.
   */
  tags?: string[];
  /**
   * Optional unique id for the generated guardrail definitions.
   * Defaults to a slug derived from the provider name.
   */
  id?: string;
}

/**
 * Convert a {@link GuardrailProvider} into VoltAgent-native guardrail arrays
 * that can be passed directly to an Agent constructor or per-call options.
 *
 * Only directions that the provider implements are included. If the provider
 * implements neither `evaluateInput` nor `evaluateOutput`, both arrays will
 * be empty.
 *
 * @example
 * ```typescript
 * const { inputGuardrails, outputGuardrails } = createGuardrailsFromProvider(myProvider);
 *
 * const agent = new Agent({
 *   name: "guarded-agent",
 *   inputGuardrails,
 *   outputGuardrails,
 * });
 * ```
 */
export function createGuardrailsFromProvider(
  provider: GuardrailProvider,
  options?: CreateGuardrailsFromProviderOptions,
): {
  inputGuardrails: InputGuardrail[];
  outputGuardrails: OutputGuardrail[];
} {
  const id = options?.id ?? slugify(provider.name);
  const severity = options?.severity ?? provider.severity;
  const tags = mergeTags(provider.tags, options?.tags);

  const inputGuardrails: InputGuardrail[] = [];
  const outputGuardrails: OutputGuardrail[] = [];

  if (provider.evaluateInput) {
    const evaluate = provider.evaluateInput.bind(provider);

    const inputGuardrail: InputGuardrail = {
      id: `${id}-input`,
      name: `${provider.name} (input)`,
      description: provider.description,
      severity,
      tags,
      handler: async (args: InputGuardrailArgs): Promise<InputGuardrailResult> => {
        const context: GuardrailProviderContext = {
          agentName: args.agent.name,
          operation: args.operation,
          direction: "input",
        };

        const decision = await evaluate(args.inputText, context);

        if (!decision || decision.pass !== false) {
          const resolvedAction = decision?.action ?? "allow";
          if (resolvedAction === "modify" && decision?.modifiedContent !== undefined) {
            return {
              pass: true,
              action: "modify",
              message: decision?.message,
              metadata: decision?.metadata,
              modifiedInput: decision.modifiedContent as InputGuardrailResult["modifiedInput"],
            };
          }
          return {
            pass: true,
            action: "allow",
            message: decision?.message,
            metadata: decision?.metadata,
          };
        }

        return {
          pass: false,
          action: decision.action ?? "block",
          message: decision.message,
          metadata: decision.metadata,
        };
      },
    };

    inputGuardrails.push(inputGuardrail);
  }

  if (provider.evaluateOutput) {
    const evaluate = provider.evaluateOutput.bind(provider);

    const outputGuardrail: OutputGuardrail = {
      id: `${id}-output`,
      name: `${provider.name} (output)`,
      description: provider.description,
      severity,
      tags,
      handler: async (args: OutputGuardrailArgs): Promise<OutputGuardrailResult> => {
        const outputText = args.outputText ?? "";
        const context: GuardrailProviderContext = {
          agentName: args.agent.name,
          operation: args.operation,
          direction: "output",
        };

        const decision = await evaluate(outputText, context);

        if (!decision || decision.pass !== false) {
          const resolvedAction = decision?.action ?? "allow";
          if (resolvedAction === "modify" && decision?.modifiedContent !== undefined) {
            return {
              pass: true,
              action: "modify",
              message: decision?.message,
              metadata: decision?.metadata,
              modifiedOutput: decision.modifiedContent,
            };
          }
          return {
            pass: true,
            action: "allow",
            message: decision?.message,
            metadata: decision?.metadata,
          };
        }

        return {
          pass: false,
          action: decision.action ?? "block",
          message: decision.message,
          metadata: decision.metadata,
        };
      },
    };

    outputGuardrails.push(outputGuardrail);
  }

  return { inputGuardrails, outputGuardrails };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mergeTags(
  providerTags?: string[],
  optionTags?: string[],
): string[] | undefined {
  if (!providerTags?.length && !optionTags?.length) {
    return undefined;
  }
  return [...(providerTags ?? []), ...(optionTags ?? [])];
}
