import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPortsToTry, preferredPorts, printServerStartup } from "./server-utils";

describe("Server Utils", () => {
  describe("getPortsToTry", () => {
    it("should return preferred ports when no port specified", () => {
      const ports = getPortsToTry();

      // Should start with preferred ports
      expect(ports[0]).toBe(preferredPorts[0].port);
      expect(ports[1]).toBe(preferredPorts[1].port);

      // Should include fallback ports
      expect(ports).toContain(4300);
      expect(ports).toContain(4400);

      // Should have total of preferred + 101 fallback ports
      expect(ports.length).toBe(preferredPorts.length + 101);
    });

    it("should prioritize user-specified port", () => {
      const ports = getPortsToTry(8080);

      // User port should be first
      expect(ports[0]).toBe(8080);

      // Followed by preferred ports
      expect(ports[1]).toBe(preferredPorts[0].port);
      expect(ports[2]).toBe(preferredPorts[1].port);
    });

    it("should handle duplicate preferred port", () => {
      const ports = getPortsToTry(preferredPorts[0].port);

      // First preferred port appears twice (user + preferred)
      expect(ports[0]).toBe(preferredPorts[0].port);
      expect(ports[1]).toBe(preferredPorts[0].port);
      expect(ports[2]).toBe(preferredPorts[1].port);
    });

    it("should include range of fallback ports", () => {
      const ports = getPortsToTry();
      const fallbackPorts = ports.slice(preferredPorts.length);

      // Check fallback range
      expect(fallbackPorts[0]).toBe(4300);
      expect(fallbackPorts[fallbackPorts.length - 1]).toBe(4400);
      expect(fallbackPorts.length).toBe(101);
    });
  });

  describe("printServerStartup", () => {
    let consoleLogSpy: any;
    let originalConsoleLog: any;

    beforeEach(() => {
      originalConsoleLog = console.log;
      consoleLogSpy = vi.fn();
      console.log = consoleLogSpy;
    });

    afterEach(() => {
      console.log = originalConsoleLog;
      vi.unstubAllEnvs(); // Clean up any environment stubs
    });

    it("should print basic server startup message", () => {
      printServerStartup(3000, {});

      // Check for main startup message
      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("VOLTAGENT SERVER STARTED");
      expect(calls).toContain("http://localhost:3000");
      expect(calls).toContain("pnpm volt tunnel 3000");
      expect(calls).toContain("secure HTTPS tunnel for teammates");
      expect(calls).toContain("https://voltagent.dev/docs/deployment/local-tunnel/");
    });

    it("should display VoltOps Console link", () => {
      printServerStartup(3000, {});

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("Test your agents with VoltOps Console:");
      expect(calls).toContain("https://console.voltagent.dev");
    });

    it("should display swagger UI by default in non-production", () => {
      vi.stubEnv("NODE_ENV", "development");

      printServerStartup(3000, {});

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("Swagger UI:");
      expect(calls).toContain("http://localhost:3000/ui");
    });

    it("should not display swagger UI in production by default", () => {
      vi.stubEnv("NODE_ENV", "production");

      printServerStartup(3000, {});

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).not.toContain("Swagger UI:");
    });

    it("should display swagger UI when explicitly enabled", () => {
      vi.stubEnv("NODE_ENV", "production");

      printServerStartup(3000, { enableSwaggerUI: true });

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("Swagger UI:");
    });

    it("should display custom endpoints", () => {
      printServerStartup(3000, {
        customEndpoints: [
          { method: "get", path: "/api/custom" },
          { method: "post", path: "/api/data" },
        ],
      });

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("Registered Endpoints:");
      expect(calls).toContain("Custom Endpoints");
      expect(calls).toContain("GET");
      expect(calls).toContain("/api/custom");
      expect(calls).toContain("POST");
      expect(calls).toContain("/api/data");
    });

    it("should display all options together", () => {
      printServerStartup(3000, {
        customEndpoints: [{ method: "get", path: "/health" }],
        enableSwaggerUI: true,
      });

      const calls = consoleLogSpy.mock.calls.flat().join("\n");

      // Check all sections are present
      expect(calls).toContain("VOLTAGENT SERVER STARTED");
      expect(calls).toContain("Registered Endpoints:");
      expect(calls).toContain("Swagger UI:");
      expect(calls).toContain("VoltOps Console:");
      expect(calls).toContain("http://localhost:3000");
    });

    it("should handle empty custom endpoints array", () => {
      printServerStartup(3000, { customEndpoints: [] });

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      // Should not display custom endpoints section when empty
      expect(calls).not.toContain("Registered Endpoints:");
    });

    it("should group multiple endpoints by method", () => {
      printServerStartup(3000, {
        customEndpoints: [
          { method: "get", path: "/api/users" },
          { method: "get", path: "/api/posts" },
          { method: "post", path: "/api/users" },
        ],
      });

      const calls = consoleLogSpy.mock.calls.flat().join("\n");

      // Check endpoints are displayed
      expect(calls).toContain("GET");
      expect(calls).toContain("/api/users");
      expect(calls).toContain("/api/posts");
      expect(calls).toContain("POST");
    });

    it("should display feature groups when provided", () => {
      printServerStartup(3000, {
        customEndpoints: [
          { method: "get", path: "/mcp/servers", group: "MCP Endpoints" },
          { method: "post", path: "/a2a/:id", group: "A2A Endpoints" },
        ],
      });

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("MCP Endpoints");
      expect(calls).toContain("A2A Endpoints");
    });
  });

  describe("preferredPorts", () => {
    it("should export preferred ports with messages", () => {
      expect(preferredPorts.length).toBeGreaterThan(0);

      // Check all preferred ports have valid structure
      preferredPorts.forEach((port) => {
        expect(port).toHaveProperty("port");
        expect(port).toHaveProperty("messages");
        expect(typeof port.port).toBe("number");
        expect(port.messages).toBeInstanceOf(Array);
        expect(port.messages.length).toBeGreaterThan(0);

        // Each message should be a non-empty string
        port.messages.forEach((msg) => {
          expect(typeof msg).toBe("string");
          expect(msg.length).toBeGreaterThan(0);
        });
      });

      // Check specific known ports exist
      const ports = preferredPorts.map((p) => p.port);
      expect(ports).toContain(3141);
      expect(ports).toContain(4310);
    });
  });
});
