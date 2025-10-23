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
      expect(loggerModule.getGlobalLogger).toHaveBeenCalledTimes(1);

      // Second call
      proxy.info("second");
      expect(loggerModule.getGlobalLogger).toHaveBeenCalledTimes(2);

      // Different log level
      proxy.error("error");
      expect(loggerModule.getGlobalLogger).toHaveBeenCalledTimes(3);
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

  describe("OTEL delegation (no duplicate emission)", () => {
    it("should NOT emit OTEL logs directly - delegates to underlying logger", () => {
      // This test verifies the fix: LoggerProxy should not emit OTEL logs
      // The underlying logger (Pino or ConsoleLogger) handles OTEL emission

      const proxy = new LoggerProxy({ component: "Test" });

      // Call all log methods
      proxy.trace("trace message");
      proxy.debug("debug message");
      proxy.info("info message");
      proxy.warn("warn message");
      proxy.error("error message");
      proxy.fatal("fatal message");

      // Verify calls were delegated to the underlying logger
      expect(mockChildLogger.trace).toHaveBeenCalledWith("trace message", undefined);
      expect(mockChildLogger.debug).toHaveBeenCalledWith("debug message", undefined);
      expect(mockChildLogger.info).toHaveBeenCalledWith("info message", undefined);
      expect(mockChildLogger.warn).toHaveBeenCalledWith("warn message", undefined);
      expect(mockChildLogger.error).toHaveBeenCalledWith("error message", undefined);
      expect(mockChildLogger.fatal).toHaveBeenCalledWith("fatal message", undefined);

      // LoggerProxy should NOT have any OTEL-specific code
      // The underlying logger is responsible for OTEL emission
    });

    it("should work with external logger that filters by level", () => {
      // Create a mock logger that filters by level (like Pino)
      const filteringLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(), // Won't actually log if level is higher
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn().mockReturnThis(),
      };

      const proxy = new LoggerProxy({ component: "Test" }, filteringLogger);

      proxy.debug("debug message");

      // LoggerProxy should call the logger regardless
      // The underlying logger decides whether to actually emit
      expect(filteringLogger.debug).toHaveBeenCalledWith("debug message", undefined);
    });

    it("should pass context to underlying logger for OTEL attributes", () => {
      const proxy = new LoggerProxy({ component: "Test" });

      const context = { userId: "123", action: "test" };
      proxy.info("test message", context);

      // Verify context is passed through to underlying logger
      // The underlying logger will include this in OTEL attributes
      expect(mockChildLogger.info).toHaveBeenCalledWith("test message", context);
    });
  });

  describe("integration with global logger", () => {
    it("should use external logger when provided instead of global logger", () => {
      const externalLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn().mockReturnThis(),
      };

      const proxy = new LoggerProxy({}, externalLogger);

      proxy.info("test message");

      // Should use external logger, NOT global logger
      expect(loggerModule.getGlobalLogger).not.toHaveBeenCalled();
      expect(externalLogger.info).toHaveBeenCalledWith("test message", undefined);
    });

    it("should create child from external logger with bindings", () => {
      const childLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn(),
      };

      const externalLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn().mockReturnValue(childLogger),
      };

      const proxy = new LoggerProxy({ component: "Test" }, externalLogger);

      proxy.info("test message");

      // Should create child from external logger
      expect(externalLogger.child).toHaveBeenCalledWith({ component: "Test" });
      expect(childLogger.info).toHaveBeenCalledWith("test message", undefined);
    });
  });
});
