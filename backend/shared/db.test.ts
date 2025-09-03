import { describe, it, expect } from 'vitest';
import { db } from './db';

describe('Database Setup', () => {
  it('should be able to import database instance', () => {
    expect(db).toBeDefined();
    expect(db.connectionString).toBeDefined();
  });

  it('should be able to connect to database', async () => {
    const result = await db.queryRow`SELECT 1 as test`;
    expect(result).toEqual({ test: 1 });
  });
});
