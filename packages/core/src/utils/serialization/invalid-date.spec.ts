import { serializeValueForDebug } from "./index";

describe("serializeValueForDebug invalid dates", () => {
  it("keeps valid ISO date formatting", () => {
    expect(serializeValueForDebug(new Date("2026-10-17T00:00:00.000Z"))).toBe(
      "[Date: 2026-10-17T00:00:00.000Z]",
    );
  });

  it("does not throw on invalid dates", () => {
    expect(serializeValueForDebug(new Date(NaN))).toBe("[Date: Invalid Date]");
  });

  it("handles invalid dates inside arrays", () => {
    expect(serializeValueForDebug([new Date(NaN)])).toEqual([
      "[Date: Invalid Date]",
    ]);
  });
});
