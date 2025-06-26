import type { StepWithContent } from "@voltagent/core";
import type { UIMessage, UIMessagePart } from "../types";

/**
 * Reject (aka remove) the steps of a StepWithContent. Use to quickly remove steps usually for SubAgent.
 *
 * @param steps - The steps to reject.
 * @param exclude - The steps to exclude.
 * @returns The steps with the steps rejected.
 */
export function rejectStepsWithContent(
  steps: StepWithContent[],
  exclude: (step: StepWithContent) => boolean,
) {
  return steps.filter((step) => !exclude(step));
}

/**
 * Reject (aka remove) the parts of a UIMessage. Use to quickly remove parts usually for SubAgent.
 *
 * @example
 * ```ts
 * const message = await runAgent({
 *   ...
 * })
 *
 * const filteredMessage = rejectUIMessageParts(message, () => {
 *   return part.type === "text-delta" && isSubAgent(part);
 * });
 * ```
 *
 * @param message - The message to reject the parts from.
 * @param exclude - The parts to exclude.
 * @returns The message with the parts rejected.
 */
export function rejectUIMessageParts(
  message: UIMessage,
  exclude: (part: UIMessagePart) => boolean,
) {
  const finalParts: UIMessagePart[] = [];

  for (const part of message.parts) {
    if (exclude(part)) {
      continue;
    }

    finalParts.push(part);
  }

  return finalParts;
}
