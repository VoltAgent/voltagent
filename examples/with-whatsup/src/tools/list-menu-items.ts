import { createTool } from "@voltagent/core";
import { z } from "zod";
import { supabase } from "../../lib/supabase";

export const listMenuItemsTool = createTool({
  name: "listMenuItems",
  description: "Lists all menu items from the Supabase database",
  parameters: z.object({
    limit: z.number().optional().default(100).describe("Number of items to fetch"),
    offset: z.number().optional().default(0).describe("Number of items to skip"),
  }),
  execute: async ({ limit, offset }) => {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .range(offset, offset + limit - 1)
        .order("id", { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch menu items: ${error.message}`);
      }

      return {
        success: true,
        data: data || [],
        count: data?.length || 0,
        message: `Successfully fetched ${data?.length || 0} menu items`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        data: [],
      };
    }
  },
});
