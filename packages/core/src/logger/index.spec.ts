import type { LogBuffer, Logger } from "@voltagent/internal";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentRegistry } from "../registries/agent-registry";
import * as consoleLoggerModule from "./console-logger";
import { getGlobalLogBuffer, getGlobalLogger } from "./index";

// Mock the AgentRegistry
vi.mock("../registries/agent-registry", () => {
  const mockRegistry = {
    getGlobalLogger: vi.fn(),
    setGlobalLogger: vi.fn(),
  };
  return {
    AgentRegistry: {
      getInstance: vi.fn(() => mockRegistry),
    },
  };
});

// Mock console-logger module
vi.mock("./console-logger", () => ({
  createConsoleLogger: vi.fn(),
  getDefaultLogBuffer: vi.fn(),
}));

describe("getGlobalLogger", () => {
  let mockLogger: Logger;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(),
    };

    // Clear previous mock calls
    vi.clearAllMocks();

    // Setup createConsoleLogger mock
    vi.mocked(consoleLoggerModule.createConsoleLogger).mockReturnValue(mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return existing global logger from registry", () => {
    const mockRegistry = AgentRegistry.getInstance();
    vi.mocked(mockRegistry.getGlobalLogger).mockReturnValue(mockLogger);

    const logger = getGlobalLogger();

    expect(logger).toBe(mockLogger);
    expect(mockRegistry.getGlobalLogger).toHaveBeenCalled();
    expect(consoleLoggerModule.createConsoleLogger).not.toHaveBeenCalled();
    expect(mockRegistry.setGlobalLogger).not.toHaveBeenCalled();
  });

  it("should create and set default logger if none exists", () => {
    const mockRegistry = AgentRegistry.getInstance();
    vi.mocked(mockRegistry.getGlobalLogger).mockReturnValue(undefined);

    const logger = getGlobalLogger();

    expect(logger).toBe(mockLogger);
    expect(mockRegistry.getGlobalLogger).toHaveBeenCalled();
    expect(consoleLoggerModule.createConsoleLogger).toHaveBeenCalledWith({ name: "voltagent" });
    expect(mockRegistry.setGlobalLogger).toHaveBeenCalledWith(mockLogger);
  });

  it("should cache the created logger in registry", () => {
    const mockRegistry = AgentRegistry.getInstance();

    // First call - no logger exists
    vi.mocked(mockRegistry.getGlobalLogger).mockReturnValue(undefined);

    const logger1 = getGlobalLogger();

    expect(consoleLoggerModule.createConsoleLogger).toHaveBeenCalledTimes(1);
    expect(mockRegistry.setGlobalLogger).toHaveBeenCalledTimes(1);

    // Setup for second call - logger now exists
    vi.mocked(mockRegistry.getGlobalLogger).mockReturnValue(mockLogger);

    const logger2 = getGlobalLogger();

    expect(logger2).toBe(logger1);
    expect(consoleLoggerModule.createConsoleLogger).toHaveBeenCalledTimes(1); // Not called again
  });

  it("should handle registry getInstance returning the same instance", () => {
    const firstCall = AgentRegistry.getInstance();
    const secondCall = AgentRegistry.getInstance();

    expect(firstCall).toBe(secondCall);
  });
});

describe("getGlobalLogBuffer", () => {
  let mockLogBuffer: LogBuffer;

  beforeEach(() => {
    // Create mock log buffer
    mockLogBuffer = {
      add: vi.fn(),
      query: vi.fn(),
      clear: vi.fn(),
      size: vi.fn(),
    };

    // Setup getDefaultLogBuffer mock
    vi.mocked(consoleLoggerModule.getDefaultLogBuffer).mockReturnValue(mockLogBuffer);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return log buffer from getDefaultLogBuffer", () => {
    const buffer = getGlobalLogBuffer();

    expect(buffer).toBe(mockLogBuffer);
    expect(consoleLoggerModule.getDefaultLogBuffer).toHaveBeenCalled();
  });

  it("should return the same buffer instance on multiple calls", () => {
    const buffer1 = getGlobalLogBuffer();
    const buffer2 = getGlobalLogBuffer();

    expect(buffer1).toBe(buffer2);
    expect(consoleLoggerModule.getDefaultLogBuffer).toHaveBeenCalledTimes(2);
  });

  it("should return buffer with all required methods", () => {
    const buffer = getGlobalLogBuffer();

    expect(buffer.add).toBeDefined();
    expect(buffer.query).toBeDefined();
    expect(buffer.clear).toBeDefined();
    expect(buffer.size).toBeDefined();
  });
});

describe("exports", () => {
  it("should export types from @voltagent/internal", async () => {
    // This is a compile-time check, but we can verify the module structure
    const indexModule = await import("./index");

    // Should re-export from other modules
    expect(indexModule.LogEvents).toBeDefined();
    expect(indexModule.LoggerProxy).toBeDefined();
    expect(indexModule.buildLogMessage).toBeDefined();
    expect(indexModule.buildLogContext).toBeDefined();
    expect(indexModule.ResourceType).toBeDefined();
    expect(indexModule.ActionType).toBeDefined();
  });
});
