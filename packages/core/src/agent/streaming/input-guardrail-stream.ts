import type { AsyncIterableStream, UIMessage } from "ai";
import type { Agent } from "../agent";
import type { ConversationBuffer } from "../conversation-buffer";
import { createVoltAgentError } from "../errors";
import { type NormalizedInputGuardrail, runInputGuardrails } from "../guardrail";
import type { BaseMessage } from "../providers/base/types";
import type { VoltAgentTextStreamPart } from "../subagent/types";
import type { AgentEvalOperationType, OperationContext } from "../types";
import { createAsyncIterableReadable } from "./guardrail-stream";

const DEFAULT_INPUT_GUARDRAIL_BLOCK_MESSAGE = "Input blocked by guardrail.";

export type SpeculativeInputGuardrailDecision =
  | { status: "passed" }
  | { status: "blocked"; error: Error; message: string };

export class SpeculativeInputGuardrailRun {
  private decision: SpeculativeInputGuardrailDecision | null = null;
  private blockHandled = false;
  private readonly promise: Promise<SpeculativeInputGuardrailDecision>;

  constructor(
    private readonly params: {
      input: string | UIMessage[] | BaseMessage[];
      operationContext: OperationContext;
      guardrails: NormalizedInputGuardrail[];
      operation: AgentEvalOperationType;
      agent: Agent;
      buffer: ConversationBuffer;
      onBlock?: (
        decision: Extract<SpeculativeInputGuardrailDecision, { status: "blocked" }>,
      ) => void;
    },
  ) {
    const checkpoint = params.buffer.createCheckpoint();

    this.promise = runInputGuardrails(
      params.input,
      params.operationContext,
      params.guardrails,
      params.operation,
      params.agent,
      { allowModify: false },
    )
      .then(() => {
        this.decision = { status: "passed" };
        return this.decision;
      })
      .catch((errorValue) => {
        const error =
          errorValue instanceof Error
            ? errorValue
            : createVoltAgentError(String(errorValue), { code: "GUARDRAIL_INPUT_BLOCKED" });
        const message = error.message || DEFAULT_INPUT_GUARDRAIL_BLOCK_MESSAGE;
        const decision: SpeculativeInputGuardrailDecision = {
          status: "blocked",
          error,
          message,
        };
        this.decision = decision;
        this.handleBlock(decision, checkpoint);
        return decision;
      });
  }

  wait(): Promise<SpeculativeInputGuardrailDecision> {
    return this.promise;
  }

  getDecision(): SpeculativeInputGuardrailDecision | null {
    return this.decision;
  }

  hasPassed(): boolean {
    return this.decision?.status === "passed";
  }

  hasBlocked(): boolean {
    return this.decision?.status === "blocked";
  }

  private handleBlock(
    decision: Extract<SpeculativeInputGuardrailDecision, { status: "blocked" }>,
    checkpoint: ReturnType<ConversationBuffer["createCheckpoint"]>,
  ): void {
    if (this.blockHandled) {
      return;
    }

    this.blockHandled = true;
    this.params.buffer.restoreCheckpoint(checkpoint);
    this.params.onBlock?.(decision);

    if (!this.params.operationContext.abortController.signal.aborted) {
      this.params.operationContext.abortController.abort(decision.error);
    }
  }
}

export function applySpeculativeInputGuardrailToFullStream(params: {
  baseStream: AsyncIterable<VoltAgentTextStreamPart>;
  guardrail: SpeculativeInputGuardrailRun | null;
  responseMessageId?: string;
}): AsyncIterable<VoltAgentTextStreamPart> {
  if (!params.guardrail) {
    return params.baseStream;
  }
  return gateIterableUntilSpeculativeInputPass({
    source: params.baseStream,
    guardrail: params.guardrail,
    replacement: (decision) =>
      createInputGuardrailBlockedFullStreamParts(decision.message, params.responseMessageId),
  });
}

export function applySpeculativeInputGuardrailToTextStream(params: {
  baseStream: AsyncIterable<string>;
  guardrail: SpeculativeInputGuardrailRun | null;
}): AsyncIterableStream<string> {
  if (!params.guardrail) {
    return params.baseStream as AsyncIterableStream<string>;
  }
  return iterableToStream(
    gateIterableUntilSpeculativeInputPass({
      source: params.baseStream,
      guardrail: params.guardrail,
      replacement: (decision) => [decision.message],
    }),
  );
}

export function applySpeculativeInputGuardrailToUIStream<
  TStream extends AsyncIterable<any>,
>(params: {
  baseStream: TStream;
  guardrail: SpeculativeInputGuardrailRun | null;
  responseMessageId?: string;
}): TStream {
  if (!params.guardrail) {
    return params.baseStream;
  }
  type UIStreamChunk = TStream extends AsyncIterable<infer Chunk> ? Chunk : never;

  return iterableToStream(
    gateIterableUntilSpeculativeInputPass<UIStreamChunk>({
      source: params.baseStream as AsyncIterable<UIStreamChunk>,
      guardrail: params.guardrail,
      replacement: (decision) =>
        createInputGuardrailBlockedUIStreamChunks(
          decision.message,
          params.responseMessageId,
        ) as UIStreamChunk[],
    }),
  ) as unknown as TStream;
}

export async function* gateIterableUntilSpeculativeInputPass<T>(params: {
  source: AsyncIterable<T>;
  guardrail: SpeculativeInputGuardrailRun;
  replacement: (decision: Extract<SpeculativeInputGuardrailDecision, { status: "blocked" }>) => T[];
}): AsyncIterable<T> {
  const immediateDecision = params.guardrail.getDecision();
  if (immediateDecision?.status === "passed") {
    yield* params.source;
    return;
  }
  if (immediateDecision?.status === "blocked") {
    yield* params.replacement(immediateDecision);
    return;
  }

  const iterator = params.source[Symbol.asyncIterator]();
  const buffered: T[] = [];
  let nextPromise = iterator.next();

  while (true) {
    const result = await Promise.race([
      nextPromise.then(
        (value) => ({ type: "chunk" as const, value }),
        (error) => ({ type: "source-error" as const, error }),
      ),
      params.guardrail.wait().then((decision) => ({ type: "decision" as const, decision })),
    ]);

    if (result.type === "decision") {
      if (result.decision.status === "blocked") {
        await iterator.return?.();
        yield* params.replacement(result.decision);
        return;
      }

      for (const item of buffered) {
        yield item;
      }
      yield* continueIterator(iterator, nextPromise);
      return;
    }

    if (result.type === "source-error") {
      const decision = params.guardrail.getDecision();
      if (decision?.status === "blocked") {
        yield* params.replacement(decision);
        return;
      }
      throw result.error;
    }

    if (result.value.done) {
      const decision = await params.guardrail.wait();
      if (decision.status === "blocked") {
        yield* params.replacement(decision);
        return;
      }
      for (const item of buffered) {
        yield item;
      }
      return;
    }

    buffered.push(result.value.value);
    nextPromise = iterator.next();
  }
}

export function createInputGuardrailBlockedFullStreamParts(
  message: string,
  responseMessageId?: string,
): VoltAgentTextStreamPart[] {
  const textId = "input-guardrail-blocked";
  return [
    {
      type: "start",
      ...(responseMessageId ? { messageId: responseMessageId } : {}),
    } as VoltAgentTextStreamPart,
    { type: "text-start", id: textId } as VoltAgentTextStreamPart,
    {
      type: "text-delta",
      id: textId,
      delta: message,
      text: message,
    } as VoltAgentTextStreamPart,
    { type: "text-end", id: textId } as VoltAgentTextStreamPart,
    {
      type: "finish",
      finishReason: "error",
    } as VoltAgentTextStreamPart,
  ];
}

export function createInputGuardrailBlockedUIStreamChunks(
  message: string,
  responseMessageId?: string,
): any[] {
  const textId = "input-guardrail-blocked";
  return [
    {
      type: "start",
      ...(responseMessageId ? { messageId: responseMessageId } : {}),
    },
    { type: "text-start", id: textId },
    { type: "text-delta", id: textId, delta: message },
    { type: "text-end", id: textId },
    { type: "finish" },
  ];
}

async function* continueIterator<T>(
  iterator: AsyncIterator<T>,
  firstNextPromise: Promise<IteratorResult<T>>,
): AsyncIterable<T> {
  let next = await firstNextPromise;
  while (!next.done) {
    yield next.value;
    next = await iterator.next();
  }
}

function iterableToStream<T>(iterable: AsyncIterable<T>): AsyncIterableStream<T> {
  return createAsyncIterableReadable<T>(async (controller) => {
    try {
      for await (const item of iterable) {
        controller.enqueue(item);
      }
      controller.close();
    } catch (error) {
      controller.error(error);
    }
  });
}
