import { describe, expect, it } from "vitest";
import { safeStringify } from "./safe-stringify";

const options = {
  indentation: "\t",
};

describe("safe-stringify", () => {
  it("main", () => {
    const fixture = {
      a: true,
      b: {
        c: 1,
      },
    };

    expect(safeStringify(fixture, options)).toBe(JSON.stringify(fixture, undefined, "\t"));
  });

  it("circular object", () => {
    const fixture = {
      a: true,
    };

    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.b = fixture;

    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.c = [fixture, fixture.b];

    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.d = {
      // @ts-expect-error - ignore as this is needed to handle circular references
      e: fixture.c,
    };

    expect(safeStringify(fixture, options)).toMatchSnapshot();
  });

  it("circular object 2", () => {
    const fixture2 = {
      c: true,
    };

    const fixture = {
      a: fixture2,
      b: fixture2,
    };

    expect(safeStringify(fixture, options)).toMatchSnapshot();
  });

  it("circular array", () => {
    const fixture = [1];

    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.push(fixture, fixture);

    expect(safeStringify(fixture, options)).toMatchSnapshot();
  });

  it("multiple circular objects in array", () => {
    const fixture = {
      a: true,
    };

    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.b = fixture;

    expect(safeStringify([fixture, fixture], options)).toMatchSnapshot();
  });

  it("multiple circular objects in object", () => {
    const fixture = {
      a: true,
    };

    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.b = fixture;

    expect(safeStringify({ x: fixture, y: fixture }, options)).toMatchSnapshot();
  });

  it("nested non-circular object", () => {
    const fixture = {
      a: {
        b: {
          c: {
            d: 1,
          },
        },
      },
    };

    expect(safeStringify(fixture, options)).toBe(JSON.stringify(fixture, undefined, "\t"));
  });

  it("nested circular object", () => {
    const fixture = {
      a: {
        b: {
          c: {},
        },
      },
    };

    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.a.b.c.d = fixture.a;

    expect(safeStringify(fixture, options)).toMatchSnapshot();
  });

  it("complex object with circular and non-circular references", () => {
    const shared = { x: 1 };
    const circular = { y: 2 };
    // @ts-expect-error - ignore as this is needed to handle circular references
    circular.self = circular;

    const fixture = {
      a: shared,
      b: {
        c: shared,
        d: circular,
      },
      e: circular,
    };

    expect(safeStringify(fixture, options)).toMatchSnapshot();
  });

  it("object with circular references at different depths", () => {
    const fixture = {
      a: {
        b: {
          c: {},
        },
      },
    };

    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.a.b.c.d = fixture.a;
    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.a.b.c.e = fixture.a.b;

    expect(safeStringify(fixture, options)).toMatchSnapshot();
  });

  it("object with value as a circular reference", () => {
    const fixture = {
      a: 1,
      b: 2,
    };

    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.self = fixture;

    expect(safeStringify(fixture, options)).toMatchSnapshot();
  });

  it("empty object", () => {
    const fixture = {};

    expect(safeStringify(fixture, options)).toBe(JSON.stringify(fixture, undefined, "\t"));
  });

  it("object with null value", () => {
    const fixture = {
      a: null,
    };

    expect(safeStringify(fixture, options)).toBe(JSON.stringify(fixture, undefined, "\t"));
  });

  it("object with undefined value", () => {
    const fixture = {
      a: undefined,
    };

    expect(safeStringify(fixture, options)).toBe(JSON.stringify(fixture, undefined, "\t"));
  });

  it("circular object with multiple nested circular references", () => {
    const fixture = {
      a: {
        b: {
          c: {},
        },
      },
    };

    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.a.b.c.d = fixture.a;
    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.a.b.c.e = fixture.a.b;
    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.a.b.c.f = fixture.a.b.c;

    expect(safeStringify(fixture, options)).toMatchSnapshot();
  });

  it("circular array with nested circular arrays", () => {
    const fixture = [[1, 2, 3]];

    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.push(fixture, [fixture, fixture]);

    expect(safeStringify(fixture, options)).toMatchSnapshot();
  });

  it("object with circular reference to parent and grandparent", () => {
    const fixture = {
      a: {
        b: {
          c: {},
        },
      },
    };

    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.a.b.c.parent = fixture.a.b;
    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.a.b.c.grandparent = fixture.a;

    expect(safeStringify(fixture, options)).toMatchSnapshot();
  });

  it("array containing objects with the same circular reference", () => {
    const circular = { a: 1 };
    // @ts-expect-error - ignore as this is needed to handle circular references
    circular.self = circular;

    const fixture = [
      { b: 2, c: circular },
      { d: 3, e: circular },
    ];

    expect(safeStringify(fixture, options)).toMatchSnapshot();
  });

  it("Date object", () => {
    const fixture = {
      date: new Date("2024-06-12T16:06:46.442Z"),
    };

    expect(safeStringify(fixture, options)).toBe(JSON.stringify(fixture, undefined, "\t"));
  });

  it("object with toJSON method", () => {
    const fixture = {
      a: 1,
      toJSON() {
        return { b: 2 };
      },
    };

    expect(safeStringify(fixture, options)).toBe(JSON.stringify(fixture, undefined, "\t"));
  });

  it("complex object with Date and toJSON", () => {
    const fixture = {
      date: new Date("2024-06-12T16:06:46.442Z"),
      nested: {
        toJSON() {
          return { b: 2 };
        },
      },
    };

    expect(safeStringify(fixture, options)).toBe(JSON.stringify(fixture, undefined, "\t"));
  });

  it("circular object with Date", () => {
    const fixture = {
      date: new Date("2024-06-12T16:06:46.442Z"),
    };

    // @ts-expect-error - ignore as this is needed to handle circular references
    fixture.self = fixture;

    const expected = JSON.stringify(
      { date: "2024-06-12T16:06:46.442Z", self: "[Circular]" },
      undefined,
      "\t",
    );
    expect(safeStringify(fixture, options)).toBe(expected);
  });

  it("nested toJSON methods", () => {
    const fixture = {
      a: {
        toJSON() {
          return { b: 2 };
        },
      },
      b: {
        toJSON() {
          return { c: 3 };
        },
      },
    };

    expect(safeStringify(fixture, options)).toBe(JSON.stringify(fixture, undefined, "\t"));
  });

  it("toJSON method returning circular object", () => {
    const fixture = {
      a: 1,
      toJSON() {
        const x = { b: 2 };
        // @ts-expect-error - ignore as this is needed to handle circular references
        x.self = x;
        return x;
      },
    };

    const expected = JSON.stringify({ b: 2, self: "[Circular]" }, undefined, "\t");
    expect(safeStringify(fixture, options)).toBe(expected);
  });

  it("array with objects having toJSON methods", () => {
    const fixture = [
      {
        toJSON() {
          return { a: 1 };
        },
      },
      {
        toJSON() {
          return { b: 2 };
        },
      },
    ];

    expect(safeStringify(fixture, options)).toBe(JSON.stringify(fixture, undefined, "\t"));
  });

  it("array with Date objects and toJSON methods", () => {
    const fixture = [
      new Date("2024-06-12T16:06:46.442Z"),
      {
        toJSON() {
          return { b: 2 };
        },
      },
    ];

    expect(safeStringify(fixture, options)).toBe(JSON.stringify(fixture, undefined, "\t"));
  });

  it("complex object with circular references and toJSON", () => {
    const shared = {
      x: 1,
      toJSON() {
        return {
          x: this.x,
        };
      },
    };

    const circular = {
      y: 2,
      toJSON() {
        return {
          y: this.y,
          self: "[Circular]",
        };
      },
    };

    // @ts-expect-error - ignore as this is needed to handle circular references
    circular.self = circular;

    const fixture = {
      a: shared,
      b: {
        c: shared,
        d: circular,
      },
      e: circular,
    };

    const expected = JSON.stringify(
      {
        a: {
          x: 1,
        },
        b: {
          c: {
            x: 1,
          },
          d: {
            y: 2,
            self: "[Circular]",
          },
        },
        e: {
          y: 2,
          self: "[Circular]",
        },
      },
      undefined,
      "\t",
    );

    expect(safeStringify(fixture, options)).toBe(expected);
  });
});
