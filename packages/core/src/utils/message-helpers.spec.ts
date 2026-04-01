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

    it("should export overloaded functions that work with both MessageContent and UIMessage", () => {
      expect(messageHelpers.extractText).toBeDefined();
      expect(messageHelpers.extractTextParts).toBeDefined();
      expect(messageHelpers.extractImageParts).toBeDefined();
      expect(messageHelpers.extractFileParts).toBeDefined();
      expect(messageHelpers.hasTextPart).toBeDefined();
      expect(messageHelpers.hasImagePart).toBeDefined();
      expect(messageHelpers.hasFilePart).toBeDefined();
      expect(messageHelpers.getContentLength).toBeDefined();
    });
  });

  describe("UIMessage Overload Support", () => {
    describe("extractText with UIMessage", () => {
      it("should extract text from UIMessage with single text part", () => {
        const message: UIMessage = {
          id: "msg-1",
          role: "user",
          parts: [{ type: "text", text: "Hello, world!" }],
        } as UIMessage;
        expect(extractText(message)).toBe("Hello, world!");
      });

      it("should extract and join multiple text parts", () => {
        const message: UIMessage = {
          id: "msg-2",
          role: "user",
          parts: [
            { type: "text", text: "Hello, " },
            { type: "text", text: "world!" },
          ],
        } as UIMessage;
        expect(extractText(message)).toBe("Hello, world!");
      });

      it("should extract only text parts from mixed content", () => {
        const message: UIMessage = {
          id: "msg-3",
          role: "user",
          parts: [
            { type: "text", text: "Check this: " },
            { type: "file", url: "data:image/png;base64,xxx", mediaType: "image/png" },
            { type: "text", text: "cool image!" },
          ],
        } as UIMessage;
        expect(extractText(message)).toBe("Check this: cool image!");
      });

      it("should return empty string for message with no text parts", () => {
        const message: UIMessage = {
          id: "msg-4",
          role: "assistant",
          parts: [{ type: "file", url: "data:image/png;base64,xxx", mediaType: "image/png" }],
        } as UIMessage;
        expect(extractText(message)).toBe("");
      });

      it("should return empty string for message with no parts", () => {
        const message: UIMessage = {
          id: "msg-5",
          role: "user",
          parts: [],
        } as UIMessage;
        expect(extractText(message)).toBe("");
      });

      it("should handle undefined or null parts gracefully", () => {
        const message1 = { id: "msg-6", role: "user" } as UIMessage;
        const message2 = { id: "msg-7", role: "user", parts: null } as any;
        expect(extractText(message1)).toBe("");
        expect(extractText(message2)).toBe("");
      });
    });

    describe("extractTextParts with UIMessage", () => {
      it("should extract text parts array", () => {
        const message: UIMessage = {
          id: "msg-8",
          role: "user",
          parts: [
            { type: "text", text: "First" },
            { type: "file", url: "data:image/png;base64,xxx", mediaType: "image/png" },
            { type: "text", text: "Second" },
          ],
        } as UIMessage;
        const textParts = extractTextParts(message);
        expect(textParts).toHaveLength(2);
        expect(textParts[0]).toEqual({ type: "text", text: "First" });
        expect(textParts[1]).toEqual({ type: "text", text: "Second" });
      });

      it("should return empty array when no text parts", () => {
        const message: UIMessage = {
          id: "msg-9",
          role: "assistant",
          parts: [{ type: "file", url: "data:image/png;base64,xxx", mediaType: "image/png" }],
        } as UIMessage;
        expect(extractTextParts(message)).toEqual([]);
      });
    });

    describe("extractImageParts with UIMessage", () => {
      it("should extract image file parts", () => {
        const message: UIMessage = {
          id: "msg-10",
          role: "user",
          parts: [
            { type: "text", text: "Check these:" },
            { type: "file", url: "data:image/png;base64,aaa", mediaType: "image/png" },
            { type: "file", url: "data:image/jpeg;base64,bbb", mediaType: "image/jpeg" },
            { type: "file", url: "data:application/pdf;base64,ccc", mediaType: "application/pdf" },
          ],
        } as UIMessage;
        const imageParts = extractImageParts(message);
        expect(imageParts).toHaveLength(2);
        expect(imageParts[0].mediaType).toBe("image/png");
        expect(imageParts[1].mediaType).toBe("image/jpeg");
      });

      it("should return empty array when no image parts", () => {
        const message: UIMessage = {
          id: "msg-11",
          role: "user",
          parts: [{ type: "text", text: "No images" }],
        } as UIMessage;
        expect(extractImageParts(message)).toEqual([]);
      });
    });

    describe("extractFileParts with UIMessage", () => {
      it("should extract all file parts", () => {
        const message: UIMessage = {
          id: "msg-12",
          role: "user",
          parts: [
            { type: "text", text: "Files:" },
            { type: "file", url: "data:image/png;base64,aaa", mediaType: "image/png" },
            { type: "file", url: "data:application/pdf;base64,bbb", mediaType: "application/pdf" },
          ],
        } as UIMessage;
        const fileParts = extractFileParts(message);
        expect(fileParts).toHaveLength(2);
        expect(fileParts[0].mediaType).toBe("image/png");
        expect(fileParts[1].mediaType).toBe("application/pdf");
      });
    });

    describe("hasTextPart with UIMessage", () => {
      it("should return true when message has text parts", () => {
        const message: UIMessage = {
          id: "msg-15",
          role: "user",
          parts: [
            { type: "text", text: "Hello" },
            { type: "file", url: "data:image/png;base64,xxx", mediaType: "image/png" },
          ],
        } as UIMessage;
        expect(hasTextPart(message)).toBe(true);
      });

      it("should return false when message has no text parts", () => {
        const message: UIMessage = {
          id: "msg-16",
          role: "user",
          parts: [{ type: "file", url: "data:image/png;base64,xxx", mediaType: "image/png" }],
        } as UIMessage;
        expect(hasTextPart(message)).toBe(false);
      });

      it("should return false for empty parts array", () => {
        const message: UIMessage = { id: "msg-17", role: "user", parts: [] } as UIMessage;
        expect(hasTextPart(message)).toBe(false);
      });
    });

    describe("hasImagePart with UIMessage", () => {
      it("should return true when message has image parts", () => {
        const message: UIMessage = {
          id: "msg-18",
          role: "user",
          parts: [
            { type: "text", text: "Look:" },
            { type: "file", url: "data:image/png;base64,xxx", mediaType: "image/png" },
          ],
        } as UIMessage;
        expect(hasImagePart(message)).toBe(true);
      });

      it("should return false when message has file parts but not images", () => {
        const message: UIMessage = {
          id: "msg-19",
          role: "user",
          parts: [
            { type: "file", url: "data:application/pdf;base64,xxx", mediaType: "application/pdf" },
          ],
        } as UIMessage;
        expect(hasImagePart(message)).toBe(false);
      });
    });

    describe("hasFilePart with UIMessage", () => {
      it("should return true when message has file parts", () => {
        const message: UIMessage = {
          id: "msg-20",
          role: "user",
          parts: [
            { type: "file", url: "data:application/pdf;base64,xxx", mediaType: "application/pdf" },
          ],
        } as UIMessage;
        expect(hasFilePart(message)).toBe(true);
      });

      it("should return false when message has no file parts", () => {
        const message: UIMessage = {
          id: "msg-21",
          role: "user",
          parts: [{ type: "text", text: "No files" }],
        } as UIMessage;
        expect(hasFilePart(message)).toBe(false);
      });
    });

    describe("getContentLength with UIMessage", () => {
      it("should return the number of parts", () => {
        const message: UIMessage = {
          id: "msg-24",
          role: "user",
          parts: [
            { type: "text", text: "Hello" },
            { type: "file", url: "data:image/png;base64,xxx", mediaType: "image/png" },
            { type: "text", text: "world" },
          ],
        } as UIMessage;
        expect(getContentLength(message)).toBe(3);
      });

      it("should return 0 for empty parts array", () => {
        const message: UIMessage = { id: "msg-25", role: "user", parts: [] } as UIMessage;
        expect(getContentLength(message)).toBe(0);
      });

      it("should return 0 for undefined parts", () => {
        const message = { id: "msg-26", role: "user" } as UIMessage;
        expect(getContentLength(message)).toBe(0);
      });
    });
  });
});
