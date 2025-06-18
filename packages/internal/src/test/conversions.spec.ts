import { describe, expect, it } from "vitest";
import {
  convertArrayToAsyncIterable,
  convertArrayToReadableStream,
  convertAsyncIterableToArray,
  convertReadableStreamToArray,
  convertResponseStreamToArray,
} from "./conversions";

describe("convertReadableStreamToArray", () => {
  it("should convert a readable stream with multiple values to an array", async () => {
    const values = ["a", "b", "c"];
    const stream = new ReadableStream({
      start(controller) {
        values.forEach((value) => controller.enqueue(value));
        controller.close();
      },
    });

    const result = await convertReadableStreamToArray(stream);
    expect(result).toEqual(values);
  });

  it("should convert an empty readable stream to an empty array", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.close();
      },
    });

    const result = await convertReadableStreamToArray(stream);
    expect(result).toEqual([]);
  });

  it("should convert a readable stream with a single value to an array", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue("single");
        controller.close();
      },
    });

    const result = await convertReadableStreamToArray(stream);
    expect(result).toEqual(["single"]);
  });

  it("should handle objects in the stream", async () => {
    const objects = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const stream = new ReadableStream({
      start(controller) {
        objects.forEach((obj) => controller.enqueue(obj));
        controller.close();
      },
    });

    const result = await convertReadableStreamToArray(stream);
    expect(result).toEqual(objects);
  });

  it("should handle numbers in the stream", async () => {
    const numbers = [1, 2, 3, 4, 5];
    const stream = new ReadableStream({
      start(controller) {
        numbers.forEach((num) => controller.enqueue(num));
        controller.close();
      },
    });

    const result = await convertReadableStreamToArray(stream);
    expect(result).toEqual(numbers);
  });
});

describe("convertArrayToAsyncIterable", () => {
  it("should convert an array with multiple values to an async iterable", async () => {
    const values = ["a", "b", "c"];
    const iterable = convertArrayToAsyncIterable(values);
    const result: string[] = [];

    for await (const value of iterable) {
      result.push(value);
    }

    expect(result).toEqual(values);
  });

  it("should convert an empty array to an empty async iterable", async () => {
    const iterable = convertArrayToAsyncIterable([]);
    const result: string[] = [];

    for await (const value of iterable) {
      result.push(value);
    }

    expect(result).toEqual([]);
  });

  it("should convert an array with a single value to an async iterable", async () => {
    const iterable = convertArrayToAsyncIterable(["single"]);
    const result: string[] = [];

    for await (const value of iterable) {
      result.push(value);
    }

    expect(result).toEqual(["single"]);
  });

  it("should handle objects in the array", async () => {
    const objects = [{ id: 1 }, { id: 2 }];
    const iterable = convertArrayToAsyncIterable(objects);
    const result: any[] = [];

    for await (const value of iterable) {
      result.push(value);
    }

    expect(result).toEqual(objects);
  });

  it("should handle numbers in the array", async () => {
    const numbers = [1, 2, 3, 4, 5];
    const iterable = convertArrayToAsyncIterable(numbers);
    const result: number[] = [];

    for await (const value of iterable) {
      result.push(value);
    }

    expect(result).toEqual(numbers);
  });
});

describe("convertAsyncIterableToArray", () => {
  it("should convert an async iterable with multiple values to an array", async () => {
    const values = ["a", "b", "c"];
    const iterable = convertArrayToAsyncIterable(values);

    const result = await convertAsyncIterableToArray(iterable);
    expect(result).toEqual(values);
  });

  it("should convert an empty async iterable to an empty array", async () => {
    const iterable = convertArrayToAsyncIterable([]);

    const result = await convertAsyncIterableToArray(iterable);
    expect(result).toEqual([]);
  });

  it("should convert an async iterable with a single value to an array", async () => {
    const iterable = convertArrayToAsyncIterable(["single"]);

    const result = await convertAsyncIterableToArray(iterable);
    expect(result).toEqual(["single"]);
  });

  it("should handle objects in the async iterable", async () => {
    const objects = [{ id: 1 }, { id: 2 }];
    const iterable = convertArrayToAsyncIterable(objects);

    const result = await convertAsyncIterableToArray(iterable);
    expect(result).toEqual(objects);
  });

  it("should handle numbers in the async iterable", async () => {
    const numbers = [1, 2, 3, 4, 5];
    const iterable = convertArrayToAsyncIterable(numbers);

    const result = await convertAsyncIterableToArray(iterable);
    expect(result).toEqual(numbers);
  });

  it("should work with a custom async iterable", async () => {
    const customIterable: AsyncIterable<number> = {
      async *[Symbol.asyncIterator]() {
        yield 1;
        yield 2;
        yield 3;
      },
    };

    const result = await convertAsyncIterableToArray(customIterable);
    expect(result).toEqual([1, 2, 3]);
  });
});

describe("convertArrayToReadableStream", () => {
  it("should convert an array with multiple values to a readable stream", async () => {
    const values = ["a", "b", "c"];
    const stream = convertArrayToReadableStream(values);

    const result = await convertReadableStreamToArray(stream);
    expect(result).toEqual(values);
  });

  it("should convert an empty array to an empty readable stream", async () => {
    const stream = convertArrayToReadableStream([]);

    const result = await convertReadableStreamToArray(stream);
    expect(result).toEqual([]);
  });

  it("should convert an array with a single value to a readable stream", async () => {
    const stream = convertArrayToReadableStream(["single"]);

    const result = await convertReadableStreamToArray(stream);
    expect(result).toEqual(["single"]);
  });

  it("should handle objects in the array", async () => {
    const objects = [{ id: 1 }, { id: 2 }];
    const stream = convertArrayToReadableStream(objects);

    const result = await convertReadableStreamToArray(stream);
    expect(result).toEqual(objects);
  });

  it("should handle numbers in the array", async () => {
    const numbers = [1, 2, 3, 4, 5];
    const stream = convertArrayToReadableStream(numbers);

    const result = await convertReadableStreamToArray(stream);
    expect(result).toEqual(numbers);
  });

  it("should properly close the stream after enqueuing all values", async () => {
    const values = ["a", "b", "c"];
    const stream = convertArrayToReadableStream(values);
    const reader = stream.getReader();
    const result: string[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result.push(value);
    }

    expect(result).toEqual(values);
  });
});

describe("convertResponseStreamToArray", () => {
  it("should convert a response stream with text content to an array of strings", async () => {
    const textContent = "Hello\nWorld\nTest";
    const response = new Response(textContent);

    const result = await convertResponseStreamToArray(response);
    expect(result).toEqual(["Hello\nWorld\nTest"]);
  });

  it("should convert a response stream with multiple chunks to an array", async () => {
    const chunks = ["Hello", " ", "World", "!"];
    const stream = new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(new TextEncoder().encode(chunk)));
        controller.close();
      },
    });
    const response = new Response(stream);

    const result = await convertResponseStreamToArray(response);
    expect(result).toEqual(chunks);
  });

  it("should handle an empty response stream", async () => {
    const response = new Response("");

    const result = await convertResponseStreamToArray(response);
    expect(result).toEqual([]);
  });

  it("should handle a response with special characters", async () => {
    const textContent = "Hello\nWorld\nTest\nWith\nNewlines";
    const response = new Response(textContent);

    const result = await convertResponseStreamToArray(response);
    expect(result).toEqual(["Hello\nWorld\nTest\nWith\nNewlines"]);
  });

  it("should handle a response with unicode characters", async () => {
    const textContent = "Hello 🌍 World 🚀 Test";
    const response = new Response(textContent);

    const result = await convertResponseStreamToArray(response);
    expect(result).toEqual(["Hello 🌍 World 🚀 Test"]);
  });

  it("should handle a response with large content", async () => {
    const largeContent = "x".repeat(10000);
    const response = new Response(largeContent);

    const result = await convertResponseStreamToArray(response);
    expect(result).toEqual([largeContent]);
  });
});

describe("Integration tests", () => {
  it("should work with the full conversion chain: array -> stream -> array", async () => {
    const originalValues = ["a", "b", "c", "d"];

    // Array -> Stream
    const stream = convertArrayToReadableStream(originalValues);

    // Stream -> Array
    const result = await convertReadableStreamToArray(stream);

    expect(result).toEqual(originalValues);
  });

  it("should work with the full conversion chain: array -> async iterable -> array", async () => {
    const originalValues = [1, 2, 3, 4, 5];

    // Array -> Async Iterable
    const iterable = convertArrayToAsyncIterable(originalValues);

    // Async Iterable -> Array
    const result = await convertAsyncIterableToArray(iterable);

    expect(result).toEqual(originalValues);
  });

  it("should work with the full conversion chain: array -> stream -> async iterable -> array", async () => {
    const originalValues = [{ id: 1 }, { id: 2 }, { id: 3 }];

    // Array -> Stream
    const stream = convertArrayToReadableStream(originalValues);

    // Stream -> Array
    const arrayFromStream = await convertReadableStreamToArray(stream);

    // Array -> Async Iterable
    const iterable = convertArrayToAsyncIterable(arrayFromStream);

    // Async Iterable -> Array
    const result = await convertAsyncIterableToArray(iterable);

    expect(result).toEqual(originalValues);
  });
});
