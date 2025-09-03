/**
 * Configuration options for initializing the TinyCDP client
 */
export interface TinyCDPOptions {
  /** Write API key for sending events */
  writeKey?: string;
  /** Read API key for making decisions */
  readKey?: string;
  /** TinyCDP API endpoint URL */
  endpoint: string;
  /** Number of events to batch before flushing (default: 20) */
  flushAt?: number;
  /** Interval in milliseconds to flush events (default: 10000) */
  flushIntervalMs?: number;
  /** Maximum number of events to queue (default: 1000) */
  maxQueueSize?: number;
  /** Retry configuration */
  retry?: RetryConfig;
  /** Custom logger */
  logger?: Logger;
  /** Enable debug logging (default: false) */
  debug?: boolean;
  /** Timeout for HTTP requests in milliseconds (default: 15000) */
  timeout?: number;
  /** Whether to automatically flush on page unload (browser only, default: true) */
  autoFlushOnUnload?: boolean;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial retry delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum retry delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Whether to add jitter to retry delays (default: true) */
  jitter?: boolean;
}

/**
 * Parameters for the identify method
 */
export interface IdentifyParams {
  /** Device ID */
  deviceId?: string;
  /** User ID (will be treated as externalId) */
  userId?: string;
  /** External ID */
  externalId?: string;
  /** User traits/properties */
  traits?: Record<string, unknown>;
}

/**
 * Parameters for the track method
 */
export interface TrackParams {
  /** User ID */
  userId?: string;
  /** Device ID */
  deviceId?: string;
  /** External ID */
  externalId?: string;
  /** Event name */
  event: string;
  /** Event timestamp (ISO string) */
  timestamp?: string;
  /** Event properties */
  properties?: Record<string, unknown>;
}

/**
 * Parameters for the decide method
 */
export interface DecideParams {
  /** User ID to evaluate */
  userId: string;
  /** Flag key to evaluate */
  flag: string;
}

/**
 * Decision response
 */
export interface Decision {
  /** Whether the flag is enabled for the user */
  allow: boolean;
  /** Optional variant identifier */
  variant?: string;
  /** Evaluation reasons for debugging */
  reasons: string[];
  /** User ID that was evaluated */
  userId: string;
  /** Flag key that was evaluated */
  flag: string;
}

/**
 * Internal track event structure
 */
export interface TrackEvent {
  userId?: string;
  deviceId?: string;
  externalId?: string;
  event: string;
  ts?: string;
  props?: Record<string, unknown>;
  _timestamp: number;
  _retries: number;
}

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * TinyCDP client interface
 */
export interface TinyCDPClient {
  /**
   * Identify a user with traits
   */
  identify(params: IdentifyParams): Promise<void>;
  
  /**
   * Track an event (batched)
   */
  track(params: TrackParams): void;
  
  /**
   * Flush all pending events immediately
   */
  flush(): Promise<void>;
  
  /**
   * Make a real-time decision
   */
  decide(params: DecideParams): Promise<Decision>;
  
  /**
   * Get the current queue size
   */
  getQueueSize(): number;
  
  /**
   * Clear the event queue
   */
  clearQueue(): void;
  
  /**
   * Destroy the client and clean up resources
   */
  destroy(): void;
}

/**
 * HTTP response structure
 */
export interface HTTPResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
}

/**
 * HTTP error
 */
export interface HTTPError extends Error {
  status?: number;
  statusText?: string;
  response?: string;
}
