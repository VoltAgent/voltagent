import { describe, it, expect } from "vitest";
import { createPinoLogger, getGlobalLogBuffer } from "./index";

describe("Logger", () => {
  it("should create a logger instance", () => {
    const log = createPinoLogger();
    expect(log).toBeDefined();
    expect(log.info).toBeDefined();
    expect(log.error).toBeDefined();
    expect(log.debug).toBeDefined();
    expect(log.warn).toBeDefined();
  });

  it("should have buffer access methods", () => {
    const log = createPinoLogger();
    expect(log.getBuffer).toBeDefined();
    expect(log.getProvider).toBeDefined();
  });

  it.skip("should access global log buffer", () => {
    // Buffer management moved to core
    const buffer = getGlobalLogBuffer();
    expect(buffer).toBeDefined();
    expect(buffer.add).toBeDefined();
    expect(buffer.query).toBeDefined();
    expect(buffer.clear).toBeDefined();
  });

  it("should create child loggers", () => {
    const parent = createPinoLogger();
    const child = parent.child({ component: "test" });
    expect(child).toBeDefined();
    expect(child.info).toBeDefined();
  });
});
