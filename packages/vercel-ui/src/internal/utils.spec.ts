import type { DataContent } from "ai";
import { describe, expect, it } from "vitest";
import { buildSubAgentData, convertDataContentToBase64String } from "./utils";

describe("convertDataContentToBase64String", () => {
  it("should return string content as-is", () => {
    const content = "Hello, World!";
    const result = convertDataContentToBase64String(content);
    expect(result).toBe(content);
  });

  it("should convert ArrayBuffer to base64 string", () => {
    const text = "Hello, World!";
    const buffer = new TextEncoder().encode(text);
    const arrayBuffer = buffer.buffer;

    const result = convertDataContentToBase64String(arrayBuffer);
    expect(result).toBe("SGVsbG8sIFdvcmxkIQ==");
  });

  it("should convert Uint8Array to base64 string", () => {
    const text = "Test data";
    const uint8Array = new TextEncoder().encode(text);

    const result = convertDataContentToBase64String(uint8Array);
    expect(result).toBe("VGVzdCBkYXRh");
  });

  it("should handle empty string", () => {
    const content = "";
    const result = convertDataContentToBase64String(content);
    expect(result).toBe("");
  });

  it("should handle empty ArrayBuffer", () => {
    const arrayBuffer = new ArrayBuffer(0);
    const result = convertDataContentToBase64String(arrayBuffer);
    expect(result).toBe("");
  });

  it("should handle empty Uint8Array", () => {
    const uint8Array = new Uint8Array(0);
    const result = convertDataContentToBase64String(uint8Array);
    expect(result).toBe("");
  });

  it("should handle special characters in string", () => {
    const content = "Hello\nWorld\tTest";
    const result = convertDataContentToBase64String(content);
    expect(result).toBe(content);
  });

  it("should handle binary data in ArrayBuffer", () => {
    const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);
    const arrayBuffer = binaryData.buffer;

    const result = convertDataContentToBase64String(arrayBuffer);
    expect(result).toBe("AAEC//79");
  });

  it("should handle binary data in Uint8Array", () => {
    const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);

    const result = convertDataContentToBase64String(binaryData);
    expect(result).toBe("AAEC//79");
  });
});

describe("buildSubAgentData", () => {
  it("should return subAgent: false for non-sub-agent input", () => {
    const input = { someOtherProperty: "value" };
    const result = buildSubAgentData(input);

    expect(result).toEqual({
      subAgent: false,
    });
  });

  it("should return subAgent: false for null input", () => {
    const result = buildSubAgentData(null);

    expect(result).toEqual({
      subAgent: false,
    });
  });

  it("should return subAgent: false for undefined input", () => {
    const result = buildSubAgentData(undefined);

    expect(result).toEqual({
      subAgent: false,
    });
  });

  it("should return subAgent: false for string input", () => {
    const result = buildSubAgentData("not a sub agent");

    expect(result).toEqual({
      subAgent: false,
    });
  });

  it("should return subAgent: false for number input", () => {
    const result = buildSubAgentData(123);

    expect(result).toEqual({
      subAgent: false,
    });
  });

  it("should return subAgent: false for array input", () => {
    const result = buildSubAgentData([1, 2, 3]);

    expect(result).toEqual({
      subAgent: false,
    });
  });

  it("should return subAgent: false for object missing subAgentId", () => {
    const input = { subAgentName: "Test Agent" };
    const result = buildSubAgentData(input);

    expect(result).toEqual({
      subAgent: false,
    });
  });

  it("should return subAgent: false for object missing subAgentName", () => {
    const input = { subAgentId: "agent-123" };
    const result = buildSubAgentData(input);

    expect(result).toEqual({
      subAgent: false,
    });
  });

  it("should return subAgent: true for object with null subAgentId (hasKey returns true for existing properties)", () => {
    const input = { subAgentId: null, subAgentName: "Test Agent" };
    const result = buildSubAgentData(input);

    expect(result).toEqual({
      subAgentId: null,
      subAgentName: "Test Agent",
      subAgent: true,
    });
  });

  it("should return subAgent: true for object with null subAgentName (hasKey returns true for existing properties)", () => {
    const input = { subAgentId: "agent-123", subAgentName: null };
    const result = buildSubAgentData(input);

    expect(result).toEqual({
      subAgentId: "agent-123",
      subAgentName: null,
      subAgent: true,
    });
  });

  it("should return subAgent: true for object with undefined subAgentId (hasKey returns true for existing properties)", () => {
    const input = { subAgentId: undefined, subAgentName: "Test Agent" };
    const result = buildSubAgentData(input);

    expect(result).toEqual({
      subAgentId: undefined,
      subAgentName: "Test Agent",
      subAgent: true,
    });
  });

  it("should return subAgent: true for object with undefined subAgentName (hasKey returns true for existing properties)", () => {
    const input = { subAgentId: "agent-123", subAgentName: undefined };
    const result = buildSubAgentData(input);

    expect(result).toEqual({
      subAgentId: "agent-123",
      subAgentName: undefined,
      subAgent: true,
    });
  });

  it("should return correct data for valid sub-agent input", () => {
    const input = {
      subAgentId: "agent-123",
      subAgentName: "Test Agent",
      someOtherProperty: "value",
    };
    const result = buildSubAgentData(input);

    expect(result).toEqual({
      subAgentId: "agent-123",
      subAgentName: "Test Agent",
      subAgent: true,
    });
  });

  it("should return correct data for sub-agent with empty string values", () => {
    const input = {
      subAgentId: "",
      subAgentName: "",
    };
    const result = buildSubAgentData(input);

    expect(result).toEqual({
      subAgentId: "",
      subAgentName: "",
      subAgent: true,
    });
  });

  it("should return correct data for sub-agent with numeric string values", () => {
    const input = {
      subAgentId: "123",
      subAgentName: "Agent 456",
    };
    const result = buildSubAgentData(input);

    expect(result).toEqual({
      subAgentId: "123",
      subAgentName: "Agent 456",
      subAgent: true,
    });
  });

  it("should return correct data for sub-agent with special characters", () => {
    const input = {
      subAgentId: "agent-123!@#$%",
      subAgentName: "Test Agent (Special)",
    };
    const result = buildSubAgentData(input);

    expect(result).toEqual({
      subAgentId: "agent-123!@#$%",
      subAgentName: "Test Agent (Special)",
      subAgent: true,
    });
  });
});
