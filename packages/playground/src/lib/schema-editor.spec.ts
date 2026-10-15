// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { SchemaEditor } from "../components/schema-editor";

afterEach(() => vi.unstubAllGlobals());

it("preserves boolean form values and keeps invalid JSON drafts visible while blocking execution", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let current = "";
  let valid = true;
  function Form() {
    const [value, setValue] = useState('{"enabled":true,"metadata":{}}');
    current = value;
    return createElement(SchemaEditor, {
      schema: {
        type: "object",
        required: ["enabled", "metadata"],
        properties: { enabled: { type: "boolean" }, metadata: { type: "object" } },
      },
      value,
      onChange: setValue,
      onValidity: (next) => {
        valid = next;
      },
    });
  }
  const element = document.createElement("div");
  const root = createRoot(element);
  await act(async () => root.render(createElement(Form)));
  const select = element.querySelector("select") as HTMLSelectElement;
  await act(async () => {
    select.value = "false";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(JSON.parse(current).enabled).toBe(false);
  const input = element.querySelector("textarea") as HTMLTextAreaElement;
  const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  await act(async () => {
    setValue?.call(input, "{");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(valid).toBe(false);
  expect(input.value).toBe("{");
  await act(async () => {
    setValue?.call(input, '{"count":0}');
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(valid).toBe(true);
  expect(JSON.parse(current)).toEqual({ enabled: false, metadata: { count: 0 } });
  await act(async () => root.unmount());
});
