import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import type { BaseMessage, MessageContent } from "../agent/providers/base/types";
import {
  MessageContentBuilder,
  addTimestampToMessage,
  appendToMessage,
  extractFileParts,
  extractImageParts,
  extractText,
  extractTextParts,
  filterContentParts,
  getContentLength,
  hasContent,
  hasFilePart,
  hasImagePart,
  hasTextPart,
  isStructuredContent,
  isTextContent,
  mapMessageContent,
  messageHelpers,
  normalizeContent,
  normalizeToArray,
  prependToMessage,
  transformTextContent,
} from "./message-helpers";

describe("Message Helpers", () => {
  describe("Type Guards", () => {
    it("should identify text content", () => {
      expect(isTextContent("hello")).toBe(true);
      expect(isTextContent([])).toBe(false);
      expect(isTextContent([{ type: "text", text: "hello" }])).toBe(false);
    });

    it("should identify structured content", () => {
      expect(isStructuredContent([])).toBe(true);
      expect(isStructuredContent([{ type: "text", text: "hello" }])).toBe(true);
      expect(isStructuredContent("hello")).toBe(false);
    });

    it("should check for text parts", () => {
      expect(hasTextPart("hello")).toBe(true);
      expect(hasTextPart([{ type: "text", text: "hello" }])).toBe(true);
      expect(hasTextPart([{ type: "image", image: "data" }])).toBe(false);
      expect(hasTextPart([])).toBe(false);
    });

    it("should check for image parts", () => {
      expect(hasImagePart("hello")).toBe(false);
      expect(hasImagePart([{ type: "image", image: "data" }])).toBe(true);
      expect(hasImagePart([{ type: "text", text: "hello" }])).toBe(false);
    });

    it("should check for file parts", () => {
      expect(hasFilePart("hello")).toBe(false);
      expect(hasFilePart([{ type: "file", data: "filedata", mimeType: "text/plain" }])).toBe(true);
      expect(hasFilePart([{ type: "text", text: "hello" }])).toBe(false);
    });
  });

  describe("Extractors", () => {
    it("should extract text from string content", () => {
      expect(extractText("hello world")).toBe("hello world");
    });

    it("should extract text from structured content", () => {
      const content: MessageContent = [
        { type: "text", text: "hello " },
        { type: "text", text: "world" },
        { type: "image", image: "data" },
      ];
      expect(extractText(content)).toBe("hello world");
    });

    it("should extract text parts", () => {
      const content: MessageContent = [
        { type: "text", text: "hello" },
        { type: "image", image: "data" },
        { type: "text", text: "world" },
      ];
      const textParts = extractTextParts(content);
      expect(textParts).toHaveLength(2);
      expect(textParts[0]).toEqual({ type: "text", text: "hello" });
      expect(textParts[1]).toEqual({ type: "text", text: "world" });
    });

    it("should extract image parts", () => {
      const content: MessageContent = [
        { type: "text", text: "hello" },
        { type: "image", image: "data1" },
        { type: "image", image: "data2" },
      ];
      const imageParts = extractImageParts(content);
      expect(imageParts).toHaveLength(2);
      expect(imageParts[0]).toEqual({ type: "image", image: "data1" });
    });

    it("should extract file parts", () => {
      const content: MessageContent = [
        { type: "text", text: "hello" },
        { type: "file", data: "filedata1", mimeType: "text/plain" },
        { type: "file", data: "filedata2", mimeType: "image/png" },
      ];
      const fileParts = extractFileParts(content);
      expect(fileParts).toHaveLength(2);
      expect(fileParts[0]).toEqual({ type: "file", data: "filedata1", mimeType: "text/plain" });
    });
  });

  describe("Transformers", () => {
    it("should transform text content", () => {
      const result = transformTextContent("hello", (text) => text.toUpperCase());
      expect(result).toBe("HELLO");
    });

    it("should transform text in structured content", () => {
      const content: MessageContent = [
        { type: "text", text: "hello" },
        { type: "image", image: "data" },
        { type: "text", text: "world" },
      ];
      const result = transformTextContent(content, (text) => text.toUpperCase());
      expect(result).toEqual([
        { type: "text", text: "HELLO" },
        { type: "image", image: "data" },
        { type: "text", text: "WORLD" },
      ]);
    });

    it("should map message content", () => {
      const message: UIMessage = {
        id: "m-map",
        role: "user",
        parts: [
          { type: "text", text: "hello" },
          { type: "image", image: "data" } as any,
          { type: "text", text: "world" },
        ],
        metadata: {},
      } as UIMessage;
      const result = mapMessageContent(message, (text) => text.toUpperCase());
      const parts = result.parts as any[];
      expect(parts[0].text).toBe("HELLO");
      expect(parts[1]).toMatchObject({ type: "image", image: "data" });
      expect(parts[2].text).toBe("WORLD");
    });

    it("should filter content parts", () => {
      const content: MessageContent = [
        { type: "text", text: "hello" },
        { type: "image", image: "data" },
        { type: "text", text: "world" },
      ];
      const result = filterContentParts(content, (part) => part.type === "text");
      expect(result).toEqual([
        { type: "text", text: "hello" },
        { type: "text", text: "world" },
      ]);
    });
  });

  describe("Normalizers", () => {
    it("should normalize to array", () => {
      expect(normalizeToArray("hello")).toEqual([{ type: "text", text: "hello" }]);
      expect(normalizeToArray([{ type: "text", text: "hello" }])).toEqual([
        { type: "text", text: "hello" },
      ]);
    });

    it("should normalize content to compact form", () => {
      expect(normalizeContent([])).toBe("");
      expect(normalizeContent([{ type: "text", text: "hello" }])).toBe("hello");
      expect(
        normalizeContent([
          { type: "text", text: "hello" },
          { type: "image", image: "data" },
        ]),
      ).toEqual([
        { type: "text", text: "hello" },
        { type: "image", image: "data" },
      ]);
    });
  });

  describe("Convenience Functions", () => {
    it("should add timestamp to user messages", () => {
      const message: UIMessage = {
        id: "m1",
        role: "user",
        parts: [{ type: "text", text: "hello" }],
        metadata: {},
      } as UIMessage;
      const result = addTimestampToMessage(message, "10:30:00");
      const textPart = result.parts.find((p) => p.type === "text") as any;
      expect(textPart.text).toBe("[10:30:00] hello");
    });

    it("should not add timestamp to non-user messages", () => {
      const message: UIMessage = {
        id: "m2",
        role: "assistant",
        parts: [{ type: "text", text: "hello" }],
        metadata: {},
      } as UIMessage;
      const result = addTimestampToMessage(message, "10:30:00");
      const textPart = result.parts.find((p) => p.type === "text") as any;
      expect(textPart.text).toBe("hello");
    });

    it("should prepend text to message", () => {
      const message: UIMessage = {
        id: "m3",
        role: "user",
        parts: [{ type: "text", text: "world" }],
        metadata: {},
      } as UIMessage;
      const result = prependToMessage(message, "hello ");
      const textPart = result.parts.find((p) => p.type === "text") as any;
      expect(textPart.text).toBe("hello world");
    });

    it("should append text to message", () => {
      const message: UIMessage = {
        id: "m4",
        role: "user",
        parts: [{ type: "text", text: "hello" }],
        metadata: {},
      } as UIMessage;
      const result = appendToMessage(message, " world");
      const textPart = result.parts.find((p) => p.type === "text") as any;
      expect(textPart.text).toBe("hello world");
    });

    it("should check if message has content", () => {
      const withText: UIMessage = {
        id: "m5",
        role: "user",
        parts: [{ type: "text", text: "hello" }],
        metadata: {},
      } as UIMessage;
      const emptyText: UIMessage = {
        id: "m6",
        role: "user",
        parts: [{ type: "text", text: "" }],
        metadata: {},
      } as UIMessage;
      const empty: UIMessage = { id: "m7", role: "user", parts: [], metadata: {} } as UIMessage;
      expect(hasContent(withText)).toBe(true);
      expect(hasContent(emptyText)).toBe(false);
      expect(hasContent(empty)).toBe(false);
    });

    it("should get content length", () => {
      expect(getContentLength("hello")).toBe(5);
      expect(getContentLength([])).toBe(0);
      expect(
        getContentLength([
          { type: "text", text: "hello" },
          { type: "image", image: "data" },
        ]),
      ).toBe(2);
    });
  });

  describe("MessageContentBuilder", () => {
    it("should build simple text content", () => {
      const builder = new MessageContentBuilder();
      const content = builder.addText("hello").build();
      expect(content).toBe("hello");
    });

    it("should build structured content", () => {
      const builder = new MessageContentBuilder();
      const content = builder.addText("hello").addImage("imageData").addText("world").build();
      expect(content).toEqual([
        { type: "text", text: "hello" },
        { type: "image", image: "imageData" },
        { type: "text", text: "world" },
      ]);
    });

    it("should build as array", () => {
      const builder = new MessageContentBuilder();
      const content = builder.addText("hello").buildAsArray();
      expect(content).toEqual([{ type: "text", text: "hello" }]);
    });

    it("should clear parts", () => {
      const builder = new MessageContentBuilder();
      builder.addText("hello").addText("world");
      expect(builder.length).toBe(2);
      builder.clear();
      expect(builder.length).toBe(0);
      expect(builder.build()).toBe("");
    });

    it("should add files", () => {
      const builder = new MessageContentBuilder();
      const content = builder
        .addText("Here are the files:")
        .addFile("filedata1", "text/plain")
        .addFile("filedata2", "image/png")
        .buildAsArray();
      expect(content).toHaveLength(3);
      expect(content[1]).toMatchObject({ type: "file", data: "filedata1", mimeType: "text/plain" });
      expect(content[2]).toMatchObject({ type: "file", data: "filedata2", mimeType: "image/png" });
    });
  });

  describe("messageHelpers export", () => {
    it("should export all helper functions", () => {
      expect(messageHelpers.isTextContent).toBeDefined();
      expect(messageHelpers.extractText).toBeDefined();
      expect(messageHelpers.transformTextContent).toBeDefined();
      expect(messageHelpers.MessageContentBuilder).toBeDefined();
      expect(messageHelpers.addTimestampToMessage).toBeDefined();
    });
  });
});
