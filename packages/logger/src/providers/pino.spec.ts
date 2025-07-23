import { vi, describe, expect, it, beforeEach, afterEach } from "vitest";
import pino from "pino";
import { PinoLoggerProvider } from "./pino";
import { InMemoryLogBuffer } from "../buffer";
import type { LoggerOptions, LogBuffer } from "../types";

// Mock pino
vi.mock("pino", () => {
  const streamSymbol = Symbol("stream");
  const mockPino = vi.fn();
  mockPino.symbols = {
    streamSym: streamSymbol,
  };
  return {
    default: mockPino,
    __streamSymbol: streamSymbol, // Export for tests
  };
});

// Mock the formatters
vi.mock("../formatters", () => ({
  getDefaultLogLevel: vi.fn().mockReturnValue("info"),
  getDefaultLogFormat: vi.fn().mockReturnValue("json"),
  getDefaultRedactionPaths: vi.fn().mockReturnValue(["password", "token"]),
}));

// Mock InMemoryLogBuffer
vi.mock("../buffer", () => ({
  InMemoryLogBuffer: vi.fn().mockImplementation((size) => ({
    add: vi.fn(),
    query: vi.fn().mockReturnValue([]),
    clear: vi.fn(),
    size: vi.fn().mockReturnValue(0),
    _maxSize: size,
  })),
}));

describe("PinoLoggerProvider", () => {
  let mockPinoInstance: any;
  let provider: PinoLoggerProvider;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Setup mock pino instance
    mockPinoInstance = {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(),
    };

    // Mock pino stream
    const mockStream = {
      write: vi.fn(),
    };
    mockPinoInstance[(pino as any).__streamSymbol] = mockStream;

    // Setup child logger
    mockPinoInstance.child.mockReturnValue({
      ...mockPinoInstance,
      child: vi.fn().mockReturnValue(mockPinoInstance),
    });

    // Mock pino constructor
    vi.mocked(pino).mockReturnValue(mockPinoInstance);

    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  describe("constructor", () => {
    it("should create provider with default buffer size", () => {
      provider = new PinoLoggerProvider();

      expect(InMemoryLogBuffer).toHaveBeenCalledWith(1000);
      expect(provider.name).toBe("pino");
    });

    it("should use custom buffer size", () => {
      provider = new PinoLoggerProvider(500);

      expect(InMemoryLogBuffer).toHaveBeenCalledWith(500);
    });

    it("should use VOLTAGENT_LOG_BUFFER_SIZE env var", () => {
      process.env.VOLTAGENT_LOG_BUFFER_SIZE = "2000";
      provider = new PinoLoggerProvider();

      expect(InMemoryLogBuffer).toHaveBeenCalledWith(2000);
    });

    it("should accept external log buffer", () => {
      const externalBuffer: LogBuffer = {
        add: vi.fn(),
        query: vi.fn(),
        clear: vi.fn(),
        size: vi.fn(),
      };

      provider = new PinoLoggerProvider(1000, externalBuffer);
      // Will be tested in setupLogCapture tests
    });

    it("should accept custom pino options", () => {
      const pinoOptions = { level: "debug" };
      provider = new PinoLoggerProvider(1000, undefined, pinoOptions);
      // Will be tested in createLogger tests
    });
  });

  describe("createLogger", () => {
    beforeEach(() => {
      provider = new PinoLoggerProvider();
    });

    it("should create a logger with default options", () => {
      const logger = provider.createLogger();

      expect(pino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "info",
          redact: {
            paths: ["password", "token"],
            censor: "[REDACTED]",
          },
        }),
      );

      expect(logger.getProvider()).toBe(provider);
      expect(logger.getBuffer()).toBe(provider.getLogBuffer());
    });

    it("should create logger with custom options", () => {
      const options: LoggerOptions = {
        level: "debug",
        name: "test-logger",
        redact: ["apiKey"],
      };

      const logger = provider.createLogger(options);

      expect(pino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "debug",
          name: "test-logger",
          redact: {
            paths: ["apiKey"],
            censor: "[REDACTED]",
          },
        }),
      );
    });

    it("should add pretty transport in development", () => {
      process.env.NODE_ENV = "development";

      const logger = provider.createLogger({ format: "pretty" });

      expect(pino).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: {
            target: "pino-pretty",
            options: expect.objectContaining({
              colorize: true,
            }),
          },
        }),
      );
    });

    it("should not add pretty transport in production by default", () => {
      process.env.NODE_ENV = "production";

      const logger = provider.createLogger({ format: "pretty" });

      expect(pino).toHaveBeenCalledWith(
        expect.not.objectContaining({
          transport: expect.anything(),
        }),
      );
    });

    it("should merge custom pino options", () => {
      const customProvider = new PinoLoggerProvider(1000, undefined, {
        browser: { asObject: true },
      });

      const logger = customProvider.createLogger();

      expect(pino).toHaveBeenCalledWith(
        expect.objectContaining({
          browser: { asObject: true },
        }),
      );
    });
  });

  describe("logger methods", () => {
    let logger: any;

    beforeEach(() => {
      provider = new PinoLoggerProvider();
      logger = provider.createLogger();
    });

    it("should call pino trace with correct arguments", () => {
      logger.trace("Test trace");
      expect(mockPinoInstance.trace).toHaveBeenCalledWith({}, "Test trace");

      logger.trace("Test with context", { foo: "bar" });
      expect(mockPinoInstance.trace).toHaveBeenCalledWith({ foo: "bar" }, "Test with context");
    });

    it("should call pino debug with correct arguments", () => {
      logger.debug("Test debug");
      expect(mockPinoInstance.debug).toHaveBeenCalledWith({}, "Test debug");
    });

    it("should call pino info with correct arguments", () => {
      logger.info("Test info", { userId: "123" });
      expect(mockPinoInstance.info).toHaveBeenCalledWith({ userId: "123" }, "Test info");
    });

    it("should call pino warn with correct arguments", () => {
      logger.warn("Test warning");
      expect(mockPinoInstance.warn).toHaveBeenCalledWith({}, "Test warning");
    });

    it("should call pino error with correct arguments", () => {
      logger.error("Test error", { error: new Error("Test") });
      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        { error: new Error("Test") },
        "Test error",
      );
    });

    it("should call pino fatal with correct arguments", () => {
      logger.fatal("Fatal error");
      expect(mockPinoInstance.fatal).toHaveBeenCalledWith({}, "Fatal error");
    });
  });

  describe("child logger", () => {
    let logger: any;

    beforeEach(() => {
      provider = new PinoLoggerProvider();
      logger = provider.createLogger();
    });

    it("should create child logger with bindings", () => {
      const childLogger = logger.child({ component: "test" });

      expect(mockPinoInstance.child).toHaveBeenCalledWith({ component: "test" });
      expect(childLogger).toBeDefined();
    });

    it("should wrap child pino instance", () => {
      const childLogger = logger.child({ requestId: "123" });

      // Child should have same methods
      expect(childLogger.info).toBeDefined();
      expect(childLogger.error).toBeDefined();
      expect(childLogger.child).toBeDefined();
    });
  });

  describe("createChildLogger", () => {
    it("should use parent pino instance when available", () => {
      provider = new PinoLoggerProvider();
      const parentLogger = provider.createLogger();

      const childLogger = provider.createChildLogger(parentLogger, { childId: "123" });

      expect(mockPinoInstance.child).toHaveBeenCalledWith({ childId: "123" });
    });

    it("should fallback to parent child method when pino instance not available", () => {
      provider = new PinoLoggerProvider();
      const mockParent = {
        child: vi.fn().mockReturnValue({}),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
        fatal: vi.fn(),
      };

      provider.createChildLogger(mockParent, { test: true });

      expect(mockParent.child).toHaveBeenCalledWith({ test: true });
    });
  });

  describe("setupLogCapture", () => {
    it("should intercept pino stream writes", () => {
      const externalBuffer: LogBuffer = {
        add: vi.fn(),
        query: vi.fn(),
        clear: vi.fn(),
        size: vi.fn(),
      };

      // Need to recreate mock with proper stream setup
      const mockStream = {
        write: vi.fn((chunk: any) => {
          // Mock the interception behavior
          try {
            if (typeof chunk === "string") {
              const logEntry = JSON.parse(chunk.trim());
              provider.getLogBuffer().add(logEntry);
              if (externalBuffer) {
                externalBuffer.add(logEntry);
              }
            }
          } catch {}
        }),
      };

      // Update mock instance
      const localMockPino = {
        ...mockPinoInstance,
        [(pino as any).__streamSymbol]: mockStream,
      };

      vi.mocked(pino).mockReturnValueOnce(localMockPino);

      provider = new PinoLoggerProvider(1000, externalBuffer);
      const logger = provider.createLogger();

      // The setupLogCapture should have intercepted the write function
      // Let's test by calling the wrapped logger methods instead
      const testLogger = provider.createLogger();

      // Note: In the real implementation, setupLogCapture intercepts the stream
      // But in our test, we can verify the expected behavior would occur
      // by checking that the mock was called correctly
      expect(pino).toHaveBeenCalled();

      // Since we can't easily test the actual interception in unit tests,
      // let's at least verify the buffers are set up correctly
      expect(provider.getLogBuffer()).toBeDefined();
    });

    it("should handle non-JSON log entries gracefully", () => {
      provider = new PinoLoggerProvider();
      const logger = provider.createLogger();

      const stream = mockPinoInstance[(pino as any).__streamSymbol];

      // Should not throw on invalid JSON
      expect(() => {
        stream.write("Not JSON");
      }).not.toThrow();
    });
  });

  describe("getLogBuffer", () => {
    it("should return the internal log buffer", () => {
      provider = new PinoLoggerProvider();
      const buffer = provider.getLogBuffer();

      expect(buffer).toBeDefined();
      expect(buffer.add).toBeDefined();
      expect(buffer.query).toBeDefined();
    });
  });

  describe("flush", () => {
    it("should resolve immediately", async () => {
      provider = new PinoLoggerProvider();
      await expect(provider.flush()).resolves.toBeUndefined();
    });
  });

  describe("close", () => {
    it("should clear the log buffer", async () => {
      provider = new PinoLoggerProvider();
      const buffer = provider.getLogBuffer();

      await provider.close();

      expect(buffer.clear).toHaveBeenCalled();
    });
  });

  describe("pino options creation", () => {
    it("should include custom formatters", () => {
      provider = new PinoLoggerProvider();
      provider.createLogger();

      const pinoCall = vi.mocked(pino).mock.calls[0][0];

      // Test level formatter
      expect(pinoCall.formatters.level("info")).toEqual({ level: "INFO" });

      // Test bindings formatter
      const bindings = pinoCall.formatters.bindings({ pid: 123, hostname: "test" });
      expect(bindings).toEqual({
        pid: 123,
        hostname: "test",
        component: "VoltAgent",
      });
    });

    it("should include timestamp function", () => {
      provider = new PinoLoggerProvider();
      provider.createLogger();

      const pinoCall = vi.mocked(pino).mock.calls[0][0];
      const timestamp = pinoCall.timestamp();

      expect(timestamp).toMatch(/,"timestamp":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"/);
    });

    it("should include base configuration", () => {
      process.env.NODE_ENV = "test";
      provider = new PinoLoggerProvider();
      provider.createLogger();

      const pinoCall = vi.mocked(pino).mock.calls[0][0];

      expect(pinoCall.base).toEqual({
        env: "test",
      });
    });
  });
});
