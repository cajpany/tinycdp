import log from "encore.dev/log";

export interface LogContext {
  service?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export class Logger {
  private service: string;

  constructor(service: string) {
    this.service = service;
  }

  private formatMessage(message: string, context?: LogContext): string {
    const ctx = { service: this.service, ...context };
    const contextStr = Object.entries(ctx)
      .map(([key, value]) => `${key}=${value}`)
      .join(" ");
    return `${message} [${contextStr}]`;
  }

  info(message: string, context?: LogContext) {
    log.info(this.formatMessage(message, context));
  }

  warn(message: string, context?: LogContext) {
    log.warn(this.formatMessage(message, context));
  }

  error(message: string, error?: Error, context?: LogContext) {
    const errorContext = error ? {
      error: error.message,
      stack: error.stack,
      ...context
    } : context;
    log.error(this.formatMessage(message, errorContext));
  }

  debug(message: string, context?: LogContext) {
    log.debug(this.formatMessage(message, context));
  }
}

// Create logger instances for each service
export const createLogger = (service: string) => new Logger(service);
