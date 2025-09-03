import type { Logger, LogLevel } from './types';

/**
 * Default console logger implementation
 */
export class ConsoleLogger implements Logger {
  constructor(
    private level: LogLevel = 'info',
    private prefix = '[TinyCDP]'
  ) {}

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.level];
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`${this.prefix} ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(`${this.prefix} ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`${this.prefix} ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(`${this.prefix} ${message}`, ...args);
    }
  }
}

/**
 * Create a logger instance
 */
export function createLogger(
  level: LogLevel = 'info',
  prefix = '[TinyCDP]'
): Logger {
  return new ConsoleLogger(level, prefix);
}

/**
 * No-op logger for production use
 */
export class NoOpLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}
