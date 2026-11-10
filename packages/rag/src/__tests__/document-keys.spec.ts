import { describe, expect, it } from "vitest";
import { StructuredDocument } from "../document/document";

const documentIds = ["constructor", "__proto__", "toString", "hasOwnProperty", "document-1"];

describe("StructuredDocument link graph keys", () => {
  it.each(documentIds)("chunks a document with ID %s", (docId) => {
    const doc = new StructuredDocument([{ text: "Document content.", docId }]);

    const { chunks } = doc.chunk({ strategy: "token", maxTokens: 50 });
    const graph = doc.getLinkGraph();

    expect(chunks.length).toBeGreaterThan(0);
    expect(Object.keys(graph)).toEqual([docId]);
    expect(Object.getPrototypeOf(graph)).toBe(Object.prototype);
    expect(Object.hasOwn(graph, docId)).toBe(true);
    expect(graph[docId]).toEqual(chunks.map((chunk) => chunk.id));
    expect(chunks.every((chunk) => chunk.metadata?.docId === docId)).toBe(true);
  });

  it.each(documentIds)("returns manually added links for document ID %s", (docId) => {
    const doc = new StructuredDocument([{ text: "Document content.", docId }]);

    doc.addLink(docId, "first-related", "document");
    doc.addLink(docId, "second-related", "section");

    const graph = doc.getLinkGraph();
    expect(Object.keys(graph)).toEqual([docId]);
    expect(Object.getPrototypeOf(graph)).toBe(Object.prototype);
    expect(Object.hasOwn(graph, docId)).toBe(true);
    expect(graph[docId]).toEqual(["first-related", "second-related"]);
  });

  it("keeps an empty document graph empty", () => {
    const doc = new StructuredDocument([]);

    expect(doc.chunk({ strategy: "token" }).chunks).toEqual([]);
    expect(Object.keys(doc.getLinkGraph())).toEqual([]);
  });
});
