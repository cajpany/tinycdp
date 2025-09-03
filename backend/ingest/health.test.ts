import { describe, it, expect } from 'vitest';
import { health } from './health';

describe('Ingest Health Check', () => {
  it('should return healthy status', async () => {
    const response = await health();
    
    expect(response.status).toBe('ok');
    expect(response.service).toBe('ingest');
    expect(response.timestamp).toBeInstanceOf(Date);
    expect(response.database).toBeDefined();
  });
});
