import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractPdfPages,
  extractRetrievalQuery,
  rankPdfChunks,
  reportFilename,
} from "./pdf-retriever";

describe("NYC housing PDF retrieval", () => {
  it("extracts the official annual report page-by-page", async () => {
    const pages = await extractPdfPages(join(process.cwd(), "data", reportFilename));

    expect(pages).toHaveLength(29);
    expect(pages[2]?.text).toContain("Permits for 15,626 new dwelling units");
    expect(pages[4]?.text).toContain("vacancy rate of 1.41% in 2023");
    expect(pages[5]?.text).toContain("(to 6,588 units) and Manhattan");
  });

  it("ranks chunks by vector similarity", () => {
    const ranked = rankPdfChunks(
      [1, 0],
      [
        { content: "Vacancy rates", embedding: [0, 1], id: "page-5", pageNumber: 5 },
        {
          content: "Residential permits by borough",
          embedding: [0.98, 0.02],
          id: "page-6",
          pageNumber: 6,
        },
      ],
      1,
    );

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.pageNumber).toBe(6);
    expect(ranked[0]?.score).toBeGreaterThan(0.99);
  });

  it("prioritizes submitted form values in an action query", () => {
    const query = extractRetrievalQuery(
      '<content>Analyze the submitted housing focus</content><context>["User clicked: Analyze the submitted housing focus",{"housingAnalysis":{"focusArea":"Vacancy rates","audience":"City planners","notes":"Compare borough differences"}}]</context>',
    );

    expect(query).toBe("Vacancy rates Compare borough differences");
    expect(query).not.toContain("User clicked");
  });

  it("reads the current OpenUI sentinel envelope and nested form fields", () => {
    const query = extractRetrievalQuery(
      ']]>openui:content\nAnalyze the submitted housing focus\n]]>openui:context\n["User clicked: Analyze the submitted housing focus",{"housingAnalysis":{"focusArea":{"value":"Vacancy rates"},"audience":{"value":"City planners"},"notes":{"value":"Compare borough differences"}}}]',
    );

    expect(query).toBe("Vacancy rates Compare borough differences");
    expect(query).not.toContain("City planners");
    expect(query).not.toContain("]]>openui:");
  });
});
