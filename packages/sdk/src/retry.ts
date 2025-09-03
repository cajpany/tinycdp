import type { RetryConfig, Logger } from './types';

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Retry utility for handling failed requests
 */
export class RetryHandler {
  private config: Required<RetryConfig>;

  constructor(config: RetryConfig = {}, private logger: Logger) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        this.logger.debug(`Executing ${context}, attempt ${attempt}/${this.config.maxAttempts}`);
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === this.config.maxAttempts) {
          this.logger.error(`${context} failed after ${attempt} attempts`, { 
            error: lastError.message 
          });
          break;
        }

        if (!this.shouldRetry(lastError)) {
          this.logger.warn(`${context} failed with non-retryable error`, { 
            error: lastError.message 
          });
          break;
        }

        const delay = this.calculateDelay(attempt);
        this.logger.warn(`${context} failed on attempt ${attempt}, retrying in ${delay}ms`, { 
          error: lastError.message 
        });
        
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: Error): boolean {
    // Don't retry for client errors (4xx), except for rate limiting (429)
    if ('status' in error) {
      const status = (error as any).status;
      if (typeof status === 'number') {
        if (status >= 400 && status < 500 && status !== 429) {
          return false;
        }
      }
    }

    // Retry for network errors and server errors (5xx)
    return true;
  }

  /**
   * Calculate retry delay with exponential backoff and optional jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.initialDelay * 
      Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    const clampedDelay = Math.min(exponentialDelay, this.config.maxDelay);
    
    if (!this.config.jitter) {
      return clampedDelay;
    }

    // Add jitter: random value between 0.5 and 1.5 times the delay
    const jitterMultiplier = 0.5 + Math.random();
    return Math.floor(clampedDelay * jitterMultiplier);
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
