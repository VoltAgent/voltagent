import { describe, expect, it } from "vitest";
import { StructuredDocument } from "../document/document";

describe("StructuredDocument keyword frequencies", () => {
  it.each(["constructor", "CONSTRUCTOR"])("counts the word %s without inherited values", (word) => {
    const doc = StructuredDocument.fromText(
      `alpha beta gamma delta epsilon ${word} ${word} ${word}`,
    );

    doc.extract({ keywords: true });

    expect(doc.getNodes()[0]?.metadata?.keywords).toEqual([
      "constructor",
      "alpha",
      "beta",
      "gamma",
      "delta",
    ]);
  });

  it("counts inherited-property names across document nodes", () => {
    const doc = new StructuredDocument([
      { text: "alpha beta constructor", docId: "first" },
      { text: "constructor constructor", docId: "second" },
    ]);

    doc.extract({ keywords: true });

    for (const node of doc.getNodes()) {
      expect(node.metadata?.keywords).toEqual(["constructor", "alpha", "beta"]);
    }
  });

  it("keeps frequency ranking and encounter order for ordinary words", () => {
    const doc = StructuredDocument.fromText("alpha beta beta gamma");

    doc.extract({ keywords: true });

    expect(doc.getNodes()[0]?.metadata?.keywords).toEqual(["beta", "alpha", "gamma"]);
  });

  it("returns no keywords for text without matching words", () => {
    const doc = StructuredDocument.fromText("123 !");

    doc.extract({ keywords: true });

    expect(doc.getNodes()[0]?.metadata?.keywords).toEqual([]);
  });
});
