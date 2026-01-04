type ObservabilityErrorInfo = {
  isAuthError: boolean;
  statusCode?: number;
  message: string;
};

export type ObservabilityFlushState = {
  authWarningLogged: boolean;
};

type ObservabilityLogger = {
  warn: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
};

type ObservabilityFlusher = {
  flushOnFinish: () => Promise<void>;
};

export const getObservabilityErrorInfo = (error: unknown): ObservabilityErrorInfo => {
  const message = error instanceof Error ? error.message : String(error);
  const errorLike = error as { code?: unknown; statusCode?: unknown; data?: unknown };
  const rawStatus = errorLike?.code ?? errorLike?.statusCode;
  const statusCode = typeof rawStatus === "number" ? rawStatus : undefined;
  const dataMessage = typeof errorLike?.data === "string" ? errorLike?.data : "";
  const isAuthError =
    statusCode === 401 ||
    /unauthorized/i.test(message) ||
    /api keys are required/i.test(message) ||
    /unauthorized/i.test(dataMessage) ||
    /api keys are required/i.test(dataMessage);

  return { isAuthError, statusCode, message };
};

export const logObservabilityFlushError = (
  error: unknown,
  logger: ObservabilityLogger,
  state: ObservabilityFlushState,
  phase: string,
): void => {
  const { isAuthError, statusCode, message } = getObservabilityErrorInfo(error);

  if (isAuthError) {
    if (!state.authWarningLogged) {
      state.authWarningLogged = true;
      logger.warn(
        "VoltAgent observability export unauthorized. Check VOLTAGENT_PUBLIC_KEY and VOLTAGENT_SECRET_KEY.",
        {
          phase,
          statusCode,
        },
      );
    }
    return;
  }

  logger.debug("VoltAgent observability flush failed", {
    phase,
    statusCode,
    errorMessage: message,
  });
};

export const flushObservability = async (
  observability: ObservabilityFlusher,
  logger: ObservabilityLogger,
  state: ObservabilityFlushState,
  phase: string,
): Promise<void> => {
  try {
    await observability.flushOnFinish();
  } catch (error) {
    logObservabilityFlushError(error, logger, state, phase);
  }
};
