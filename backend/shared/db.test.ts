import { describe, it, expect } from 'vitest';

describe('Database Setup', () => {
  it('should be able to import database instance', () => {
    const { db } = require('./db');
    expect(db).toBeDefined();
    expect(db.connectionString).toBeDefined();
  });
});
