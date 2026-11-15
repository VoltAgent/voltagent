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
});
