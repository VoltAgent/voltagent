import devLogger from "./index";

describe("devLogger", () => {
  let consoleSpy: {
    info: vi.SpyInstance;
    warn: vi.SpyInstance;
    error: vi.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = undefined;
  });

  describe("when NODE_ENV is development", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    describe("info", () => {
      it("should log info message to console", () => {
        const message = "Test info message";
        const args = ["arg1", "arg2"];

        devLogger.info(message, ...args);

        expect(consoleSpy.info).toHaveBeenCalledTimes(1);
        expect(consoleSpy.info).toHaveBeenCalledWith(
          expect.stringMatching(
            /^\[VoltAgent\] \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] INFO: $/,
          ),
          message,
          ...args,
        );
      });

      it("should log without additional arguments", () => {
        const message = "Test info message";

        devLogger.info(message);

        expect(consoleSpy.info).toHaveBeenCalledTimes(1);
        expect(consoleSpy.info).toHaveBeenCalledWith(
          expect.stringMatching(
            /^\[VoltAgent\] \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] INFO: $/,
          ),
          message,
        );
      });

      it("should log without any arguments", () => {
        devLogger.info();

        expect(consoleSpy.info).toHaveBeenCalledTimes(1);
        expect(consoleSpy.info).toHaveBeenCalledWith(
          expect.stringMatching(
            /^\[VoltAgent\] \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] INFO: $/,
          ),
          undefined,
        );
      });
    });

    describe("warn", () => {
      it("should log warning message to console", () => {
        const message = "Test warning message";
        const args = ["arg1", "arg2"];

        devLogger.warn(message, ...args);

        expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
        expect(consoleSpy.warn).toHaveBeenCalledWith(
          expect.stringMatching(
            /^\[VoltAgent\] \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] WARN: $/,
          ),
          message,
          ...args,
        );
      });

      it("should log without additional arguments", () => {
        const message = "Test warning message";

        devLogger.warn(message);

        expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
        expect(consoleSpy.warn).toHaveBeenCalledWith(
          expect.stringMatching(
            /^\[VoltAgent\] \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] WARN: $/,
          ),
          message,
        );
      });
    });

    describe("error", () => {
      it("should log error message to console", () => {
        const message = "Test error message";
        const args = ["arg1", "arg2"];

        devLogger.error(message, ...args);

        expect(consoleSpy.error).toHaveBeenCalledTimes(1);
        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringMatching(
            /^\[VoltAgent\] \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] ERROR: $/,
          ),
          message,
          ...args,
        );
      });

      it("should log without additional arguments", () => {
        const message = "Test error message";

        devLogger.error(message);

        expect(consoleSpy.error).toHaveBeenCalledTimes(1);
        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringMatching(
            /^\[VoltAgent\] \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] ERROR: $/,
          ),
          message,
        );
      });
    });

    describe("log format", () => {
      it("should format log prefix correctly", () => {
        const fixedDate = new Date("2023-01-01T12:00:00.000Z");
        vi.spyOn(global, "Date").mockImplementation(() => fixedDate as any);

        devLogger.info("test message");

        expect(consoleSpy.info).toHaveBeenCalledWith(
          "[VoltAgent] [2023-01-01 12:00:00.000] INFO: ",
          "test message",
        );

        vi.restoreAllMocks();
      });
    });
  });

  describe("when NODE_ENV is not development", () => {
    const testCases = [
      { env: "production", description: "production" },
      { env: "test", description: "test" },
      { env: undefined, description: "undefined" },
      { env: "", description: "empty string" },
    ];

    testCases.forEach(({ env, description }) => {
      describe(`when NODE_ENV is ${description}`, () => {
        beforeEach(() => {
          if (env === undefined) {
            process.env.NODE_ENV = undefined;
          } else {
            process.env.NODE_ENV = env;
          }
        });

        it("should not log info messages", () => {
          devLogger.info("Test message");
          expect(consoleSpy.info).not.toHaveBeenCalled();
        });

        it("should not log warning messages", () => {
          devLogger.warn("Test message");
          expect(consoleSpy.warn).not.toHaveBeenCalled();
        });

        it("should not log error messages", () => {
          devLogger.error("Test message");
          expect(consoleSpy.error).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe("multiple log calls", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    it("should handle multiple consecutive log calls", () => {
      devLogger.info("First message");
      devLogger.warn("Second message");
      devLogger.error("Third message");

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it("should maintain separate timestamps for each call", () => {
      devLogger.info("First message");
      devLogger.info("Second message");

      expect(consoleSpy.info).toHaveBeenCalledTimes(2);

      const firstCall = consoleSpy.info.mock.calls[0][0];
      const secondCall = consoleSpy.info.mock.calls[1][0];

      // Both should have valid timestamp format but might be different
      expect(firstCall).toMatch(
        /^\[VoltAgent\] \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] INFO: $/,
      );
      expect(secondCall).toMatch(
        /^\[VoltAgent\] \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] INFO: $/,
      );
    });
  });

  describe("edge cases", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    it("should handle null message", () => {
      devLogger.info(null);
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\[VoltAgent\] \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] INFO: $/,
        ),
        null,
      );
    });

    it("should handle object messages", () => {
      const obj = { key: "value", number: 123 };
      devLogger.info(obj);
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\[VoltAgent\] \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] INFO: $/,
        ),
        obj,
      );
    });

    it("should handle mixed argument types", () => {
      const args = ["string", 123, { obj: true }, null, undefined];
      devLogger.warn("Mixed args:", ...args);
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\[VoltAgent\] \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] WARN: $/,
        ),
        "Mixed args:",
        ...args,
      );
    });
  });
});
