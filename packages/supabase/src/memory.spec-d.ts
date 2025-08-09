import { createClient } from "@supabase/supabase-js";
import { describe, expectTypeOf, it } from "vitest";
import { SupabaseMemory } from "./memory";

describe("SupabaseMemory", () => {
  describe("constructor", () => {
    it("should be instantiable with url and key", () => {
      expectTypeOf(SupabaseMemory).toBeConstructibleWith({
        supabaseUrl: "https://test.supabase.co",
        supabaseKey: "test-key",
      });
    });

    it("should be instantiable with client", () => {
      expectTypeOf(SupabaseMemory).toBeConstructibleWith({
        client: createClient("https://test.supabase.co", "test-key"),
      });
    });
  });
});
