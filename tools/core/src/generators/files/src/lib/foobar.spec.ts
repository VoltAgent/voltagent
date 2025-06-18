import { describe, expect, expectTypeOf, it } from "vitest";
import { foobar } from "./foobar";

describe("foobar", () => {
  it("should return foobar", () => {
    expect(foobar()).toBe("foobar");
  });

  it("should return a string", () => {
    expectTypeOf(foobar()).toBeString();
  });
});
