import { describe, expect, it } from "vitest";
import {
  convertArrayToReadableStream,
  convertAsyncIterableToArray,
  convertReadableStreamToArray,
} from "../test";
import { createAsyncIterableStream } from "./async-iterable-stream";

describe("createAsyncIterableStream()", () => {
  it("should read all chunks from a non-empty stream using async iteration", async () => {
    const testData = ["Hello", "World", "Stream"];

    const source = convertArrayToReadableStream(testData);
    const asyncIterableStream = createAsyncIterableStream(source);

    expect(await convertAsyncIterableToArray(asyncIterableStream)).toEqual(testData);
  });

  it("should handle an empty stream gracefully", async () => {
    const source = convertArrayToReadableStream<string>([]);
    const asyncIterableStream = createAsyncIterableStream(source);

    expect(await convertAsyncIterableToArray(asyncIterableStream)).toEqual([]);
  });

  it("should maintain ReadableStream functionality", async () => {
    const testData = ["Hello", "World"];

    const source = convertArrayToReadableStream(testData);
    const asyncIterableStream = createAsyncIterableStream(source);

    expect(await convertReadableStreamToArray(asyncIterableStream)).toEqual(testData);
  });

  it("should cancel the source stream when async iteration stops early", async () => {
    let cancelled = false;
    const source = new ReadableStream<number>({
      start(controller) {
        controller.enqueue(1);
        controller.enqueue(2);
        controller.enqueue(3);
      },
      cancel() {
        cancelled = true;
      },
    });

    const asyncIterableStream = createAsyncIterableStream(source);

    for await (const _chunk of asyncIterableStream) {
      break; // stop after the first chunk
    }

    expect(cancelled).toBe(true);
  });
});
