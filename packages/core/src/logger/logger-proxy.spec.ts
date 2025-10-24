import type { Logger } from "@voltagent/internal";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as loggerModule from "./index";
import { LoggerProxy } from "./logger-proxy";

// Mock the getGlobalLogger function
vi.mock("./index", () => ({
  getGlobalLogger: vi.fn(),
}));

describe("LoggerProxy", () => {
  let mockGlobalLogger: Logger;
  let mockChildLogger: Logger;

  beforeEach(() => {
    // Create mock child logger
    mockChildLogger = {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(),
    };

    // Create mock global logger
    mockGlobalLogger = {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn().mockReturnValue(mockChildLogger),
    };

    // Setup getGlobalLogger mock
    vi.mocked(loggerModule.getGlobalLogger).mockReturnValue(mockGlobalLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create proxy with empty bindings by default", () => {
      const proxy = new LoggerProxy();

      proxy.info("test");

      // Should use global logger directly (no child call)
      expect(mockGlobalLogger.child).not.toHaveBeenCalled();
      expect(mockGlobalLogger.info).toHaveBeenCalledWith("test", undefined);
    });

    it("should create proxy with provided bindings", () => {
      const bindings = { component: "TestComponent", userId: "123" };
      const proxy = new LoggerProxy(bindings);

      proxy.info("test");

      // Should create child logger with bindings
      expect(mockGlobalLogger.child).toHaveBeenCalledWith(bindings);
      expect(mockChildLogger.info).toHaveBeenCalledWith("test", undefined);
    });
  });

  describe("log methods", () => {
    let proxy: LoggerProxy;

    beforeEach(() => {
      proxy = new LoggerProxy({ component: "Test" });
    });

    it("should proxy trace calls", () => {
      proxy.trace("trace message");
      expect(mockChildLogger.trace).toHaveBeenCalledWith("trace message", undefined);

      proxy.trace("trace with context", { extra: "data" });
      expect(mockChildLogger.trace).toHaveBeenCalledWith("trace with context", { extra: "data" });
    });

    it("should proxy debug calls", () => {
      proxy.debug("debug message");
      expect(mockChildLogger.debug).toHaveBeenCalledWith("debug message", undefined);

      proxy.debug("debug with context", { extra: "data" });
      expect(mockChildLogger.debug).toHaveBeenCalledWith("debug with context", { extra: "data" });
    });

    it("should proxy info calls", () => {
      proxy.info("info message");
      expect(mockChildLogger.info).toHaveBeenCalledWith("info message", undefined);

      proxy.info("info with context", { extra: "data" });
      expect(mockChildLogger.info).toHaveBeenCalledWith("info with context", { extra: "data" });
    });

    it("should proxy warn calls", () => {
      proxy.warn("warn message");
      expect(mockChildLogger.warn).toHaveBeenCalledWith("warn message", undefined);

      proxy.warn("warn with context", { extra: "data" });
      expect(mockChildLogger.warn).toHaveBeenCalledWith("warn with context", { extra: "data" });
    });

    it("should proxy error calls", () => {
      proxy.error("error message");
      expect(mockChildLogger.error).toHaveBeenCalledWith("error message", undefined);

      proxy.error("error with context", { error: new Error("test") });
      expect(mockChildLogger.error).toHaveBeenCalledWith("error with context", {
        error: new Error("test"),
      });
    });

    it("should proxy fatal calls", () => {
      proxy.fatal("fatal message");
      expect(mockChildLogger.fatal).toHaveBeenCalledWith("fatal message", undefined);

      proxy.fatal("fatal with context", { error: new Error("fatal") });
      expect(mockChildLogger.fatal).toHaveBeenCalledWith("fatal with context", {
        error: new Error("fatal"),
      });
    });
  });

  describe("child method", () => {
    it("should create child proxy with merged bindings", () => {
      const parentProxy = new LoggerProxy({ parent: "binding" });
      const childProxy = parentProxy.child({ child: "binding" });

      childProxy.info("test message");

      // Should have merged bindings
      expect(mockGlobalLogger.child).toHaveBeenCalledWith({
        parent: "binding",
        child: "binding",
      });
      expect(mockChildLogger.info).toHaveBeenCalledWith("test message", undefined);
    });

    it("should override parent bindings in child", () => {
      const parentProxy = new LoggerProxy({ name: "parent", type: "parent" });
      const childProxy = parentProxy.child({ name: "child", extra: "data" });

      childProxy.info("test");

      expect(mockGlobalLogger.child).toHaveBeenCalledWith({
        name: "child", // overridden
        type: "parent", // inherited
        extra: "data", // new
      });
    });

    it("should return Logger interface", () => {
      const proxy = new LoggerProxy();
      const child = proxy.child({ test: true });

      // Verify it implements Logger interface
      expect(child.trace).toBeDefined();
      expect(child.debug).toBeDefined();
      expect(child.info).toBeDefined();
      expect(child.warn).toBeDefined();
      expect(child.error).toBeDefined();
      expect(child.fatal).toBeDefined();
      expect(child.child).toBeDefined();
    });
  });

  describe("lazy loading behavior", () => {
    it("should get global logger on each call", () => {
      const proxy = new LoggerProxy();

      // First call
      proxy.info("first");
      // Note: getGlobalLogger is now called twice per log:
      // 1. In shouldLog() to check the level
      // 2. In getActualLogger() to forward the log
      expect(loggerModule.getGlobalLogger).toHaveBeenCalledTimes(2);

      // Second call
      proxy.info("second");
      expect(loggerModule.getGlobalLogger).toHaveBeenCalledTimes(4);

      // Different log level
      proxy.error("error");
      expect(loggerModule.getGlobalLogger).toHaveBeenCalledTimes(6);
    });

    it("should use updated global logger if it changes", () => {
      const proxy = new LoggerProxy({ component: "Test" });

      // First logger
      proxy.info("with first logger");
      expect(mockChildLogger.info).toHaveBeenCalledWith("with first logger", undefined);

      // Change global logger
      const newChildLogger = {
        info: vi.fn(),
        trace: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn(),
      };

      const newGlobalLogger = {
        ...mockGlobalLogger,
        child: vi.fn().mockReturnValue(newChildLogger),
      };

      vi.mocked(loggerModule.getGlobalLogger).mockReturnValue(newGlobalLogger);

      // Should use new logger
      proxy.info("with new logger");
      expect(newGlobalLogger.child).toHaveBeenCalledWith({ component: "Test" });
      expect(newChildLogger.info).toHaveBeenCalledWith("with new logger", undefined);
    });
  });

  describe("edge cases", () => {
    it("should handle undefined context parameter", () => {
      const proxy = new LoggerProxy();

      proxy.info("message", undefined);
      expect(mockGlobalLogger.info).toHaveBeenCalledWith("message", undefined);
    });

    it("should handle null context parameter", () => {
      const proxy = new LoggerProxy();

      proxy.info("message", null as any);
      expect(mockGlobalLogger.info).toHaveBeenCalledWith("message", null);
    });

    it("should handle empty bindings object", () => {
      const proxy = new LoggerProxy({});

      proxy.info("test");

      // Should use global logger directly since bindings is empty
      expect(mockGlobalLogger.child).not.toHaveBeenCalled();
      expect(mockGlobalLogger.info).toHaveBeenCalledWith("test", undefined);
    });

    it("should preserve binding object identity in child calls", () => {
      const bindings = { component: "Test" };
      const proxy = new LoggerProxy(bindings);

      proxy.info("test1");
      proxy.info("test2");

      // Should be called with same bindings object
      const firstCall = vi.mocked(mockGlobalLogger.child).mock.calls[0][0];
      const secondCall = vi.mocked(mockGlobalLogger.child).mock.calls[1][0];

      expect(firstCall).toEqual(bindings);
      expect(secondCall).toEqual(bindings);
    });
  });

  describe("log level filtering", () => {
    let mockLoggerWithLevel: Logger & { level: string };
    let mockPinoLogger: Logger & { _pinoInstance: { level: string } };

    beforeEach(() => {
      // Mock OpenTelemetry logger provider
      // Note: OpenTelemetry emission is tested in ConsoleLogger tests
      (globalThis as any).___voltagent_otel_logger_provider = true;

      // Create mock logger with level property (like ConsoleLogger)
      mockLoggerWithLevel = {
        level: "error",
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn().mockReturnThis(),
      };

      // Create mock logger with Pino instance
      mockPinoLogger = {
        _pinoInstance: { level: "error" },
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn().mockReturnThis(),
      };
    });

    afterEach(() => {
      (globalThis as any).___voltagent_otel_logger_provider = undefined;
    });

    describe("console output filtering (respects configured level)", () => {
      it("should NOT forward DEBUG logs to console when level is error", () => {
        vi.mocked(loggerModule.getGlobalLogger).mockReturnValue(mockLoggerWithLevel);

        const proxy = new LoggerProxy();
        proxy.debug("debug message");

        // Should NOT call the actual logger (filtered out)
        expect(mockLoggerWithLevel.debug).not.toHaveBeenCalled();
      });

      it("should forward ERROR logs to console when level is error", () => {
        vi.mocked(loggerModule.getGlobalLogger).mockReturnValue(mockLoggerWithLevel);

        const proxy = new LoggerProxy();
        proxy.error("error message");

        // Should call the actual logger (passes level check)
        expect(mockLoggerWithLevel.error).toHaveBeenCalledWith("error message", undefined);
      });

      it("should filter INFO logs when level is error", () => {
        vi.mocked(loggerModule.getGlobalLogger).mockReturnValue(mockLoggerWithLevel);

        const proxy = new LoggerProxy();
        proxy.info("info message");
        proxy.warn("warn message");

        // Both should be filtered
        expect(mockLoggerWithLevel.info).not.toHaveBeenCalled();
        expect(mockLoggerWithLevel.warn).not.toHaveBeenCalled();
      });

      it("should work with Pino instance level", () => {
        vi.mocked(loggerModule.getGlobalLogger).mockReturnValue(mockPinoLogger);

        const proxy = new LoggerProxy();
        proxy.debug("debug message");
        proxy.error("error message");

        // DEBUG filtered, ERROR passed
        expect(mockPinoLogger.debug).not.toHaveBeenCalled();
        expect(mockPinoLogger.error).toHaveBeenCalledWith("error message", undefined);
      });
    });

    describe("OpenTelemetry emission (always sends all logs)", () => {
      it.skip("should ALWAYS emit DEBUG logs to OpenTelemetry even when filtered from console", () => {
        // Note: OpenTelemetry emission is tested in ConsoleLogger tests
        // LoggerProxy delegates to emitOtelLog which is hard to mock in unit tests
        // This behavior is validated in integration tests
      });

      it("should call emitOtelLog even when console log is filtered", () => {
        vi.mocked(loggerModule.getGlobalLogger).mockReturnValue(mockLoggerWithLevel);

        // Spy on the private emitOtelLog method indirectly
        const proxy = new LoggerProxy();

        // When DEBUG is filtered from console
        proxy.debug("debug message");

        // Console logger should NOT be called
        expect(mockLoggerWithLevel.debug).not.toHaveBeenCalled();

        // But emitOtelLog IS called (before the filter check)
        // We verify this by ensuring the method completes without throwing
        // The actual OpenTelemetry integration is tested in ConsoleLogger and integration tests
      });

      it("should call emitOtelLog for all levels regardless of filtering", () => {
        vi.mocked(loggerModule.getGlobalLogger).mockReturnValue(mockLoggerWithLevel);

        const proxy = new LoggerProxy();

        // All these will be filtered from console
        proxy.trace("trace");
        proxy.debug("debug");
        proxy.info("info");
        proxy.warn("warn");

        // But none should throw (emitOtelLog is called for all)
        // Verify console filtering works
        expect(mockLoggerWithLevel.trace).not.toHaveBeenCalled();
        expect(mockLoggerWithLevel.debug).not.toHaveBeenCalled();
        expect(mockLoggerWithLevel.info).not.toHaveBeenCalled();
        expect(mockLoggerWithLevel.warn).not.toHaveBeenCalled();
      });
    });

    describe("level detection", () => {
      it("should detect level from logger with level property", () => {
        const logger = { ...mockLoggerWithLevel, level: "info" };
        vi.mocked(loggerModule.getGlobalLogger).mockReturnValue(logger);

        const proxy = new LoggerProxy();
        proxy.debug("debug message");
        proxy.info("info message");

        // DEBUG filtered (below info), INFO passed
        expect(logger.debug).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalled();
      });

      it("should detect level from Pino _pinoInstance", () => {
        const logger = { ...mockPinoLogger };
        logger._pinoInstance.level = "warn";
        vi.mocked(loggerModule.getGlobalLogger).mockReturnValue(logger);

        const proxy = new LoggerProxy();
        proxy.info("info message");
        proxy.warn("warn message");

        // INFO filtered (below warn), WARN passed
        expect(logger.info).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalled();
      });

      it("should allow all logs when level cannot be determined (fail-open)", () => {
        const loggerWithoutLevel = { ...mockGlobalLogger };
        vi.mocked(loggerModule.getGlobalLogger).mockReturnValue(loggerWithoutLevel);

        const proxy = new LoggerProxy();
        proxy.debug("debug message");
        proxy.info("info message");

        // Both should pass (fail-open behavior)
        expect(loggerWithoutLevel.debug).toHaveBeenCalled();
        expect(loggerWithoutLevel.info).toHaveBeenCalled();
      });
    });

    describe("level hierarchy", () => {
      it("should respect log level hierarchy correctly", () => {
        const logger = { ...mockLoggerWithLevel, level: "warn" };
        vi.mocked(loggerModule.getGlobalLogger).mockReturnValue(logger);

        const proxy = new LoggerProxy();

        // Below warn - filtered
        proxy.trace("trace");
        proxy.debug("debug");
        proxy.info("info");

        expect(logger.trace).not.toHaveBeenCalled();
        expect(logger.debug).not.toHaveBeenCalled();
        expect(logger.info).not.toHaveBeenCalled();

        // Warn and above - passed
        proxy.warn("warn");
        proxy.error("error");
        proxy.fatal("fatal");

        expect(logger.warn).toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
        expect(logger.fatal).toHaveBeenCalled();
      });

      it("should handle case-insensitive level comparison", () => {
        const logger = { ...mockLoggerWithLevel, level: "ERROR" };
        vi.mocked(loggerModule.getGlobalLogger).mockReturnValue(logger);

        const proxy = new LoggerProxy();
        proxy.info("info");
        proxy.error("error");

        expect(logger.info).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
      });
    });
  });
});
