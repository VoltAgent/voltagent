/**
 * @file Browser Output Tools
 * @description Tools for saving and outputting data from the browser
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { type ToolExecuteOptions, createTool } from "@voltagent/core";
import type { ToolExecutionContext } from "@voltagent/core";
import { z } from "zod";
import { safeBrowserOperation } from "./browserBaseTools";

/**
 * Tool for saving content to a file
 */
export const saveToFileTool = createTool({
  name: "saveToFile",
  description: "Save content to a file",
  parameters: z.object({
    content: z.string().describe("Content to save to the file"),
    filePath: z.string().describe("Path where the file should be saved"),
    overwrite: z.boolean().optional().default(false).describe("Whether to overwrite existing file"),
    timeout: z.number().positive().optional().default(30000),
  }),
  execute: async (args, options?: ToolExecuteOptions) => {
    const context = options as ToolExecutionContext;
    if (!context?.operationContext?.userContext) {
      throw new Error("ToolExecutionContext is missing or invalid.");
    }
    try {
      const dirPath = path.dirname(args.filePath);

      // Check existence and handle overwrite asynchronously
      try {
        await fs.access(dirPath); // Check directory access
        // Directory exists, now check file if overwrite is false
        if (!args.overwrite) {
          try {
            await fs.access(args.filePath); // Check file access
            // File exists and overwrite is false, throw error
            throw new Error(
              `File already exists: ${args.filePath}. Set overwrite to true to replace it.`,
            );
          } catch (fileError: any) {
            if (fileError.code !== "ENOENT") {
              throw fileError; // Re-throw unexpected file access errors
            }
            // File does not exist, proceed to write
          }
        }
        // Overwrite is true or file doesn't exist, proceed
      } catch (dirError: any) {
        if (dirError.code === "ENOENT") {
          // Directory doesn't exist, create it
          await fs.mkdir(dirPath, { recursive: true });
          // No need to check file existence if directory was just created
        } else {
          // Other directory access error
          throw dirError;
        }
      }

      // Write content to file asynchronously
      await fs.writeFile(args.filePath, args.content);

      return {
        result: `Content successfully saved to ${args.filePath}`,
      };
    } catch (error: any) {
      console.error(`Error in saveToFileTool: ${error.message}`);
      throw error; // Re-throw after logging
    }
  },
});

/**
 * Tool for exporting page as PDF
 */
export const exportPdfTool = createTool({
  name: "exportToPdf",
  description: "Exports the current page content to a PDF file.",
  parameters: z.object({
    filename: z.string().describe("The path where the PDF file will be saved."),
    format: z
      .enum(["Letter", "Legal", "Tabloid", "Ledger", "A0", "A1", "A2", "A3", "A4", "A5"])
      .optional()
      .default("A4"),
    printBackground: z.boolean().optional().default(true),
    timeout: z.number().positive().optional().default(60000),
    // Add other Playwright PDF options as needed (scale, margins, etc.)
  }),
  execute: async (args, options?: ToolExecuteOptions) => {
    const context = options as ToolExecutionContext;
    if (!context?.operationContext?.userContext) {
      throw new Error("ToolExecutionContext is missing or invalid.");
    }
    return safeBrowserOperation(context, async (page) => {
      // Ensure the directory exists asynchronously
      const dir = path.dirname(args.filename);
      try {
        await fs.access(dir);
      } catch (error: any) {
        if (error.code === "ENOENT") {
          await fs.mkdir(dir, { recursive: true });
        } else {
          throw error;
        }
      }

      // Generate PDF (Playwright handles file writing here)
      await page.pdf({
        path: args.filename,
        format: args.format,
        printBackground: args.printBackground,
        // timeout: args.timeout, // Timeout is not a direct option for page.pdf
        // Pass other valid Playwright PDF options here if needed
      });

      return { result: `Page exported successfully to PDF: ${args.filename}` };
    });
  },
});

/**
 * Tool for extracting structured data from the page
 */
export const extractDataTool = createTool({
  name: "extractData",
  description: "Extract structured data from the page using CSS selectors",
  parameters: z.object({
    selectors: z.record(z.string()).describe("Map of data keys to CSS selectors"),
    includeHtml: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include HTML content for each selector"),
    schema: z.any().describe("Zod schema defining the structure of the data to extract."),
    selector: z
      .string()
      .optional()
      .describe("Optional CSS selector for the container element to extract from."),
  }),
  execute: async (args, options?: ToolExecuteOptions) => {
    const context = options as ToolExecutionContext;
    if (!context?.operationContext?.userContext) {
      throw new Error("ToolExecutionContext is missing or invalid.");
    }
    return safeBrowserOperation(context, async (page) => {
      const extractedData = await page.evaluate(
        (params) => {
          const { selectors, includeHtml } = params;
          const result: Record<string, { text: string; html?: string }> = {};

          for (const [key, selector] of Object.entries(selectors)) {
            const element = document.querySelector(selector);
            if (element) {
              result[key] = {
                text: (element.textContent || "").trim(),
              };

              if (includeHtml) {
                result[key].html = element.innerHTML;
              }
            } else {
              result[key] = { text: "" };
            }
          }

          return result;
        },
        { selectors: args.selectors, includeHtml: args.includeHtml },
      );

      // Validate extracted data against schema (optional but recommended)
      try {
        const zodSchema = args.schema as z.ZodObject<any>; // Assume object schema
        zodSchema.parse(extractedData);
        return {
          result: `Extracted data for ${Object.keys(args.selectors).length} selectors`,
          data: extractedData,
        };
      } catch (validationError) {
        console.error("Extracted data failed validation:", validationError);
        return {
          result: "Extracted data failed validation.",
          error: validationError,
          data: extractedData, // Return partial data even if validation fails
        };
      }
    });
  },
});

/**
 * Export all output tools as a group
 */
export const outputTools = {
  saveToFileTool,
  exportPdfTool,
  extractDataTool,
};
