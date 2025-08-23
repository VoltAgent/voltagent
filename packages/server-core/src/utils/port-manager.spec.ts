import { createServer as createNetServer } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { delay } from "../test-utils/mocks";
import { portManager } from "./port-manager";

// Mock node:net module
vi.mock("node:net", () => ({
  createServer: vi.fn(),
}));

describe("PortManager", () => {
  let mockServer: any;

  beforeEach(() => {
    // Clear all allocated ports before each test
    portManager.clearAll();

    // Setup mock server
    mockServer = {
      once: vi.fn(),
      listen: vi.fn(),
      close: vi.fn((callback) => callback?.()),
    };

    (createNetServer as any).mockReturnValue(mockServer);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Singleton Pattern", () => {
    it("should always return the same instance", () => {
      const instance1 = portManager;
      const instance2 = portManager;
      expect(instance1).toBe(instance2);
    });

    it("should maintain state across calls", async () => {
      // Mock successful port binding
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          setTimeout(() => handler(), 0);
        }
      });

      const port = await portManager.allocatePort(3000);
      expect(port).toBe(3000);
      expect(portManager.isPortAllocated(3000)).toBe(true);
    });
  });

  describe("Port Allocation", () => {
    it("should allocate an available port", async () => {
      // Mock successful port binding
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          setTimeout(() => handler(), 0);
        }
      });

      const port = await portManager.allocatePort();
      expect(port).toBe(3141); // First preferred port
      expect(portManager.isPortAllocated(3141)).toBe(true);
    });

    it("should respect preferred port when available", async () => {
      // Mock successful port binding
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          setTimeout(() => handler(), 0);
        }
      });

      const port = await portManager.allocatePort(8080);
      expect(port).toBe(8080);
      expect(portManager.isPortAllocated(8080)).toBe(true);
    });

    it("should skip already allocated ports", async () => {
      let callCount = 0;

      // Mock first port as allocated, second as available
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          callCount++;
          if (callCount === 1) {
            // First port succeeds
            setTimeout(() => handler(), 0);
          } else {
            // Should not be called again for allocated port
            setTimeout(() => handler(), 0);
          }
        }
      });

      // Allocate first port
      const port1 = await portManager.allocatePort(3141);
      expect(port1).toBe(3141);

      // Reset mock for second allocation
      mockServer.once.mockClear();
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          setTimeout(() => handler(), 0);
        }
      });

      // Try to allocate again - should get next port
      const port2 = await portManager.allocatePort(3141);
      expect(port2).not.toBe(3141);
      expect(port2).toBe(4310); // Next preferred port
    });

    it("should handle port in use (EADDRINUSE)", async () => {
      let portBeingTested: number | undefined;

      (createNetServer as any).mockImplementation(() => {
        const mockServer = {
          once: vi.fn(),
          listen: vi.fn((port: number) => {
            portBeingTested = port;
          }),
          close: vi.fn((callback?: () => void) => callback?.()),
        };

        const handlers: Record<string, (...args: any[]) => void> = {};
        mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
          handlers[event] = handler;
          // After both handlers are registered, decide what to do based on port
          if (Object.keys(handlers).length === 2) {
            setTimeout(() => {
              if (portBeingTested === 3141) {
                // Port 3141 is in use (both attempts should fail)
                handlers.error({ code: "EADDRINUSE" });
              } else {
                // Other ports are available
                handlers.listening();
              }
            }, 0);
          }
          return mockServer;
        });

        return mockServer;
      });

      const port = await portManager.allocatePort(3141);
      expect(port).not.toBe(3141);
      expect(port).toBe(4310); // Should try next port after skipping duplicate 3141
    });

    it("should handle permission denied (EACCES)", async () => {
      let portBeingTested: number | undefined;

      (createNetServer as any).mockImplementation(() => {
        const mockServer = {
          once: vi.fn(),
          listen: vi.fn((port: number) => {
            portBeingTested = port;
          }),
          close: vi.fn((callback?: () => void) => callback?.()),
        };

        const handlers: Record<string, (...args: any[]) => void> = {};
        mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
          handlers[event] = handler;
          // After both handlers are registered, decide what to do based on port
          if (Object.keys(handlers).length === 2) {
            setTimeout(() => {
              if (portBeingTested === 80) {
                // Port 80 requires elevated permissions
                handlers.error({ code: "EACCES" });
              } else {
                // Other ports are available
                handlers.listening();
              }
            }, 0);
          }
          return mockServer;
        });

        return mockServer;
      });

      const port = await portManager.allocatePort(80); // Low port, likely EACCES
      expect(port).not.toBe(80);
      expect(port).toBe(3141); // Should try next port
    });

    it("should throw error when no ports are available", async () => {
      // Mock all ports as unavailable
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "error") {
          setTimeout(() => handler({ code: "EADDRINUSE" }), 0);
        }
      });

      // Mock getPortsToTry to return only a few ports for faster test
      const originalGetPortsToTry = vi.fn().mockReturnValue([3000, 3001]);
      vi.doMock("./server-utils", () => ({
        getPortsToTry: originalGetPortsToTry,
      }));

      await expect(portManager.allocatePort()).rejects.toThrow("Could not find an available port");
    });

    it("should handle concurrent allocation requests", async () => {
      // Create multiple mock servers for concurrent allocation
      (createNetServer as any).mockImplementation(() => {
        const newMockServer = {
          once: vi.fn(),
          listen: vi.fn(),
          close: vi.fn((callback?: () => void) => callback?.()),
        };

        newMockServer.once.mockImplementation(
          (event: string, handler: (...args: any[]) => void) => {
            if (event === "listening") {
              setTimeout(() => handler(), 0);
            }
          },
        );

        return newMockServer;
      });

      // Start multiple allocations concurrently
      const promises = [
        portManager.allocatePort(),
        portManager.allocatePort(),
        portManager.allocatePort(),
      ];

      const results = await Promise.all(promises);

      // All ports should be different
      expect(new Set(results).size).toBe(3);

      // All ports should be allocated
      results.forEach((port) => {
        expect(portManager.isPortAllocated(port)).toBe(true);
      });
    });

    it("should wait for existing port check to complete", async () => {
      let checkCompleted = false;

      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          // Delay to simulate slow port check
          setTimeout(() => {
            checkCompleted = true;
            handler();
          }, 100);
        }
      });

      // Start first allocation
      const promise1 = portManager.allocatePort(5000);

      // Start second allocation for same port immediately
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          setTimeout(() => handler(), 0);
        }
      });

      await delay(10); // Small delay to ensure first check is in progress
      const promise2 = portManager.allocatePort(5000);

      const [port1, port2] = await Promise.all([promise1, promise2]);

      // First should get the requested port
      expect(port1).toBe(5000);
      // Second should get a different port (since first is checking/allocated)
      expect(port2).not.toBe(5000);
      expect(checkCompleted).toBe(true);
    });
  });

  describe("Port Release", () => {
    it("should release an allocated port", async () => {
      // Mock successful port binding
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          setTimeout(() => handler(), 0);
        }
      });

      await portManager.allocatePort(3000);
      expect(portManager.isPortAllocated(3000)).toBe(true);

      portManager.releasePort(3000);
      expect(portManager.isPortAllocated(3000)).toBe(false);
    });

    it("should allow re-allocation after release", async () => {
      // Mock successful port binding
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          setTimeout(() => handler(), 0);
        }
      });

      // Allocate port
      const port1 = await portManager.allocatePort(3000);
      expect(port1).toBe(3000);

      // Release port
      portManager.releasePort(3000);

      // Reset mock for re-allocation
      mockServer.once.mockClear();
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          setTimeout(() => handler(), 0);
        }
      });

      // Re-allocate same port
      const port2 = await portManager.allocatePort(3000);
      expect(port2).toBe(3000);
    });

    it("should handle releasing non-allocated port gracefully", () => {
      expect(() => {
        portManager.releasePort(9999);
      }).not.toThrow();

      expect(portManager.isPortAllocated(9999)).toBe(false);
    });
  });

  describe("Utility Methods", () => {
    it("should return all allocated ports", async () => {
      // Mock successful port binding
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          setTimeout(() => handler(), 0);
        }
      });

      await portManager.allocatePort(3000);

      mockServer.once.mockClear();
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          setTimeout(() => handler(), 0);
        }
      });

      await portManager.allocatePort(3001);

      const allocatedPorts = portManager.getAllocatedPorts();
      expect(allocatedPorts).toHaveLength(2);
      expect(allocatedPorts).toContain(3000);
      expect(allocatedPorts).toContain(3001);
    });

    it("should clear all allocated ports", async () => {
      // Mock successful port binding
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          setTimeout(() => handler(), 0);
        }
      });

      await portManager.allocatePort(3000);
      expect(portManager.getAllocatedPorts()).toHaveLength(1);

      portManager.clearAll();
      expect(portManager.getAllocatedPorts()).toHaveLength(0);
      expect(portManager.isPortAllocated(3000)).toBe(false);
    });

    it("should check if a specific port is allocated", async () => {
      expect(portManager.isPortAllocated(3000)).toBe(false);

      // Mock successful port binding
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          setTimeout(() => handler(), 0);
        }
      });

      await portManager.allocatePort(3000);
      expect(portManager.isPortAllocated(3000)).toBe(true);
      expect(portManager.isPortAllocated(3001)).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle server close callback properly", async () => {
      let closeCalled = false;

      mockServer.close.mockImplementation((callback?: () => void) => {
        closeCalled = true;
        if (callback) callback();
      });

      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          setTimeout(() => handler(), 0);
        }
      });

      const port = await portManager.allocatePort(3000);
      expect(port).toBe(3000);
      expect(closeCalled).toBe(true);
    });

    it("should handle other errors as unavailable", async () => {
      let portBeingTested: number | undefined;

      (createNetServer as any).mockImplementation(() => {
        const mockServer = {
          once: vi.fn(),
          listen: vi.fn((port: number) => {
            portBeingTested = port;
          }),
          close: vi.fn((callback?: () => void) => callback?.()),
        };

        const handlers: Record<string, (...args: any[]) => void> = {};
        mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
          handlers[event] = handler;
          // After both handlers are registered, decide what to do based on port
          if (Object.keys(handlers).length === 2) {
            setTimeout(() => {
              if (portBeingTested === 3000) {
                // Port 3000 has unknown error
                handlers.error({ code: "UNKNOWN_ERROR" });
              } else {
                // Other ports are available
                handlers.listening();
              }
            }, 0);
          }
          return mockServer;
        });

        return mockServer;
      });

      const port = await portManager.allocatePort(3000);
      expect(port).not.toBe(3000);
      expect(port).toBe(3141); // Should try the first preferred port
    });

    it("should cleanup promises map even on error", async () => {
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "error") {
          setTimeout(() => handler({ code: "EADDRINUSE" }), 0);
        }
      });

      try {
        // This will fail but should cleanup
        await portManager.allocatePort(3000);
      } catch {
        // Expected to fail
      }

      // Try again - should not have stale promise
      mockServer.once.mockClear();
      mockServer.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === "listening") {
          setTimeout(() => handler(), 0);
        }
      });

      const port = await portManager.allocatePort(3001);
      expect(port).toBe(3001);
    });
  });
});
