import { createServer } from "node:net";
import { getPortsToTry } from "./server-utils";

/**
 * Centralized port manager for all server implementations
 * Prevents port conflicts between multiple server instances
 */
class PortManager {
  private static instance: PortManager;
  private allocatedPorts: Set<number> = new Set();
  private portAllocationPromises: Map<number, Promise<boolean>> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): PortManager {
    if (!PortManager.instance) {
      PortManager.instance = new PortManager();
    }
    return PortManager.instance;
  }

  /**
   * Test if a port is available by attempting to bind to it
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    // If already allocated by us, it's not available
    if (this.allocatedPorts.has(port)) {
      return false;
    }

    // Check if there's an ongoing allocation check for this port
    const existingCheck = this.portAllocationPromises.get(port);
    if (existingCheck) {
      // Wait for the existing check to complete
      await existingCheck;
      return false; // If someone else is checking, consider it unavailable
    }

    // Create a promise for this port check
    const checkPromise = new Promise<boolean>((resolve) => {
      const server = createServer();

      server.once("error", (err: any) => {
        if (err.code === "EADDRINUSE" || err.code === "EACCES") {
          resolve(false);
        } else {
          // Other errors, consider port unavailable
          resolve(false);
        }
      });

      server.once("listening", () => {
        server.close(() => {
          resolve(true);
        });
      });

      server.listen(port, "0.0.0.0");
    });

    // Store the promise so other checks can wait
    this.portAllocationPromises.set(port, checkPromise);

    try {
      const result = await checkPromise;
      return result;
    } finally {
      // Clean up the promise
      this.portAllocationPromises.delete(port);
    }
  }

  /**
   * Allocate an available port
   * @param preferredPort Optional preferred port to try first
   * @returns The allocated port number
   */
  public async allocatePort(preferredPort?: number): Promise<number> {
    const portsToTry = getPortsToTry(preferredPort);

    for (const port of portsToTry) {
      // Skip if already allocated
      if (this.allocatedPorts.has(port)) {
        continue;
      }

      const isAvailable = await this.isPortAvailable(port);
      if (isAvailable) {
        // Reserve this port
        this.allocatedPorts.add(port);
        return port;
      }
    }

    throw new Error("Could not find an available port");
  }

  /**
   * Release a previously allocated port
   * @param port The port number to release
   */
  public releasePort(port: number): void {
    this.allocatedPorts.delete(port);
  }

  /**
   * Check if a port is currently allocated by this manager
   * @param port The port number to check
   */
  public isPortAllocated(port: number): boolean {
    return this.allocatedPorts.has(port);
  }

  /**
   * Get all currently allocated ports
   */
  public getAllocatedPorts(): number[] {
    return Array.from(this.allocatedPorts);
  }

  /**
   * Clear all allocated ports (useful for testing)
   */
  public clearAll(): void {
    this.allocatedPorts.clear();
    this.portAllocationPromises.clear();
  }
}

// Export singleton instance
export const portManager = PortManager.getInstance();
