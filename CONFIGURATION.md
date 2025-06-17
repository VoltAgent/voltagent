# VoltAgent Configuration Guide

VoltAgent uses a centralized configuration system to eliminate hardcoded values and make the framework highly customizable. All default values are defined in `defaults.ts` at the root of the project.

## 🎯 Quick Start

```typescript
import { defaults } from "./defaults";

// Use default values directly
const timeout = defaults.network.timeout;
const port = defaults.server.port;

// Access nested configuration
const playwrightTimeout = defaults.playwright.defaultTimeout;
```

## 📝 Configuration Methods

### 1. Environment Variables

Set environment variables using the format `VOLTAGENT_<DOMAIN>_<KEY>`:

```bash
# Server configuration
export VOLTAGENT_SERVER_PORT=4000
export VOLTAGENT_SERVER_AUTO_START=false

# Network configuration
export VOLTAGENT_NETWORK_TIMEOUT=60000
export VOLTAGENT_NETWORK_MAX_RETRIES=5

# Playwright configuration
export VOLTAGENT_PLAYWRIGHT_DEFAULT_TIMEOUT=45000
export VOLTAGENT_PLAYWRIGHT_HEADLESS=true
```

### 2. Command Line Arguments

Use command line arguments with the format `--<domain>-<key>`:

```bash
# Run with custom configuration
node your-app.js --server-port=4000 --playwright-headless=true

# Multiple arguments
node your-app.js \
  --server-port=3000 \
  --network-timeout=45000 \
  --playwright-default-timeout=60000
```

### 3. Programmatic Override

```typescript
import { defaults, withDefaults } from "./defaults";

// Override specific values
const customConfig = withDefaults({
  server: {
    port: 4000,
    autoStart: false,
  },
  network: {
    timeout: 60000,
  },
});

// Use the merged configuration
const port = customConfig.server.port; // 4000
```

## 🏗️ Configuration Domains

### Server Configuration

```typescript
defaults.server = {
  port: 3141, // VOLTAGENT_SERVER_PORT
  autoStart: true, // VOLTAGENT_SERVER_AUTO_START
  enableSwaggerUI: true, // VOLTAGENT_SERVER_ENABLE_SWAGGER_UI
  preferredPorts: [3141, 4310, 1337, 4242],
};
```

### Network Configuration

```typescript
defaults.network = {
  timeout: 30000, // VOLTAGENT_NETWORK_TIMEOUT
  maxRetries: 3, // VOLTAGENT_NETWORK_MAX_RETRIES
  retryDelay: 1000, // VOLTAGENT_NETWORK_RETRY_DELAY
  connectTimeout: 10000, // VOLTAGENT_NETWORK_CONNECT_TIMEOUT
};
```

### Playwright Browser Automation

```typescript
defaults.playwright = {
  defaultTimeout: 30000, // VOLTAGENT_PLAYWRIGHT_DEFAULT_TIMEOUT
  navigationTimeout: 60000, // VOLTAGENT_PLAYWRIGHT_NAVIGATION_TIMEOUT
  slowMotion: 50, // VOLTAGENT_PLAYWRIGHT_SLOW_MOTION
  headless: true, // VOLTAGENT_PLAYWRIGHT_HEADLESS
  waitForElementTimeout: 30000, // VOLTAGENT_PLAYWRIGHT_WAIT_FOR_ELEMENT_TIMEOUT
  typingDelay: 50, // VOLTAGENT_PLAYWRIGHT_TYPING_DELAY
  viewportWidth: 1280, // VOLTAGENT_PLAYWRIGHT_VIEWPORT_WIDTH
  viewportHeight: 720, // VOLTAGENT_PLAYWRIGHT_VIEWPORT_HEIGHT
};
```

### Voice Configuration

```typescript
defaults.voice = {
  openai: {
    speechModel: "gpt-4o-mini-transcribe", // VOLTAGENT_VOICE_OPENAI_SPEECH_MODEL
    ttsModel: "tts-1", // VOLTAGENT_VOICE_OPENAI_TTS_MODEL
    voice: "alloy", // VOLTAGENT_VOICE_OPENAI_VOICE
    timeout: 30000, // VOLTAGENT_VOICE_OPENAI_TIMEOUT
    maxRetries: 3, // VOLTAGENT_VOICE_OPENAI_MAX_RETRIES
  },
  elevenlabs: {
    speechModel: "scribe_v1", // VOLTAGENT_VOICE_ELEVENLABS_SPEECH_MODEL
    ttsModel: "eleven_multilingual_v2", // VOLTAGENT_VOICE_ELEVENLABS_TTS_MODEL
    voice: "Callum", // VOLTAGENT_VOICE_ELEVENLABS_VOICE
    stability: 0.5, // VOLTAGENT_VOICE_ELEVENLABS_STABILITY
    similarityBoost: 0.75, // VOLTAGENT_VOICE_ELEVENLABS_SIMILARITY_BOOST
  },
};
```

### UI/Animation Configuration

```typescript
defaults.ui = {
  animationDelay: 300, // VOLTAGENT_UI_ANIMATION_DELAY
  typingSpeed: 500, // VOLTAGENT_UI_TYPING_SPEED
  pauseAfterTyping: 1500, // VOLTAGENT_UI_PAUSE_AFTER_TYPING
  easterEggDuration: 60000, // VOLTAGENT_UI_EASTER_EGG_DURATION
  copyIndicatorDuration: 2000, // VOLTAGENT_UI_COPY_INDICATOR_DURATION
};
```

### SDK Configuration

```typescript
defaults.sdk = {
  clientTimeout: 30000, // VOLTAGENT_SDK_CLIENT_TIMEOUT
  flushInterval: 5000, // VOLTAGENT_SDK_FLUSH_INTERVAL
};
```

### CLI Configuration

```typescript
defaults.cli = {
  checkFrequency: "daily", // VOLTAGENT_CLI_CHECK_FREQUENCY
  showAnnouncements: true, // VOLTAGENT_CLI_SHOW_ANNOUNCEMENTS
  dayInMs: 24 * 60 * 60 * 1000, // Calculated constant, not configurable
  weekInMs: 7 * 24 * 60 * 60 * 1000, // Calculated constant, not configurable
};
```

### Telemetry Configuration

```typescript
defaults.telemetry = {
  defaultAgentId: "default-agent", // VOLTAGENT_TELEMETRY_DEFAULT_AGENT_ID
  hrTimeToMillisMultiplier: 1e6, // Constant for time conversion, not configurable
};
```

### Development Configuration

```typescript
defaults.development = {
  logLevel: "info", // VOLTAGENT_DEV_LOG_LEVEL
  enableDebugMode: false, // VOLTAGENT_DEV_ENABLE_DEBUG_MODE
};
```

### OpenTelemetry Configuration

```typescript
defaults.opentelemetry = {
  serviceName: "voltagent", // VOLTAGENT_OTEL_SERVICE_NAME
  serviceVersion: "1.0.0", // VOLTAGENT_OTEL_SERVICE_VERSION
};
```

### Google AI Configuration

```typescript
defaults.googleAI = {
  defaultTimeout: 30000, // VOLTAGENT_GOOGLE_AI_DEFAULT_TIMEOUT
  maxRetries: 3, // VOLTAGENT_GOOGLE_AI_MAX_RETRIES
};
```

### Vercel AI Configuration

```typescript
defaults.vercelAI = {
  defaultTimeout: 30000, // VOLTAGENT_VERCEL_AI_DEFAULT_TIMEOUT
  maxRetries: 3, // VOLTAGENT_VERCEL_AI_MAX_RETRIES
};
```

### Database Configuration

```typescript
defaults.database = {
  // PostgreSQL Configuration
  postgres: {
    port: 5432, // VOLTAGENT_DB_POSTGRES_PORT
    maxConnections: 10, // VOLTAGENT_DB_POSTGRES_MAX_CONNECTIONS
    ssl: false, // VOLTAGENT_DB_POSTGRES_SSL
    storageLimit: 100, // VOLTAGENT_DB_POSTGRES_STORAGE_LIMIT
    tablePrefix: "voltagent_memory", // VOLTAGENT_DB_POSTGRES_TABLE_PREFIX
  },
  // LibSQL/Turso Configuration
  libsql: {
    storageLimit: 100, // VOLTAGENT_DB_LIBSQL_STORAGE_LIMIT
    tablePrefix: "voltagent_memory", // VOLTAGENT_DB_LIBSQL_TABLE_PREFIX
    debugDelayMin: 0, // VOLTAGENT_DB_LIBSQL_DEBUG_DELAY_MIN
    debugDelayMax: 0, // VOLTAGENT_DB_LIBSQL_DEBUG_DELAY_MAX
  },
  // Supabase Configuration
  supabase: {
    storageLimit: 100, // VOLTAGENT_DB_SUPABASE_STORAGE_LIMIT
    tablePrefix: "voltagent_memory", // VOLTAGENT_DB_SUPABASE_TABLE_PREFIX
  },
};
```

## 🔧 Utility Functions

### Type-Safe Access

```typescript
import { getDefault } from "./defaults";

// Get entire domain
const serverConfig = getDefault("server");

// Get specific key
const timeout = getDefault("network", "timeout");
```

### Configuration Validation

```typescript
import { validateDefaults } from "./defaults";

// Validate current configuration
validateDefaults(); // Outputs warnings for invalid values
```

### Debug Configuration

```typescript
import { printDefaults } from "./defaults";

// Print current configuration
printDefaults(); // Outputs JSON representation
```

## 🚀 Usage Examples

### Basic Agent Setup

```typescript
import { defaults } from "./defaults";
import { VoltAgent } from "@voltagent/core";

const agent = new VoltAgent({
  agents: {
    myAgent: {
      // Use configurable timeout instead of hardcoded value
      timeout: defaults.network.timeout,
    },
  },
  server: {
    port: defaults.server.port,
    autoStart: defaults.server.autoStart,
  },
});
```

### Playwright Tool Configuration

```typescript
import { defaults } from "./defaults";
import { createTool } from "@voltagent/core";

export const navigationTool = createTool({
  name: "navigate",
  description: "Navigate to a URL",
  parameters: z.object({
    url: z.string().url(),
    // Use configurable timeout
    timeout: z.number().default(defaults.playwright.navigationTimeout),
  }),
  execute: async (args) => {
    // Implementation using defaults.playwright.* values
  },
});
```

### Database Configuration

```typescript
import { defaults } from "./defaults";
import { PostgresStorage } from "@voltagent/postgres";
import { LibSQLStorage } from "@voltagent/core";

// PostgreSQL configuration using defaults
const postgresStorage = new PostgresStorage({
  connection: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: defaults.database.postgres.port,
    database: process.env.POSTGRES_DB || "voltagent",
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "password",
    ssl: defaults.database.postgres.ssl,
  },
  maxConnections: defaults.database.postgres.maxConnections,
  tablePrefix: defaults.database.postgres.tablePrefix,
  storageLimit: defaults.database.postgres.storageLimit,
});

// LibSQL/Turso configuration using defaults
const libsqlStorage = new LibSQLStorage({
  url: process.env.TURSO_DB_URL || "file:./voltagent-memory.db",
  authToken: process.env.TURSO_DB_AUTH_TOKEN,
  tablePrefix: defaults.database.libsql.tablePrefix,
  storageLimit: defaults.database.libsql.storageLimit,
});
```

### Custom Environment Setup

```bash
# Development environment
export VOLTAGENT_PLAYWRIGHT_HEADLESS=false
export VOLTAGENT_DEV_ENABLE_DEBUG_MODE=true
export VOLTAGENT_NETWORK_TIMEOUT=60000

# Database configuration
export VOLTAGENT_DB_POSTGRES_PORT=5432
export VOLTAGENT_DB_POSTGRES_MAX_CONNECTIONS=20
export VOLTAGENT_DB_POSTGRES_SSL=true
export VOLTAGENT_DB_LIBSQL_STORAGE_LIMIT=500

# Production environment
export VOLTAGENT_PLAYWRIGHT_HEADLESS=true
export VOLTAGENT_DEV_ENABLE_DEBUG_MODE=false
export VOLTAGENT_NETWORK_TIMEOUT=30000
export VOLTAGENT_SERVER_ENABLE_SWAGGER_UI=false
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18

# Set environment variables
ENV VOLTAGENT_SERVER_PORT=8080
ENV VOLTAGENT_PLAYWRIGHT_HEADLESS=true
ENV VOLTAGENT_NETWORK_TIMEOUT=45000

COPY . .
RUN npm install
CMD ["npm", "start"]
```

## 🎨 Migration Guide

### Before (Hardcoded Values)

```typescript
// ❌ Bad: Hardcoded values
await page.waitForSelector(selector, { timeout: 30000 });
setTimeout(() => hideElement(), 2000);
const maxRetries = 3;
```

### After (Configurable Values)

```typescript
// ✅ Good: Configurable values
import { defaults } from "./defaults";

await page.waitForSelector(selector, {
  timeout: defaults.playwright.defaultTimeout,
});
setTimeout(() => hideElement(), defaults.ui.animationDelay);
const maxRetries = defaults.network.maxRetries;
```

## 📋 Best Practices

1. **Always use defaults** - Never hardcode values that could be configurable
2. **Document your usage** - Comment why specific defaults are used
3. **Validate inputs** - Use the validation functions to catch configuration errors
4. **Environment-specific configs** - Use different values for development/production
5. **Type safety** - Leverage TypeScript types for configuration access

## 🔍 Troubleshooting

### Configuration Not Applied

- Check environment variable names (case-sensitive)
- Verify command line argument format
- Ensure the configuration is loaded before usage

### Type Errors

- Use the provided utility functions (`getDefault`, `withDefaults`)
- Check the `DefaultsConfig` type for available options

### Performance Issues

- Configuration is parsed once at startup
- No runtime performance impact
- Use `printDefaults()` to debug configuration loading

## 🤝 Contributing

When adding new configurable values:

1. Add the value to the appropriate domain in `defaults.ts`
2. Use the `getConfigValue` helper function
3. Add documentation to this guide
4. Update the validation function if needed
5. Add tests for the new configuration option

For more information, see our [Code of Conduct](./CODE_OF_CONDUCT.md) section on "Configuration Over Hardcoding".
