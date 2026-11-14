import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { searchMarkdown } from "./markdown-search.ts";

const documents = fileURLToPath(new URL("../documents/", import.meta.url));

test("returns the relevant section and source", () => {
  const results = searchMarkdown(documents, "How do workflows suspend for human approval?");
  assert.equal(results[0]?.source, "documents/overview.md");
  assert.equal(results[0]?.section, "Workflows");
  assert.match(results[0]?.content ?? "", /human approval/);
});

test("returns no sources for an unrelated question", () => {
  assert.deepEqual(searchMarkdown(documents, "quantum bananas"), []);
});
