import { describe, expect, it } from "vitest";
import { detectFormat } from "./format-detector";

describe("Markdown table detection", () => {
  it.each(["\n", "\r\n"])("detects a table with only a header and delimiter (%j)", (newline) => {
    const table = ["| Name | Value |", "| --- | --- |"].join(newline);

    expect(detectFormat(table)).toBe("table");
  });

  it("treats a pipe row without a delimiter as text", () => {
    expect(detectFormat("| Name | Value |")).toBe("text");
  });

  it.each(["\n", "\r\n"])("accepts a delimiter without a trailing pipe (%j)", (newline) => {
    const header = "| Name | Value |";
    const delimiter = "| :--- | ---:";

    expect(detectFormat([header, delimiter].join(newline))).toBe("table");
    expect(detectFormat([header, delimiter, "| one | two |"].join(newline))).toBe("table");
  });

  it.each(["\n", "\r\n"])("accepts aligned delimiter cells (%j)", (newline) => {
    const table = ["| Name | Value |", "| :--- | ---: |"].join(newline);

    expect(detectFormat(table)).toBe("table");
  });

  it("does not match an unrelated delimiter in prose", () => {
    expect(detectFormat("| note |\nprose containing | -- | marker")).toBe("text");
  });
});
