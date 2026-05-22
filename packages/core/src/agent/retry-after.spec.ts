import { describe, expect, it } from "vitest";
import { computeRetryDelayMs, getRetryAfterMs, parseRetryAfter } from "./retry-after";

const FIXED_NOW = Date.parse("2026-05-14T20:00:00Z");

describe("parseRetryAfter", () => {
  it("returns null for missing values", () => {
    expect(parseRetryAfter(undefined)).toBeNull();
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter("")).toBeNull();
    expect(parseRetryAfter("   ")).toBeNull();
  });

  it("parses delta-seconds form", () => {
    expect(parseRetryAfter("0")).toBe(0);
    expect(parseRetryAfter("1")).toBe(1000);
    expect(parseRetryAfter("120")).toBe(120 * 1000);
    expect(parseRetryAfter("  30  ")).toBe(30 * 1000);
  });

  it("rejects non-integer delta-seconds forms", () => {
    expect(parseRetryAfter("1.5")).toBeNull();
    expect(parseRetryAfter("10ms")).toBeNull();
    expect(parseRetryAfter("-5")).toBeNull();
    expect(parseRetryAfter("0x10")).toBeNull();
  });

  it("parses HTTP-date form into a relative delay", () => {
    const fiveSecondsLater = new Date(FIXED_NOW + 5000).toUTCString();
    expect(parseRetryAfter(fiveSecondsLater, FIXED_NOW)).toBe(5000);
  });

  it("returns 0 when the HTTP-date has already passed", () => {
    const pastDate = new Date(FIXED_NOW - 60_000).toUTCString();
    expect(parseRetryAfter(pastDate, FIXED_NOW)).toBe(0);
  });

  it("returns null for malformed HTTP-date strings", () => {
    expect(parseRetryAfter("Definitely not a date")).toBeNull();
    expect(parseRetryAfter("Fri, 99 Foo 9999 99:99:99 GMT")).toBeNull();
  });

  it("clamps very large delta-seconds to the 5-minute safety cap", () => {
    expect(parseRetryAfter("3600")).toBe(5 * 60 * 1000);
    expect(parseRetryAfter("999999")).toBe(5 * 60 * 1000);
  });

  it("clamps very far-future HTTP-dates to the 5-minute safety cap", () => {
    const farFuture = new Date(FIXED_NOW + 60 * 60 * 1000).toUTCString();
    expect(parseRetryAfter(farFuture, FIXED_NOW)).toBe(5 * 60 * 1000);
  });
});

describe("getRetryAfterMs", () => {
  it("reads lowercased header from responseHeaders", () => {
    const err = { responseHeaders: { "retry-after": "10" } };
    expect(getRetryAfterMs(err)).toBe(10_000);
  });

  it("accepts the canonical-case spelling too", () => {
    const err = { responseHeaders: { "Retry-After": "10" } };
    expect(getRetryAfterMs(err)).toBe(10_000);
  });

  it("prefers lowercase over canonical when both are present", () => {
    const err = { responseHeaders: { "retry-after": "5", "Retry-After": "999" } };
    expect(getRetryAfterMs(err)).toBe(5_000);
  });

  it("matches the header name case-insensitively", () => {
    expect(getRetryAfterMs({ responseHeaders: { "Retry-after": "7" } })).toBe(7_000);
    expect(getRetryAfterMs({ responseHeaders: { "RETRY-AFTER": "8" } })).toBe(8_000);
    expect(getRetryAfterMs({ responseHeaders: { "rEtRy-AfTeR": "9" } })).toBe(9_000);
  });

  it("returns null when the header is absent", () => {
    expect(getRetryAfterMs({ responseHeaders: {} })).toBeNull();
    expect(getRetryAfterMs({ responseHeaders: { "x-foo": "bar" } })).toBeNull();
  });

  it("returns null when there are no response headers at all", () => {
    expect(getRetryAfterMs({})).toBeNull();
    expect(getRetryAfterMs(null)).toBeNull();
    expect(getRetryAfterMs(undefined)).toBeNull();
    expect(getRetryAfterMs(new Error("plain"))).toBeNull();
  });
});

describe("computeRetryDelayMs", () => {
  it("falls back to exponential when no Retry-After is provided", () => {
    const err = new Error("transient");
    expect(computeRetryDelayMs(err, 0)).toBe(1000);
    expect(computeRetryDelayMs(err, 1)).toBe(2000);
    expect(computeRetryDelayMs(err, 2)).toBe(4000);
    expect(computeRetryDelayMs(err, 3)).toBe(8000);
    expect(computeRetryDelayMs(err, 4)).toBe(10_000);
    expect(computeRetryDelayMs(err, 10)).toBe(10_000);
  });

  it("uses the server's Retry-After as a floor when it exceeds the exponential floor", () => {
    const err = { responseHeaders: { "retry-after": "30" } };
    expect(computeRetryDelayMs(err, 0)).toBe(30_000);
    expect(computeRetryDelayMs(err, 4)).toBe(30_000);
  });

  it("keeps the exponential floor when Retry-After is shorter", () => {
    const err = { responseHeaders: { "retry-after": "0" } };
    expect(computeRetryDelayMs(err, 0)).toBe(1000);
    expect(computeRetryDelayMs(err, 3)).toBe(8000);
  });

  it("honors HTTP-date Retry-After values", () => {
    const tenSecondsLater = new Date(FIXED_NOW + 10_000).toUTCString();
    const err = { responseHeaders: { "retry-after": tenSecondsLater } };
    expect(computeRetryDelayMs(err, 0, FIXED_NOW)).toBe(10_000);
  });

  it("respects the 5-minute safety cap even when the server asks for longer", () => {
    const err = { responseHeaders: { "retry-after": "999999" } };
    expect(computeRetryDelayMs(err, 0)).toBe(5 * 60 * 1000);
  });
});
