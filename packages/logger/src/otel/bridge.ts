/**
 * OpenTelemetry Bridge for Pino Logger
 *
 * This module bridges Pino logs to OpenTelemetry Logs API using
 * the official @opentelemetry/instrumentation-pino package for
 * automatic trace correlation and structured logging.
 */

import { logs } from "@opentelemetry/api-logs";
import type { Instrumentation } from "@opentelemetry/instrumentation";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";
import type { LoggerProvider } from "@opentelemetry/sdk-logs";

export class PinoOpenTelemetryBridge {
  private instrumentation?: Instrumentation;
  private initialized = false;

  /**
   * Initialize the bridge with OpenTelemetry LoggerProvider
   */
  initialize(loggerProvider: LoggerProvider): void {
    if (this.initialized) {
      return;
    }

    // Set global logger provider
    logs.setGlobalLoggerProvider(loggerProvider);

    // Expose a global flag to detect active Pino instrumentation
    (globalThis as any).___voltagent_pino_instrumentation_active = true;

    // Create and register Pino instrumentation
    // This will automatically:
    // 1. Add trace context (traceId, spanId) to all Pino logs
    // 2. Forward Pino logs to OpenTelemetry LoggerProvider
    this.instrumentation = new PinoInstrumentation({
      // The instrumentation will automatically inject trace context
      // and forward logs to the LoggerProvider
      enabled: true,
    });

    // Register the instrumentation
    registerInstrumentations({
      instrumentations: [this.instrumentation],
    });

    this.initialized = true;
  }

  /**
   * Check if the bridge is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the OpenTelemetry logger for direct usage
   */
  getOtelLogger(name: string, version?: string) {
    return logs.getLogger(name, version);
  }

  /**
   * Clean shutdown
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    // Disable instrumentation
    if (this.instrumentation) {
      this.instrumentation.disable();
    }

    // Note: LoggerProvider shutdown is handled by VoltAgentObservability
    this.initialized = false;

    (globalThis as any).___voltagent_pino_instrumentation_active = undefined;
  }
}

// Global singleton instance
let globalBridge: PinoOpenTelemetryBridge | null = null;

/**
 * Get or create the global Pino OpenTelemetry bridge
 */
export function getPinoOpenTelemetryBridge(): PinoOpenTelemetryBridge {
  if (!globalBridge) {
    globalBridge = new PinoOpenTelemetryBridge();
  }
  return globalBridge;
}

/**
 * Initialize the global bridge with a LoggerProvider
 */
export function initializePinoOpenTelemetry(loggerProvider: LoggerProvider): void {
  const bridge = getPinoOpenTelemetryBridge();
  bridge.initialize(loggerProvider);
}

/**
 * Check if OpenTelemetry bridge is active
 */
export function isOpenTelemetryEnabled(): boolean {
  const bridge = getPinoOpenTelemetryBridge();
  return bridge.isInitialized();
}
