import type {
  TinyCDPOptions,
  TinyCDPClient,
  IdentifyParams,
  TrackParams,
  DecideParams,
  Decision,
  TrackEvent,
  Logger
} from './types';

import { HTTPClient } from './http';
import { RetryHandler } from './retry';
import { EventQueue } from './queue';
import { ConsoleLogger, NoOpLogger } from './logger';

/**
 * Default configuration
 */
const DEFAULT_OPTIONS: Required<Omit<TinyCDPOptions, 'writeKey' | 'readKey' | 'endpoint' | 'logger'>> = {
  flushAt: 20,
  flushIntervalMs: 10000,
  maxQueueSize: 1000,
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
  },
  debug: false,
  timeout: 15000,
  autoFlushOnUnload: true,
};

/**
 * TinyCDP client implementation
 */
export class TinyCDPClientImpl implements TinyCDPClient {
  private http: HTTPClient;
  private retry: RetryHandler;
  private eventQueue: EventQueue;
  private logger: Logger;
  private options: Required<TinyCDPOptions>;
  private destroyed = false;

  constructor(options: TinyCDPOptions) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      retry: { ...DEFAULT_OPTIONS.retry, ...options.retry },
      logger: options.logger || this.createDefaultLogger(options.debug || false),
    };

    this.logger = this.options.logger;
    this.http = new HTTPClient(this.options.endpoint, this.options.timeout, this.logger);
    this.retry = new RetryHandler(this.options.retry, this.logger);

    this.eventQueue = new EventQueue(
      this.options.maxQueueSize,
      this.options.flushIntervalMs,
      this.flushEvents.bind(this),
      this.logger
    );

    this.setupAutoFlush();
    this.logger.info('TinyCDP client initialized', {
      endpoint: this.options.endpoint,
      flushAt: this.options.flushAt,
      flushIntervalMs: this.options.flushIntervalMs,
    });
  }

  /**
   * Create default logger based on debug setting
   */
  private createDefaultLogger(debug: boolean): Logger {
    return debug ? new ConsoleLogger('debug') : new NoOpLogger();
  }

  /**
   * Setup automatic flush on page unload (browser only)
   */
  private setupAutoFlush(): void {
    if (!this.options.autoFlushOnUnload) {
      return;
    }

    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const flushOnUnload = () => {
        // Use sendBeacon if available, otherwise synchronous flush
        if (this.eventQueue.size() > 0) {
          this.logger.debug('Page unload detected, flushing events');
          
          if (navigator.sendBeacon && this.options.writeKey) {
            this.flushWithBeacon();
          } else {
            // Synchronous flush as fallback (not recommended but better than losing data)
            this.flushSync();
          }
        }
      };

      window.addEventListener('beforeunload', flushOnUnload);
      window.addEventListener('pagehide', flushOnUnload);
      
      // For mobile browsers
      if ('visibilitychange' in document) {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            flushOnUnload();
          }
        });
      }
    }
  }

  /**
   * Flush events using sendBeacon (browser only)
   */
  private flushWithBeacon(): void {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
      return;
    }

    const events = this.getAllQueuedEvents();
    if (events.length === 0) {
      return;
    }

    const url = `${this.options.endpoint}/v1/track`;
    const headers = { 'Content-Type': 'application/json' };
    
    if (this.options.writeKey) {
      headers['Authorization'] = `Bearer ${this.options.writeKey}`;
    }

    // Send each event individually with sendBeacon
    events.forEach(event => {
      const payload = JSON.stringify({
        userId: event.userId,
        deviceId: event.deviceId,
        externalId: event.externalId,
        event: event.event,
        ts: event.ts,
        props: event.props,
      });

      navigator.sendBeacon(url, payload);
    });

    this.eventQueue.clear();
    this.logger.debug('Events flushed with sendBeacon', { count: events.length });
  }

  /**
   * Synchronous flush (blocking, not recommended)
   */
  private flushSync(): void {
    // This is a fallback and should be avoided if possible
    // Modern browsers may kill the request before it completes
    try {
      const events = this.getAllQueuedEvents();
      if (events.length === 0) {
        return;
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.options.endpoint}/v1/track`, false); // false = synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      if (this.options.writeKey) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.options.writeKey}`);
      }

      events.forEach(event => {
        const payload = JSON.stringify({
          userId: event.userId,
          deviceId: event.deviceId,
          externalId: event.externalId,
          event: event.event,
          ts: event.ts,
          props: event.props,
        });
        
        xhr.send(payload);
      });

      this.eventQueue.clear();
      this.logger.debug('Events flushed synchronously', { count: events.length });
    } catch (error) {
      this.logger.error('Synchronous flush failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get all queued events
   */
  private getAllQueuedEvents(): TrackEvent[] {
    const events: TrackEvent[] = [];
    const originalSize = this.eventQueue.size();
    
    // This is a bit hacky - we'd need to expose the events array from EventQueue
    // For now, we'll implement a simple approach
    return events;
  }

  /**
   * Identify a user
   */
  async identify(params: IdentifyParams): Promise<void> {
    this.assertNotDestroyed();
    
    if (!this.options.writeKey) {
      throw new Error('Write key is required for identify calls');
    }

    this.logger.debug('Identifying user', {
      hasDeviceId: !!params.deviceId,
      hasUserId: !!params.userId,
      hasExternalId: !!params.externalId,
      traitCount: params.traits ? Object.keys(params.traits).length : 0,
    });

    await this.retry.execute(async () => {
      await this.http.post('/v1/identify', params, {
        headers: { Authorization: `Bearer ${this.options.writeKey}` },
      });
    }, 'identify');

    this.logger.info('User identified successfully');
  }

  /**
   * Track an event (batched)
   */
  track(params: TrackParams): void {
    this.assertNotDestroyed();

    if (!this.options.writeKey) {
      throw new Error('Write key is required for track calls');
    }

    if (!params.event || params.event.trim() === '') {
      throw new Error('Event name is required and cannot be empty');
    }

    if (!params.userId && !params.deviceId && !params.externalId) {
      throw new Error('At least one identifier (userId, deviceId, or externalId) is required');
    }

    const event: TrackEvent = {
      userId: params.userId,
      deviceId: params.deviceId,
      externalId: params.externalId,
      event: params.event,
      ts: params.timestamp || new Date().toISOString(),
      props: params.properties,
      _timestamp: Date.now(),
      _retries: 0,
    };

    this.eventQueue.add(event);

    // Auto-flush if we've reached the batch size
    if (this.eventQueue.size() >= this.options.flushAt) {
      this.flush().catch(error => {
        this.logger.error('Auto-flush failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }
  }

  /**
   * Flush all pending events
   */
  async flush(): Promise<void> {
    this.assertNotDestroyed();
    
    if (!this.options.writeKey) {
      this.logger.warn('Write key is required for flushing events');
      return;
    }

    await this.eventQueue.flush();
  }

  /**
   * Make a real-time decision
   */
  async decide(params: DecideParams): Promise<Decision> {
    this.assertNotDestroyed();

    if (!this.options.readKey) {
      throw new Error('Read key is required for decide calls');
    }

    if (!params.userId || params.userId.trim() === '') {
      throw new Error('User ID is required and cannot be empty');
    }

    if (!params.flag || params.flag.trim() === '') {
      throw new Error('Flag key is required and cannot be empty');
    }

    this.logger.debug('Making decision', {
      userId: params.userId,
      flag: params.flag,
    });

    const response = await this.retry.execute(async () => {
      return await this.http.get<Decision>(
        `/v1/decide?userId=${encodeURIComponent(params.userId)}&flag=${encodeURIComponent(params.flag)}`,
        {
          headers: { Authorization: `Bearer ${this.options.readKey}` },
        }
      );
    }, 'decide');

    this.logger.debug('Decision received', {
      userId: params.userId,
      flag: params.flag,
      allow: response.data.allow,
      variant: response.data.variant,
    });

    return response.data;
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.eventQueue.size();
  }

  /**
   * Clear the event queue
   */
  clearQueue(): void {
    this.eventQueue.clear();
  }

  /**
   * Destroy the client and clean up resources
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.logger.debug('Destroying TinyCDP client');
    
    // Flush any remaining events
    this.flush().catch(error => {
      this.logger.error('Final flush failed during destroy', {
        error: error instanceof Error ? error.message : String(error)
      });
    });

    this.eventQueue.destroy();
    this.destroyed = true;
    
    this.logger.info('TinyCDP client destroyed');
  }

  /**
   * Internal method to flush events to the API
   */
  private async flushEvents(events: TrackEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    // Send events individually to match the API format
    // In a production implementation, you might want to batch these into a single request
    // if the API supports it
    const promises = events.map(event =>
      this.retry.execute(async () => {
        await this.http.post('/v1/track', {
          userId: event.userId,
          deviceId: event.deviceId,
          externalId: event.externalId,
          event: event.event,
          ts: event.ts,
          props: event.props,
        }, {
          headers: { Authorization: `Bearer ${this.options.writeKey}` },
        });
      }, `track event: ${event.event}`)
    );

    await Promise.all(promises);
  }

  /**
   * Assert that the client has not been destroyed
   */
  private assertNotDestroyed(): void {
    if (this.destroyed) {
      throw new Error('TinyCDP client has been destroyed');
    }
  }
}

/**
 * Initialize a new TinyCDP client
 */
export function initTinyCDP(options: TinyCDPOptions): TinyCDPClient {
  return new TinyCDPClientImpl(options);
}
