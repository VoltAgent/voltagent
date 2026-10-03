import { describe, expect, it } from "vitest";
import { computeRetryDelayMs, getRetryAfterMs, parseRetryAfter } from "./retry-after";

const MAX_RETRY_AFTER_MS = 5 * 60 * 1000;

describe("parseRetryAfter", () => {
  it("returns null for absent or empty values", () => {
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter(undefined)).toBeNull();
    expect(parseRetryAfter("")).toBeNull();
    expect(parseRetryAfter("   ")).toBeNull();
  });

  describe("delta-seconds form", () => {
    it("parses a non-negative integer number of seconds into milliseconds", () => {
      expect(parseRetryAfter("0")).toBe(0);
      expect(parseRetryAfter("1")).toBe(1000);
      expect(parseRetryAfter("120")).toBe(120_000);
    });

    it("clamps a very large delay to the maximum", () => {
      expect(parseRetryAfter("100000")).toBe(MAX_RETRY_AFTER_MS);
    });

    it("rejects negative and non-integer numeric-looking values", () => {
      expect(parseRetryAfter("-5")).toBeNull();
      expect(parseRetryAfter("1.5")).toBeNull();
      expect(parseRetryAfter("10ms")).toBeNull();
    });
  });

  describe("HTTP-date form", () => {
    const now = Date.parse("Wed, 21 Oct 2099 07:27:00 GMT");

    it("returns the delay until a future HTTP-date", () => {
      expect(parseRetryAfter("Wed, 21 Oct 2099 07:28:00 GMT", now)).toBe(60_000);
    });

    it("returns 0 for a date in the past", () => {
      expect(parseRetryAfter("Wed, 21 Oct 2015 07:28:00 GMT", now)).toBe(0);
    });

    it("clamps a far-future HTTP-date to the maximum", () => {
      expect(parseRetryAfter("Wed, 21 Oct 2099 09:27:00 GMT", now)).toBe(MAX_RETRY_AFTER_MS);
    });

    it("returns null for an unparseable date", () => {
      expect(parseRetryAfter("not-a-date", now)).toBeNull();
    });
  });
});

describe("getRetryAfterMs", () => {
  it("reads the Retry-After header off an error's responseHeaders", () => {
    expect(getRetryAfterMs({ responseHeaders: { "retry-after": "30" } })).toBe(30_000);
  });

  it("matches the header name case-insensitively", () => {
    expect(getRetryAfterMs({ responseHeaders: { "Retry-After": "30" } })).toBe(30_000);
  });

  it("returns null when the header or the bag is missing", () => {
    expect(getRetryAfterMs({ responseHeaders: { other: "x" } })).toBeNull();
    expect(getRetryAfterMs({})).toBeNull();
    expect(getRetryAfterMs(null)).toBeNull();
    expect(getRetryAfterMs(undefined)).toBeNull();
  });
});

describe("computeRetryDelayMs", () => {
  it("uses the exponential backoff floor when there is no Retry-After header", () => {
    expect(computeRetryDelayMs(null, 0)).toBe(1000);
    expect(computeRetryDelayMs(null, 3)).toBe(8000);
  });

  it("caps the exponential backoff at 10s", () => {
    expect(computeRetryDelayMs(null, 10)).toBe(10_000);
  });

  it("honors a larger server Retry-After hint over the exponential floor", () => {
    expect(computeRetryDelayMs({ responseHeaders: { "retry-after": "30" } }, 0)).toBe(30_000);
  });

  it("keeps the exponential floor when Retry-After is 0", () => {
    expect(computeRetryDelayMs({ responseHeaders: { "retry-after": "0" } }, 0)).toBe(1000);
  });
});
