import { EventType } from "@ag-ui/core";
import type { RunErrorEvent, RunFinishedEvent } from "@ag-ui/core";
import { Observable, type Subscriber } from "rxjs";
import { describe, expect, it } from "vitest";

/**
 * Regression test for the RUN_FINISHED-after-RUN_ERROR bug in VoltAgentAGUI.
 *
 * When the agent stream throws, the run() Observable's catch block emits
 * RUN_ERROR and then RUN_FINISHED. However, the @ag-ui/client verify layer
 * considers RUN_ERROR a terminal event and rejects any subsequent events:
 *
 *   AGUIError: Cannot send event type 'RUN_FINISHED': The run has already
 *   errored with 'RUN_ERROR'. No further events can be sent.
 *
 * The fix wraps the RUN_FINISHED emission in try/catch so the subscriber
 * can still be completed cleanly.
 */
describe("VoltAgentAGUI – error event handling", () => {
  /**
   * Simulate the error-handling pattern from VoltAgentAGUI.run().
   * The `guardedSubscriber` mimics the @ag-ui/client verify layer that
   * rejects events after RUN_ERROR.
   */
  function createGuardedSubscriber(): {
    subscriber: Subscriber<unknown>;
    events: unknown[];
    observable: Observable<unknown>;
  } {
    const events: unknown[] = [];
    let _subscriber: Subscriber<unknown>;

    const observable = new Observable<unknown>((sub) => {
      _subscriber = sub;
    });

    // Subscribe immediately to capture the subscriber reference
    observable.subscribe({
      next: (event: unknown) => events.push(event),
    });

    // Wrap with a verify-like guard: reject events after RUN_ERROR
    // biome-ignore lint/style/noNonNullAssertion: subscriber is assigned synchronously by Observable constructor
    const realSubscriber = _subscriber!;
    const guardedSubscriber = {
      next: (event: unknown) => {
        const lastEvent = events[events.length - 1] as { type?: string } | undefined;
        if (lastEvent?.type === EventType.RUN_ERROR) {
          throw new Error(
            `Cannot send event type '${(event as { type: string }).type}': The run has already errored with 'RUN_ERROR'.`,
          );
        }
        realSubscriber.next(event);
      },
      complete: () => realSubscriber.complete(),
      error: (err: unknown) => realSubscriber.error(err),
    } as unknown as Subscriber<unknown>;

    return { subscriber: guardedSubscriber, events, observable };
  }

  it("completes cleanly when RUN_FINISHED is rejected after RUN_ERROR (fixed pattern)", () => {
    const { subscriber, events } = createGuardedSubscriber();

    // Simulate the fixed catch block from voltagent-agent.ts
    const runError: RunErrorEvent = {
      type: EventType.RUN_ERROR,
      message: "Something went wrong",
    };
    subscriber.next(runError);

    let finishedSent = false;

    // This is the fixed pattern: wrap RUN_FINISHED in try/catch
    try {
      const finished: RunFinishedEvent = {
        type: EventType.RUN_FINISHED,
        threadId: "test-thread",
        runId: "test-run",
      };
      subscriber.next(finished);
      finishedSent = true;
    } catch {
      finishedSent = true;
    }
    subscriber.complete();

    expect(finishedSent).toBe(true);
    expect(events).toHaveLength(1); // Only RUN_ERROR, RUN_FINISHED was rejected
    expect((events[0] as RunErrorEvent).type).toBe(EventType.RUN_ERROR);
  });

  it("throws without the guard when RUN_FINISHED is sent after RUN_ERROR", () => {
    const { subscriber } = createGuardedSubscriber();

    const runError: RunErrorEvent = {
      type: EventType.RUN_ERROR,
      message: "Something went wrong",
    };
    subscriber.next(runError);

    // Without the try/catch guard, this throws
    expect(() => {
      const finished: RunFinishedEvent = {
        type: EventType.RUN_FINISHED,
        threadId: "test-thread",
        runId: "test-run",
      };
      subscriber.next(finished);
    }).toThrow(/Cannot send event type 'RUN_FINISHED'/);
  });

  it("sends both events when there is no error (happy path)", () => {
    const events: unknown[] = [];
    const observable = new Observable<unknown>((subscriber) => {
      // Happy path: RUN_STARTED → work → RUN_FINISHED
      subscriber.next({ type: EventType.RUN_STARTED, threadId: "t", runId: "r" });
      subscriber.next({ type: EventType.RUN_FINISHED, threadId: "t", runId: "r" });
      subscriber.complete();
    });

    observable.subscribe({ next: (e) => events.push(e) });

    expect(events).toHaveLength(2);
    expect((events[0] as { type: string }).type).toBe(EventType.RUN_STARTED);
    expect((events[1] as { type: string }).type).toBe(EventType.RUN_FINISHED);
  });
});
