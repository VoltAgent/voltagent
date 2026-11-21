import { describe, expect, it } from "vitest";
import { detectFormat } from "./format-detector";

describe("Markdown table detection", () => {
  it.each(["", "intro\n"])("preserves code indentation after %j", (prefix) => {
    expect(detectFormat(prefix + "    | Name |\n    | --- |")).toBe("text");
  });

  it("accepts three-space indentation and escaped header pipes", () => {
    expect(detectFormat("   | A \\| B | C |\n   | --- | --- |")).toBe("table");
  });

  it("rejects a delimiter with a different number of cells", () => {
    expect(detectFormat("| Name | Value |\n| ---")).toBe("text");
  });

  it("rejects long whitespace followed by an invalid delimiter character", () => {
    expect(detectFormat("| Name |\n|--" + " ".repeat(100000) + "x")).toBe("text");
  });

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
