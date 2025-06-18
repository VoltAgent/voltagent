export interface DevLoggerOptions {
  dev: boolean | (() => boolean);
}

/**
 * A logger for development purposes, that will not pollute the production logs (aka if process.env.NODE_ENV is not "development").
 *
 * @example
 * ```typescript
 * devLogger.info("Hello, world!");
 * ```
 */
export function createDevLogger(options?: DevLoggerOptions) {
  const isDev =
    typeof options?.dev === "function" ? options.dev : () => options?.dev ?? isDevNodeEnv();

  return {
    /**
     * Log a message to the console if the environment is development. This will NOT be logged if process.env.NODE_ENV is not "development".
     *
     * @example
     * ```typescript
     * devLogger.info("Hello, world!");
     *
     * // output: [VoltAgent] [2021-01-01T00:00:00.000Z] INFO: Hello, world!
     * ```
     *
     * @param message - The message to log.
     * @param args - The arguments to log.
     */
    info: (message?: any, ...args: any[]) => {
      if (isDev()) {
        console.info(formatLogPrefix("INFO"), message, ...args);
      }
    },
    /**
     * Log a warning message to the console if the environment is development. This will NOT be logged if process.env.NODE_ENV is not "development".
     *
     * @example
     * ```typescript
     * devLogger.warn("Hello, world!");
     *
     * // output: [VoltAgent] [2021-01-01T00:00:00.000Z] WARN: Hello, world!
     * ```
     *
     * @param message - The message to log.
     * @param args - The arguments to log.
     */
    warn: (message?: any, ...args: any[]) => {
      if (isDev()) {
        console.warn(formatLogPrefix("WARN"), message, ...args);
      }
    },
    /**
     * Log a warning message to the console if the environment is development.
     *
     * @example
     * ```typescript
     * devLogger.error("Hello, world!");
     *
     * // output: [VoltAgent] [2021-01-01T00:00:00.000Z] ERROR: Hello, world!
     * ```
     *
     * @param message - The message to log.
     * @param args - The arguments to log.
     */
    error: (message?: any, ...args: any[]) => {
      if (isDev()) {
        console.error(formatLogPrefix("ERROR"), message, ...args);
      }
    },
  };
}

export default createDevLogger();

function isDevNodeEnv() {
  return process.env.NODE_ENV === "development";
}

function formatLogPrefix(level: "INFO" | "WARN" | "ERROR"): string {
  return `[VoltAgent] [${timestamp()}] ${level}: `;
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, -1);
}
