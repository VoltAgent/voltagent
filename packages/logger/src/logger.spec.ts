import { describe, it, expect } from "vitest";
import { createLogger, logger, getGlobalLogBuffer } from "./index";

describe("Logger", () => {
  it("should create a logger instance", () => {
    const log = createLogger();
    expect(log).toBeDefined();
    expect(log.info).toBeDefined();
    expect(log.error).toBeDefined();
    expect(log.debug).toBeDefined();
    expect(log.warn).toBeDefined();
  });

  it("should have buffer access methods", () => {
    const log = createLogger();
    expect(log.getBuffer).toBeDefined();
    expect(log.getProvider).toBeDefined();
  });

  it("should use the default logger", () => {
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
  });

  it("should access global log buffer", () => {
    const buffer = getGlobalLogBuffer();
    expect(buffer).toBeDefined();
    expect(buffer.add).toBeDefined();
    expect(buffer.query).toBeDefined();
    expect(buffer.clear).toBeDefined();
  });

  it("should create child loggers", () => {
    const parent = createLogger();
    const child = parent.child({ component: "test" });
    expect(child).toBeDefined();
    expect(child.info).toBeDefined();
  });
});
