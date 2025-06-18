/**
 * VoltAgent Default Configuration
 *
 * This file centralizes all default values used throughout the VoltAgent framework.
 * Values can be overridden via environment variables or command-line options.
 *
 * Environment Variable Format:
 * - VOLTAGENT_<DOMAIN>_<KEY> (e.g., VOLTAGENT_SERVER_PORT=4000)
 * - Use underscores for nested keys (e.g., VOLTAGENT_PLAYWRIGHT_DEFAULT_TIMEOUT=60000)
 *
 * Command Line Option Format:
 * - --<domain>-<key> (e.g., --server-port=4000)
 * - --<domain>-<nested-key> (e.g., --playwright-default-timeout=60000)
 *
 * @example
 * ```typescript
 * import { defaults } from './defaults';
 *
 * // Use default values
 * const timeout = defaults.network.timeout;
 * const port = defaults.server.port;
 *
 * // Access nested values
 * const playwrightTimeout = defaults.playwright.defaultTimeout;
 * ```
 */

// Use global process variable which is available in Node.js environment
const argv = process.argv;

// Helper function to parse command line arguments
function parseArgv(): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      if (key && value) {
        args[key] = value;
      } else if (key && argv[i + 1] && !argv[i + 1].startsWith("--")) {
        args[key] = argv[i + 1];
        i++; // Skip the next argument as it's the value
      }
    }
  }
  return args;
}

// Helper function to get environment variable or command line value
function getConfigValue<T>(
  domain: string,
  key: string,
  defaultValue: T,
  transform?: (value: string) => T,
): T {
  const envKey = `VOLTAGENT_${domain.toUpperCase()}_${key.toUpperCase()}`;
  const cliKey = `${domain.toLowerCase()}-${key.toLowerCase().replace(/_/g, "-")}`;

  const envValue = process.env[envKey];
  const cliValue = cliArgs[cliKey];

  const configValue = cliValue || envValue;

  if (configValue !== undefined) {
    if (transform) {
      try {
        return transform(configValue);
      } catch (error) {
        console.warn(`Failed to parse config value for ${envKey}: ${error}`);
        return defaultValue;
      }
    }

    // Auto-detect type conversion
    if (typeof defaultValue === "number") {
      const parsed = Number(configValue);
      return isNaN(parsed) ? defaultValue : (parsed as T);
    }

    if (typeof defaultValue === "boolean") {
      return (configValue.toLowerCase() === "true" || configValue === "1") as T;
    }

    return configValue as T;
  }

  return defaultValue;
}

// Parse command line arguments once
const cliArgs = parseArgv();

/**
 * Centralized default configuration for VoltAgent
 */
export const defaults = {
  // Server Configuration
  server: {
    port: getConfigValue("SERVER", "PORT", 3141),
    autoStart: getConfigValue("SERVER", "AUTO_START", true),
    enableSwaggerUI: getConfigValue(
      "SERVER",
      "ENABLE_SWAGGER_UI",
      process.env.NODE_ENV !== "production",
    ),
    preferredPorts: [3141, 4310, 1337, 4242] as const,
  },

  // Network Configuration
  network: {
    timeout: getConfigValue("NETWORK", "TIMEOUT", 30000),
    maxRetries: getConfigValue("NETWORK", "MAX_RETRIES", 3),
    retryDelay: getConfigValue("NETWORK", "RETRY_DELAY", 1000),
    connectTimeout: getConfigValue("NETWORK", "CONNECT_TIMEOUT", 10000),
  },

  // MCP (Model Context Protocol) Configuration
  mcp: {
    timeout: getConfigValue("MCP", "TIMEOUT", 30000),
    fallbackToProvider: getConfigValue("MCP", "FALLBACK_TO_PROVIDER", false),
    enabled: getConfigValue("MCP", "ENABLED", true),
  },

  // Playwright Browser Automation
  playwright: {
    defaultTimeout: getConfigValue("PLAYWRIGHT", "DEFAULT_TIMEOUT", 30000),
    navigationTimeout: getConfigValue("PLAYWRIGHT", "NAVIGATION_TIMEOUT", 60000),
    slowMotion: getConfigValue("PLAYWRIGHT", "SLOW_MOTION", 50),
    headless: getConfigValue("PLAYWRIGHT", "HEADLESS", process.env.NODE_ENV === "production"),
    waitForElementTimeout: getConfigValue("PLAYWRIGHT", "WAIT_FOR_ELEMENT_TIMEOUT", 30000),
    typingDelay: getConfigValue("PLAYWRIGHT", "TYPING_DELAY", 50),
    viewportWidth: getConfigValue("PLAYWRIGHT", "VIEWPORT_WIDTH", 1280),
    viewportHeight: getConfigValue("PLAYWRIGHT", "VIEWPORT_HEIGHT", 720),
    deviceScaleFactor: getConfigValue("PLAYWRIGHT", "DEVICE_SCALE_FACTOR", 1),
    initializationWaitTime: getConfigValue("PLAYWRIGHT", "INITIALIZATION_WAIT_TIME", 100),
  },

  // Voice Configuration
  voice: {
    openai: {
      speechModel: getConfigValue("VOICE_OPENAI", "SPEECH_MODEL", "gpt-4o-mini-transcribe"),
      ttsModel: getConfigValue("VOICE_OPENAI", "TTS_MODEL", "tts-1"),
      voice: getConfigValue("VOICE_OPENAI", "VOICE", "alloy"),
      timeout: getConfigValue("VOICE_OPENAI", "TIMEOUT", 30000),
      maxRetries: getConfigValue("VOICE_OPENAI", "MAX_RETRIES", 3),
    },
    elevenlabs: {
      speechModel: getConfigValue("VOICE_ELEVENLABS", "SPEECH_MODEL", "scribe_v1"),
      ttsModel: getConfigValue("VOICE_ELEVENLABS", "TTS_MODEL", "eleven_multilingual_v2"),
      voice: getConfigValue("VOICE_ELEVENLABS", "VOICE", "Callum"),
      timeout: getConfigValue("VOICE_ELEVENLABS", "TIMEOUT", 30000),
      maxRetries: getConfigValue("VOICE_ELEVENLABS", "MAX_RETRIES", 3),
      stability: getConfigValue("VOICE_ELEVENLABS", "STABILITY", 0.5),
      similarityBoost: getConfigValue("VOICE_ELEVENLABS", "SIMILARITY_BOOST", 0.75),
      style: getConfigValue("VOICE_ELEVENLABS", "STYLE", 0),
      useSpeakerBoost: getConfigValue("VOICE_ELEVENLABS", "USE_SPEAKER_BOOST", true),
    },
  },

  // Memory Configuration (Legacy - use database.* instead)
  memory: {
    libsql: {
      debugDelayMin: getConfigValue("MEMORY_LIBSQL", "DEBUG_DELAY_MIN", 0),
      debugDelayMax: getConfigValue("MEMORY_LIBSQL", "DEBUG_DELAY_MAX", 0),
    },
  },

  // Tool Configuration
  tools: {
    defaultTimeout: getConfigValue("TOOLS", "DEFAULT_TIMEOUT", 30000),
    defaultRetries: getConfigValue("TOOLS", "DEFAULT_RETRIES", 3),
    reasoning: {
      defaultInstructions: getConfigValue("TOOLS_REASONING", "DEFAULT_INSTRUCTIONS", ""),
    },
  },

  // Retriever Configuration
  retriever: {
    defaultToolName: getConfigValue("RETRIEVER", "DEFAULT_TOOL_NAME", "search_knowledge"),
    defaultToolDescription: getConfigValue(
      "RETRIEVER",
      "DEFAULT_TOOL_DESCRIPTION",
      "Searches for relevant information in the knowledge base based on the query.",
    ),
  },

  // UI/Animation Configuration
  ui: {
    animationDelay: getConfigValue("UI", "ANIMATION_DELAY", 300),
    typingSpeed: getConfigValue("UI", "TYPING_SPEED", 500),
    pauseAfterTyping: getConfigValue("UI", "PAUSE_AFTER_TYPING", 1500),
    easterEggDuration: getConfigValue("UI", "EASTER_EGG_DURATION", 60000),
    copyIndicatorDuration: getConfigValue("UI", "COPY_INDICATOR_DURATION", 2000),
    executionVisibilityDelay: getConfigValue("UI", "EXECUTION_VISIBILITY_DELAY", 2000),
    thinkingVisibilityDelay: getConfigValue("UI", "THINKING_VISIBILITY_DELAY", 2000),
    deploymentRestartDelay: getConfigValue("UI", "DEPLOYMENT_RESTART_DELAY", 2000),
  },

  // CLI Configuration
  cli: {
    checkFrequency: getConfigValue("CLI", "CHECK_FREQUENCY", "daily"),
    showAnnouncements: getConfigValue("CLI", "SHOW_ANNOUNCEMENTS", true),
    dayInMs: 24 * 60 * 60 * 1000, // This is a calculated constant, not configurable
    weekInMs: 7 * 24 * 60 * 60 * 1000, // This is a calculated constant, not configurable
  },

  // Telemetry Configuration
  telemetry: {
    defaultAgentId: getConfigValue("TELEMETRY", "DEFAULT_AGENT_ID", "default-agent"),
    hrTimeToMillisMultiplier: 1e6, // Constant for time conversion
  },

  // Development Configuration
  development: {
    logLevel: getConfigValue("DEV", "LOG_LEVEL", "info"),
    enableDebugMode: getConfigValue("DEV", "ENABLE_DEBUG_MODE", false),
  },

  // OpenTelemetry Configuration
  opentelemetry: {
    serviceName: getConfigValue("OTEL", "SERVICE_NAME", "voltagent"),
    serviceVersion: getConfigValue("OTEL", "SERVICE_VERSION", "1.0.0"),
  },

  // Google AI Configuration
  googleAI: {
    defaultTimeout: getConfigValue("GOOGLE_AI", "DEFAULT_TIMEOUT", 30000),
    maxRetries: getConfigValue("GOOGLE_AI", "MAX_RETRIES", 3),
  },

  // Vercel AI Configuration
  vercelAI: {
    defaultTimeout: getConfigValue("VERCEL_AI", "DEFAULT_TIMEOUT", 30000),
    maxRetries: getConfigValue("VERCEL_AI", "MAX_RETRIES", 3),
  },

  // SDK Configuration
  sdk: {
    clientTimeout: getConfigValue("SDK", "CLIENT_TIMEOUT", 30000),
    flushInterval: getConfigValue("SDK", "FLUSH_INTERVAL", 5000),
  },

  // Database Configuration
  database: {
    // PostgreSQL Configuration
    postgres: {
      port: getConfigValue("DB_POSTGRES", "PORT", 5432),
      maxConnections: getConfigValue("DB_POSTGRES", "MAX_CONNECTIONS", 10),
      ssl: getConfigValue("DB_POSTGRES", "SSL", false),
      storageLimit: getConfigValue("DB_POSTGRES", "STORAGE_LIMIT", 100),
      tablePrefix: getConfigValue("DB_POSTGRES", "TABLE_PREFIX", "voltagent_memory"),
    },
    // LibSQL/Turso Configuration
    libsql: {
      storageLimit: getConfigValue("DB_LIBSQL", "STORAGE_LIMIT", 100),
      tablePrefix: getConfigValue("DB_LIBSQL", "TABLE_PREFIX", "voltagent_memory"),
      debugDelayMin: getConfigValue("DB_LIBSQL", "DEBUG_DELAY_MIN", 0),
      debugDelayMax: getConfigValue("DB_LIBSQL", "DEBUG_DELAY_MAX", 0),
    },
    // Supabase Configuration
    supabase: {
      storageLimit: getConfigValue("DB_SUPABASE", "STORAGE_LIMIT", 100),
      tablePrefix: getConfigValue("DB_SUPABASE", "TABLE_PREFIX", "voltagent_memory"),
    },
  },
} as const;

/**
 * Type-safe access to default configuration
 */
export type DefaultsConfig = typeof defaults;

/**
 * Helper function to override defaults with custom values
 * @param overrides Partial configuration to override defaults
 * @returns Merged configuration
 */
export function withDefaults<T extends Partial<DefaultsConfig>>(overrides: T): DefaultsConfig & T {
  return { ...defaults, ...overrides };
}

/**
 * Helper function to get a specific default value with type safety
 * @param path Dot-notation path to the configuration value
 * @returns The configuration value
 */
export function getDefault<K extends keyof DefaultsConfig>(domain: K): DefaultsConfig[K];
export function getDefault<K extends keyof DefaultsConfig, T extends keyof DefaultsConfig[K]>(
  domain: K,
  key: T,
): DefaultsConfig[K][T];
export function getDefault<K extends keyof DefaultsConfig, T extends keyof DefaultsConfig[K]>(
  domain: K,
  key?: T,
): DefaultsConfig[K] | DefaultsConfig[K][T] {
  if (key === undefined) {
    return defaults[domain];
  }
  return defaults[domain][key];
}

/**
 * Display current configuration (useful for debugging)
 */
export function printDefaults(): void {
  console.log("VoltAgent Configuration:");
  console.log(JSON.stringify(defaults, null, 2));
}

/**
 * Validate configuration and warn about invalid values
 */
export function validateDefaults(): void {
  const warnings: string[] = [];

  // Validate network timeouts
  if (defaults.network.timeout <= 0) {
    warnings.push("Network timeout should be positive");
  }

  // Validate server port
  if (defaults.server.port < 1024 || defaults.server.port > 65535) {
    warnings.push("Server port should be between 1024 and 65535");
  }

  // Validate Playwright timeouts
  if (defaults.playwright.defaultTimeout <= 0) {
    warnings.push("Playwright default timeout should be positive");
  }

  if (warnings.length > 0) {
    console.warn("Configuration warnings:");
    warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }
}

// Validate configuration on import
validateDefaults();
