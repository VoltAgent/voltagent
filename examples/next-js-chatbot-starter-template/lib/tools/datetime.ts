import { createTool } from "@voltagent/core";
import { z } from "zod";

/**
 * Date Time Tool
 * Gets current date and time information
 */
export const dateTimeTool = createTool({
  name: "getDateTime",
  description: "Get the current date, time, and timezone information",
  parameters: z.object({
    timezone: z
      .string()
      .optional()
      .describe("Optional timezone (e.g., 'America/New_York', 'Europe/London')"),
  }),
  execute: async ({ timezone }) => {
    const now = new Date();

    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    };

    try {
      const formatted = timezone ? now.toLocaleString("en-US", options) : now.toLocaleString();

      return {
        timestamp: now.toISOString(),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        formatted,
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        unix: Math.floor(now.getTime() / 1000),
        success: true,
      };
    } catch {
      return {
        error: `Invalid timezone: ${timezone}`,
        success: false,
      };
    }
  },
});
