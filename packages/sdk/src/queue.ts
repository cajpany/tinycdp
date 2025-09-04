import type { TrackEvent, Logger } from './types';

/**
 * Event queue manager for batching events
 */
export class EventQueue {
  private events: TrackEvent[] = [];
  private flushTimer: NodeJS.Timeout | number | null = null;

  constructor(
    private maxSize: number,
    private flushIntervalMs: number,
    private flushCallback: (events: TrackEvent[]) => Promise<void>,
    private logger: Logger
  ) {}

  /**
   * Add an event to the queue
   */
  add(event: TrackEvent): void {
    if (this.events.length >= this.maxSize) {
      this.logger.warn('Event queue is full, dropping oldest event', {
        queueSize: this.events.length,
        maxSize: this.maxSize
      });
      this.events.shift(); // Remove oldest event
    }

    this.events.push(event);
    this.logger.debug('Event added to queue', {
      event: event.event,
      queueSize: this.events.length
    });

    this.scheduleFlush();
  }

  /**
   * Get current queue size
   */
  size(): number {
    return this.events.length;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.events = [];
    this.clearFlushTimer();
    this.logger.debug('Event queue cleared');
  }

  /**
   * Drains all events from the queue.
   * @returns An array of all events that were in the queue.
   */
  drain(): TrackEvent[] {
    const eventsToDrain = [...this.events];
    this.events = [];
    this.clearFlushTimer();
    this.logger.debug('Event queue drained', { count: eventsToDrain.length });
    return eventsToDrain;
  }

  /**
   * Flush all events immediately
   */
  async flush(): Promise<void> {
    if (this.events.length === 0) {
      return;
    }

    const eventsToFlush = this.drain();

    this.logger.debug('Flushing events', { count: eventsToFlush.length });

    try {
      await this.flushCallback(eventsToFlush);
      this.logger.debug('Events flushed successfully', { count: eventsToFlush.length });
    } catch (error) {
      this.logger.error('Failed to flush events', {
        count: eventsToFlush.length,
        error: error instanceof Error ? error.message : String(error)
      });

      // Re-queue failed events (with retry limit)
      const retriableEvents = eventsToFlush.filter(event => event._retries < 3);
      retriableEvents.forEach(event => {
        event._retries++;
        this.events.unshift(event); // Add back to front of queue
      });

      if (retriableEvents.length > 0) {
        this.logger.info('Re-queued failed events for retry', { 
          count: retriableEvents.length 
        });
        this.scheduleFlush();
      }

      throw error;
    }
  }

  /**
   * Schedule automatic flush
   */
  private scheduleFlush(): void {
    if (this.flushTimer !== null) {
      return; // Timer already scheduled
    }

    this.flushTimer = setTimeout(() => {
      this.flush().catch(error => {
        this.logger.error('Scheduled flush failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }, this.flushIntervalMs);
  }

  /**
   * Clear the flush timer
   */
  private clearFlushTimer(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Destroy the queue and clean up resources
   */
  destroy(): void {
    this.clearFlushTimer();
    this.events = [];
  }
}
