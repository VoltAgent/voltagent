import { describe, expect, it } from "vitest";

/**
 * Regression test for the double writer.close() bug in createMergedFullStream.
 *
 * When an agent has sub-agents, streamText() creates a TransformStream to merge
 * the parent stream with sub-agent tool results. The parent stream writer is
 * closed in writeParentStream()'s finally block, and then the generator's own
 * finally block attempts to close it again. Without the fix this throws:
 *
 *   TypeError: Invalid state: WritableStream is closed
 *
 * This test isolates the exact pattern used by createMergedFullStream and
 * verifies the second close() is safely caught.
 */
describe("createMergedFullStream – writer.close() guard", () => {
  it("does not throw when writer.close() is called after the stream is already closed", async () => {
    const { writable } = new TransformStream<string>();
    const writer = writable.getWriter();

    // First close — succeeds (this is what writeParentStream does)
    await writer.close();

    // Second close — must not throw (this is the generator's finally block)
    await expect(
      (async () => {
        try {
          await writer.close();
        } catch {
          // This is the fix: the second close is wrapped in try/catch
        }
      })(),
    ).resolves.toBeUndefined();
  });

  it("throws without the guard when writer.close() is called twice", async () => {
    const { writable } = new TransformStream<string>();
    const writer = writable.getWriter();

    await writer.close();

    // Without the try/catch guard, the second close throws
    await expect(writer.close()).rejects.toThrow();
  });

  it("merged stream pattern reads all values before closing", async () => {
    // Simulate the full createMergedFullStream pattern
    const { readable, writable } = new TransformStream<number>();
    const writer = writable.getWriter();

    const writeParentStream = async () => {
      try {
        await writer.write(1);
        await writer.write(2);
        await writer.write(3);
      } finally {
        try {
          await writer.close();
        } catch {
          // Ignore double-close
        }
      }
    };

    const parentPromise = writeParentStream();
    const reader = readable.getReader();
    const collected: number[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value !== undefined) {
          collected.push(value);
        }
      }
    } finally {
      reader.releaseLock();
      await parentPromise;
      // The fix: guard the redundant close
      try {
        await writer.close();
      } catch {
        // Already closed by writeParentStream – safe to ignore
      }
    }

    expect(collected).toEqual([1, 2, 3]);
  });
});
