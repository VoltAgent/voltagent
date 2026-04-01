import type { DocNode } from "./types";

export function extractTitle(nodes: DocNode[]): DocNode[] {
  if (!nodes.length) return nodes;
  const title = nodes[0]?.text.split("\n")[0]?.trim();
  if (!title) return nodes;
  return nodes.map((node) => ({
    ...node,
    metadata: { ...node.metadata, title },
  }));
}

export function extractSummary(nodes: DocNode[]): DocNode[] {
  if (!nodes.length) return nodes;
  const text = nodes.map((n) => n.text).join(" ");
  const summary = text
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(". ");
  return nodes.map((node) => ({
    ...node,
    metadata: { ...node.metadata, summary },
  }));
}

export function extractKeywords(nodes: DocNode[], topN = 5): DocNode[] {
  const freq: Record<string, number> = {};
  const words = nodes.flatMap((n) => n.text.toLowerCase().match(/\b[a-z]{3,}\b/g) || []);
  words.forEach((w) => {
    freq[w] = (freq[w] ?? 0) + 1;
  });
  const keywords = Object.entries(freq)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, topN)
    .map(([w]) => w);
  return nodes.map((node) => ({
    ...node,
    metadata: { ...node.metadata, keywords },
  }));
}

export function extractQuestions(nodes: DocNode[]): DocNode[] {
  const questions = nodes
    .flatMap((n) => n.text.split(/(?<=\?)/).map((q) => q.trim()))
    .filter((q) => q.endsWith("?"));
  return nodes.map((node) => ({
    ...node,
    metadata: { ...node.metadata, questions },
  }));
}
