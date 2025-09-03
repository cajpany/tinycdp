import { describe, it, expect, beforeEach } from 'vitest';
import { TraitComputer } from './trait-computation';
import { db } from './db';

// Mock the database
vi.mock('./db', () => ({
  db: {
    queryAll: vi.fn(),
    queryRow: vi.fn(),
    exec: vi.fn(),
    begin: vi.fn()
  }
}));

describe('TraitComputer', () => {
  let computer: TraitComputer;
  
  beforeEach(() => {
    computer = new TraitComputer();
    vi.clearAllMocks();
  });

  describe('buildTraitContext', () => {
    it('should build trait context with event metrics', async () => {
      const userId = 'test-user-id';
      
      // Mock event names query
      (db.queryAll as any).mockResolvedValueOnce([
        { name: 'purchase' },
        { name: 'app_open' }
      ]);
      
      // Mock count queries
      (db.queryRow as any)
        .mockResolvedValueOnce({ count: '2' }) // count_7d
        .mockResolvedValueOnce({ count: '5' }) // count_14d  
        .mockResolvedValueOnce({ count: '8' }) // count_30d
        .mockResolvedValueOnce({ count: '2' }) // unique_days_7d
        .mockResolvedValueOnce({ count: '4' }) // unique_days_14d
        .mockResolvedValueOnce({ count: '6' }) // unique_days_30d
        .mockResolvedValueOnce({ ts: new Date('2023-01-01') }) // first event
        .mockResolvedValueOnce({ ts: new Date('2023-02-01') }) // last event
        // Repeat for app_open
        .mockResolvedValueOnce({ count: '15' })
        .mockResolvedValueOnce({ count: '28' })
        .mockResolvedValueOnce({ count: '50' })
        .mockResolvedValueOnce({ count: '7' })
        .mockResolvedValueOnce({ count: '12' })
        .mockResolvedValueOnce({ count: '20' })
        .mockResolvedValueOnce({ ts: new Date('2023-01-05') })
        .mockResolvedValueOnce({ ts: new Date('2023-02-02') })
        // User timestamps
        .mockResolvedValueOnce({ ts: new Date('2023-01-01') }) // first user event
        .mockResolvedValueOnce({ ts: new Date('2023-02-02') }); // last user event

      const context = await computer.buildTraitContext(userId);
      
      expect(context.userId).toBe(userId);
      expect(context.events.purchase).toBeDefined();
      expect(context.events.purchase.count_30d).toBe(8);
      expect(context.events.app_open).toBeDefined();
      expect(context.events.app_open.count_30d).toBe(50);
      expect(context.profile).toEqual({});
    });
  });

  describe('computeTraitsForUser', () => {
    it('should compute traits for user', async () => {
      const userId = 'test-user-id';
      
      // Mock trait definitions
      (db.queryAll as any).mockResolvedValueOnce([
        { key: 'power_user', expression: 'events.app_open.unique_days_14d >= 5' },
        { key: 'recent_buyer', expression: 'events.purchase.count_30d >= 1' }
      ]);
      
      // Mock buildTraitContext
      vi.spyOn(computer, 'buildTraitContext').mockResolvedValueOnce({
        userId,
        events: {
          app_open: {
            count_7d: 15,
            count_14d: 28,
            count_30d: 50,
            unique_days_7d: 7,
            unique_days_14d: 12,
            unique_days_30d: 20,
            first_seen_days_ago: 45,
            last_seen_days_ago: 0
          },
          purchase: {
            count_7d: 2,
            count_14d: 5,
            count_30d: 8,
            unique_days_7d: 2,
            unique_days_14d: 4,
            unique_days_30d: 6,
            first_seen_days_ago: 45,
            last_seen_days_ago: 1
          }
        },
        profile: {},
        firstSeenDaysAgo: 45,
        lastSeenMinutesAgo: 30
      });

      const traits = await computer.computeTraitsForUser(userId);
      
      expect(traits).toHaveLength(2);
      expect(traits[0]).toEqual({
        key: 'power_user',
        value: true, // 12 >= 5
        userId
      });
      expect(traits[1]).toEqual({
        key: 'recent_buyer', 
        value: true, // 8 >= 1
        userId
      });
    });

    it('should handle trait computation errors gracefully', async () => {
      const userId = 'test-user-id';
      
      // Mock trait definitions with invalid expression
      (db.queryAll as any).mockResolvedValueOnce([
        { key: 'invalid_trait', expression: 'invalid.expression.' }
      ]);
      
      // Mock buildTraitContext
      vi.spyOn(computer, 'buildTraitContext').mockResolvedValueOnce({
        userId,
        events: {},
        profile: {},
        firstSeenDaysAgo: 0,
        lastSeenMinutesAgo: 0
      });

      const traits = await computer.computeTraitsForUser(userId);
      
      expect(traits).toHaveLength(1);
      expect(traits[0]).toEqual({
        key: 'invalid_trait',
        value: null, // null when computation fails
        userId
      });
    });
  });
});
