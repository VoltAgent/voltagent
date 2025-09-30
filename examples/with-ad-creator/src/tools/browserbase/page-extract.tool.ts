import { createTool } from "@voltagent/core";
import { z } from "zod";
import { sessionManager } from "../../stagehand-manager";

export const pageExtractTool = createTool({
  name: "page_extract",
  description: "Extract structured data from a webpage using natural language instructions",
  parameters: z.object({
    url: z.string().url().optional().describe("URL to navigate to (optional if already on a page)"),
    instruction: z.string().describe("What to extract (e.g., 'extract all product prices')"),
    schema: z.record(z.any()).optional().describe("Zod schema definition for data extraction"),
    useTextExtract: z
      .boolean()
      .optional()
      .default(false)
      .describe("Set true for larger-scale extractions, false for small extractions"),
  }),
  execute: async ({ url, instruction, schema, useTextExtract }) => {
    console.log(`Starting extraction${url ? ` for ${url}` : ""} with instruction: ${instruction}`);

    try {
      const stagehand = await sessionManager.ensureStagehand();
      const page = stagehand.page;

      // Navigate to the URL if provided
      if (url) {
        console.log(`Navigating to ${url}`);
        await page.goto(url, { waitUntil: "networkidle" });
        console.log(`Successfully navigated to ${url}`);
      }

      // Default schema for brand extraction if none provided
      const defaultBrandSchema = {
        productName: z.string().describe("The product or service name"),
        tagline: z.string().describe("The main tagline or headline"),
        valueProposition: z.string().describe("The unique value proposition"),
        targetAudience: z.string().describe("The target audience"),
        features: z.array(z.string()).describe("Key features or benefits"),
        callToAction: z.string().describe("Main call-to-action text"),
      };

      const finalSchema = schema || defaultBrandSchema;
      const schemaObject = z.object(finalSchema);

      console.log(`Extracting with instruction: ${instruction}`);

      const result = await page.extract({
        instruction,
        schema: schemaObject,
        useTextExtract,
      });

      console.log("Extraction successful:", result);

      return {
        success: true,
        data: result,
        url: page.url(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Full stack trace for extraction error:", error);
      throw new Error(`Extraction failed: ${errorMessage}`);
    }
  },
});
