import { topKSimilar } from "./vector-math";

describe("topKSimilar k validation", () => {
  const query = [1, 0];
  const targets = [
    { id: "first", vector: [1, 0] },
    { id: "second", vector: [0, 1] },
    { id: "third", vector: [-1, 0] },
  ];

  it("preserves ordinary top-k retrieval", () => {
    expect(topKSimilar(query, targets, 2).map(({ id }) => id)).toEqual([
      "first",
      "second",
    ]);
    expect(topKSimilar(query, targets, 0)).toEqual([]);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid k=%s instead of silently returning an arbitrary slice",
    (k) => {
      expect(() => topKSimilar(query, targets, k)).toThrow(RangeError);
    },
  );
});
