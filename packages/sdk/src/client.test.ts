import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initTinyCDP } from './client';
import type { TinyCDPClient } from './types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TinyCDP Client', () => {
  let client: TinyCDPClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = initTinyCDP({
      endpoint: 'http://localhost:4000',
      writeKey: 'test-write-key',
      readKey: 'test-read-key',
      debug: true,
      flushAt: 2, // Small batch size for testing
      flushIntervalMs: 100, // Short interval for testing
    });
  });

  afterEach(() => {
    client.destroy();
  });

  describe('initialization', () => {
    it('should create a client with default options', () => {
      const testClient = initTinyCDP({
        endpoint: 'http://localhost:4000',
      });
      
      expect(testClient).toBeDefined();
      expect(testClient.getQueueSize()).toBe(0);
      
      testClient.destroy();
    });

    it('should require endpoint', () => {
      expect(() => {
        initTinyCDP({} as any);
      }).toThrow();
    });
  });

  describe('identify', () => {
    it('should make identify request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ userId: 'test-user', success: true }),
      });

      await client.identify({
        userId: 'test-user',
        traits: { email: 'test@example.com' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/v1/identify',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-write-key',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            userId: 'test-user',
            traits: { email: 'test@example.com' },
          }),
        })
      );
    });

    it('should require write key', async () => {
      const clientWithoutWriteKey = initTinyCDP({
        endpoint: 'http://localhost:4000',
        readKey: 'test-read-key',
      });

      await expect(
        clientWithoutWriteKey.identify({ userId: 'test-user' })
      ).rejects.toThrow('Write key is required');

      clientWithoutWriteKey.destroy();
    });
  });

  describe('track', () => {
    it('should queue events for batching', () => {
      client.track({
        userId: 'test-user',
        event: 'test-event',
        properties: { value: 123 },
      });

      expect(client.getQueueSize()).toBe(1);
    });

    it('should auto-flush when batch size is reached', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ success: true, eventId: 1 }),
      });

      // Track events up to batch size
      client.track({ userId: 'user1', event: 'event1' });
      client.track({ userId: 'user2', event: 'event2' });

      // Wait for auto-flush
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should require event name', () => {
      expect(() => {
        client.track({
          userId: 'test-user',
          event: '',
        });
      }).toThrow('Event name is required');
    });

    it('should require at least one identifier', () => {
      expect(() => {
        client.track({
          event: 'test-event',
        } as any);
      }).toThrow('At least one identifier');
    });
  });

  describe('decide', () => {
    it('should make decision request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({
          allow: true,
          variant: 'test-variant',
          reasons: ['test reason'],
          userId: 'test-user',
          flag: 'test-flag',
        }),
      });

      const decision = await client.decide({
        userId: 'test-user',
        flag: 'test-flag',
      });

      expect(decision.allow).toBe(true);
      expect(decision.variant).toBe('test-variant');
      expect(decision.userId).toBe('test-user');
      expect(decision.flag).toBe('test-flag');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/v1/decide?userId=test-user&flag=test-flag',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-read-key',
          }),
        })
      );
    });

    it('should require read key', async () => {
      const clientWithoutReadKey = initTinyCDP({
        endpoint: 'http://localhost:4000',
        writeKey: 'test-write-key',
      });

      await expect(
        clientWithoutReadKey.decide({ userId: 'test-user', flag: 'test-flag' })
      ).rejects.toThrow('Read key is required');

      clientWithoutReadKey.destroy();
    });

    it('should require userId and flag', async () => {
      await expect(
        client.decide({ userId: '', flag: 'test-flag' })
      ).rejects.toThrow('User ID is required');

      await expect(
        client.decide({ userId: 'test-user', flag: '' })
      ).rejects.toThrow('Flag key is required');
    });
  });

  describe('flush', () => {
    it('should flush queued events', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ success: true, eventId: 1 }),
      });

      client.track({ userId: 'user1', event: 'event1' });
      client.track({ userId: 'user2', event: 'event2' });

      expect(client.getQueueSize()).toBe(2);

      await client.flush();

      expect(client.getQueueSize()).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('queue management', () => {
    it('should clear queue', () => {
      client.track({ userId: 'user1', event: 'event1' });
      client.track({ userId: 'user2', event: 'event2' });

      expect(client.getQueueSize()).toBe(2);

      client.clearQueue();

      expect(client.getQueueSize()).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should throw error after client is destroyed', () => {
      client.destroy();

      expect(() => {
        client.track({ userId: 'test', event: 'test' });
      }).toThrow('TinyCDP client has been destroyed');
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ error: 'Invalid request' }),
      });

      await expect(
        client.identify({ userId: 'test-user' })
      ).rejects.toThrow('HTTP 400');
    });

    it('should retry failed requests', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'application/json']]),
          json: () => Promise.resolve({ userId: 'test-user', success: true }),
        });

      await client.identify({ userId: 'test-user' });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
