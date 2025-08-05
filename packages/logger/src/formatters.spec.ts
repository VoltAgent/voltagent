import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultLogFormat, getDefaultLogLevel, getDefaultRedactionPaths } from "./formatters";

describe("formatters", () => {
  // Store original env values
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear relevant env vars before each test
    // biome-ignore lint/performance/noDelete: Required for proper test isolation
    delete process.env.VOLTAGENT_LOG_LEVEL;
    // biome-ignore lint/performance/noDelete: Required for proper test isolation
    delete process.env.LOG_LEVEL;
    // biome-ignore lint/performance/noDelete: Required for proper test isolation
    delete process.env.VOLTAGENT_LOG_FORMAT;
    // biome-ignore lint/performance/noDelete: Required for proper test isolation
    delete process.env.VOLTAGENT_LOG_REDACT;
    // biome-ignore lint/performance/noDelete: Required for proper test isolation
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe("getDefaultLogLevel", () => {
    it("should return info in development by default", () => {
      process.env.NODE_ENV = "development";
      expect(getDefaultLogLevel()).toBe("info");
    });

    it("should return error in production by default", () => {
      process.env.NODE_ENV = "production";
      expect(getDefaultLogLevel()).toBe("error");
    });

    it("should return info when NODE_ENV is not set", () => {
      // NODE_ENV is undefined
      expect(getDefaultLogLevel()).toBe("info");
    });

    it("should prioritize VOLTAGENT_LOG_LEVEL over default", () => {
      process.env.NODE_ENV = "production";
      process.env.VOLTAGENT_LOG_LEVEL = "WARN";

      expect(getDefaultLogLevel()).toBe("warn");
    });

    it("should use LOG_LEVEL if VOLTAGENT_LOG_LEVEL is not set", () => {
      process.env.NODE_ENV = "production";
      process.env.LOG_LEVEL = "ERROR";

      expect(getDefaultLogLevel()).toBe("error");
    });

    it("should prioritize VOLTAGENT_LOG_LEVEL over LOG_LEVEL", () => {
      process.env.NODE_ENV = "production";
      process.env.VOLTAGENT_LOG_LEVEL = "DEBUG";
      process.env.LOG_LEVEL = "ERROR";

      expect(getDefaultLogLevel()).toBe("debug");
    });

    it("should convert log level to lowercase", () => {
      process.env.VOLTAGENT_LOG_LEVEL = "TRACE";
      expect(getDefaultLogLevel()).toBe("trace");

      process.env.VOLTAGENT_LOG_LEVEL = "Fatal";
      expect(getDefaultLogLevel()).toBe("fatal");
    });
  });

  describe("getDefaultLogFormat", () => {
    it("should return pretty in development by default", () => {
      process.env.NODE_ENV = "development";
      expect(getDefaultLogFormat()).toBe("pretty");
    });

    it("should return json in production by default", () => {
      process.env.NODE_ENV = "production";
      expect(getDefaultLogFormat()).toBe("json");
    });

    it("should return pretty when NODE_ENV is not set", () => {
      // NODE_ENV is undefined
      expect(getDefaultLogFormat()).toBe("pretty");
    });

    it("should use VOLTAGENT_LOG_FORMAT when set to json", () => {
      process.env.NODE_ENV = "development";
      process.env.VOLTAGENT_LOG_FORMAT = "json";

      expect(getDefaultLogFormat()).toBe("json");
    });

    it("should use VOLTAGENT_LOG_FORMAT when set to pretty", () => {
      process.env.NODE_ENV = "production";
      process.env.VOLTAGENT_LOG_FORMAT = "pretty";

      expect(getDefaultLogFormat()).toBe("pretty");
    });

    it("should ignore invalid VOLTAGENT_LOG_FORMAT values", () => {
      process.env.NODE_ENV = "production";
      process.env.VOLTAGENT_LOG_FORMAT = "invalid";

      expect(getDefaultLogFormat()).toBe("json"); // Falls back to production default
    });

    it("should handle case-sensitive format values", () => {
      // 'JSON' is not exactly 'json', so it falls back to default based on NODE_ENV
      process.env.NODE_ENV = "development";
      process.env.VOLTAGENT_LOG_FORMAT = "JSON";
      expect(getDefaultLogFormat()).toBe("pretty"); // Falls back to dev default

      process.env.NODE_ENV = "production";
      process.env.VOLTAGENT_LOG_FORMAT = "Pretty";
      expect(getDefaultLogFormat()).toBe("json"); // Falls back to prod default
    });
  });

  describe("getDefaultRedactionPaths", () => {
    it("should return default redaction paths", () => {
      const paths = getDefaultRedactionPaths();

      expect(paths).toEqual(["password", "token", "apiKey", "secret", "authorization", "cookie"]);
    });

    it("should merge custom paths from VOLTAGENT_LOG_REDACT", () => {
      process.env.VOLTAGENT_LOG_REDACT = "ssn,creditCard,pin";

      const paths = getDefaultRedactionPaths();

      expect(paths).toContain("password"); // default
      expect(paths).toContain("token"); // default
      expect(paths).toContain("ssn"); // custom
      expect(paths).toContain("creditCard"); // custom
      expect(paths).toContain("pin"); // custom
    });

    it("should handle whitespace in custom paths", () => {
      process.env.VOLTAGENT_LOG_REDACT = " ssn , creditCard , pin ";

      const paths = getDefaultRedactionPaths();

      expect(paths).toContain("ssn");
      expect(paths).toContain("creditCard");
      expect(paths).toContain("pin");
    });

    it("should deduplicate paths", () => {
      process.env.VOLTAGENT_LOG_REDACT = "password,token,customSecret";

      const paths = getDefaultRedactionPaths();

      // Count occurrences of 'password'
      const passwordCount = paths.filter((p) => p === "password").length;
      expect(passwordCount).toBe(1);

      // Count occurrences of 'token'
      const tokenCount = paths.filter((p) => p === "token").length;
      expect(tokenCount).toBe(1);

      // Custom path should be included
      expect(paths).toContain("customSecret");
    });

    it("should handle empty VOLTAGENT_LOG_REDACT", () => {
      process.env.VOLTAGENT_LOG_REDACT = "";

      const paths = getDefaultRedactionPaths();

      // Should still have all default paths
      expect(paths).toEqual(["password", "token", "apiKey", "secret", "authorization", "cookie"]);
    });

    it("should handle single custom path", () => {
      process.env.VOLTAGENT_LOG_REDACT = "privateKey";

      const paths = getDefaultRedactionPaths();

      expect(paths.length).toBe(7); // 6 defaults + 1 custom
      expect(paths).toContain("privateKey");
    });
  });
});
