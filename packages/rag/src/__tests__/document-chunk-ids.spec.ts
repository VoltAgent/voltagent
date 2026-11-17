import { describe, expect, it } from "vitest";
import { StructuredDocument } from "../index";

const documents = [
  { docId: "policy", text: "Refunds are available within thirty days. Contact support for help." },
  { docId: "guide", text: "Keep your receipt. Provide the order number when requesting a refund." },
];

describe("StructuredDocument chunk identity", () => {
  it.each(["token", "recursive", "markdown"] as const)(
    "keeps chunks from different documents distinct with %s",
    (strategy) => {
      const doc = new StructuredDocument(documents);
      const { chunks } = doc.chunk({ strategy, maxTokens: 5 });
      const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]));

      expect(chunks.length).toBeGreaterThan(documents.length);
      expect(byId.size).toBe(chunks.length);
      for (const { docId } of documents) {
        const ownChunks = chunks.filter((chunk) => chunk.metadata?.docId === docId);
        expect(ownChunks.length).toBeGreaterThan(1);
        expect(doc.getLinkGraph()[docId]).toEqual(ownChunks.map((chunk) => chunk.id));
        for (const chunk of ownChunks) {
          expect(byId.get(chunk.id)?.metadata?.docId).toBe(docId);
          expect(byId.get(chunk.id)?.content).toBe(chunk.content);
        }
      }
    },
  );

  it("uses generated document identities when no docId is supplied", () => {
    const doc = new StructuredDocument(documents.map(({ text }) => ({ text })));
    const { chunks } = doc.chunk({ strategy: "token", maxTokens: 100 });

    expect(new Set(chunks.map((chunk) => chunk.id)).size).toBe(2);
    for (const node of doc.getNodes()) {
      const ownChunk = chunks.find((chunk) => chunk.metadata?.docId === node.id);
      expect(ownChunk).toBeDefined();
      expect(doc.getLinkGraph()[node.id]).toEqual([ownChunk?.id]);
    }
  });

  it("keeps IDs stable for an unchanged document and preserves chunk contents", () => {
    const doc = new StructuredDocument([documents[0]]);
    const first = doc.chunk({ strategy: "token", maxTokens: 100 }).chunks;
    const second = doc.chunk({ strategy: "token", maxTokens: 100 }).chunks;

    expect(second.map((chunk) => chunk.id)).toEqual(first.map((chunk) => chunk.id));
    expect(first.map((chunk) => chunk.content)).toEqual([documents[0].text]);
    expect(first[0]?.metadata?.docId).toBe("policy");
  });

  it("keeps chunks distinct even when callers repeat an explicit document ID", () => {
    const doc = new StructuredDocument(
      documents.map((document) => ({ ...document, docId: "shared" })),
    );
    const { chunks } = doc.chunk({ strategy: "token", maxTokens: 100 });

    expect(new Set(chunks.map((chunk) => chunk.id)).size).toBe(2);
    expect(chunks.map((chunk) => chunk.content)).toEqual(
      documents.map((document) => document.text),
    );
    expect(new Set(doc.getLinkGraph().shared)).toEqual(new Set(chunks.map((chunk) => chunk.id)));
  });

  it("keeps empty input empty", () => {
    const doc = new StructuredDocument([]);
    expect(doc.chunk({ strategy: "token" }).chunks).toEqual([]);
    expect(doc.getLinkGraph()).toEqual({});
  });
});
