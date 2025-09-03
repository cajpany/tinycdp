# TinyCDP SDK

TypeScript SDK for TinyCDP - Real-time traits & segments engine.

## Installation

```bash
npm install @tinycdp/sdk
```

## Quick Start

```typescript
import { initTinyCDP } from '@tinycdp/sdk';

// Initialize the client
const tinycdp = initTinyCDP({
  endpoint: 'http://localhost:4000',
  writeKey: 'your-write-key',
  readKey: 'your-read-key',
});

// Identify a user
await tinycdp.identify({
  userId: 'user-123',
  traits: {
    email: 'user@example.com',
    plan: 'premium',
  },
});

// Track events (batched automatically)
tinycdp.track({
  userId: 'user-123',
  event: 'purchase',
  properties: {
    amount: 99.99,
    product: 'premium-plan',
  },
});

// Make real-time decisions
const decision = await tinycdp.decide({
  userId: 'user-123',
  flag: 'premium-features',
});

if (decision.allow) {
  // Show premium features
}

// Clean up when done
tinycdp.destroy();
```

## Configuration

### Basic Options

```typescript
const tinycdp = initTinyCDP({
  // Required
  endpoint: 'https://your-tinycdp-instance.com',
  
  // API Keys
  writeKey: 'your-write-key',    // For identify() and track()
  readKey: 'your-read-key',      // For decide()
  
  // Batching (optional)
  flushAt: 20,                   // Flush after 20 events
  flushIntervalMs: 10000,        // Flush every 10 seconds
  maxQueueSize: 1000,            // Maximum events in queue
  
  // Network (optional)
  timeout: 15000,                // Request timeout (15s)
  
  // Browser (optional)
  autoFlushOnUnload: true,       // Auto-flush on page unload
  
  // Debugging (optional)
  debug: false,                  // Enable debug logging
});
```

### Advanced Configuration

```typescript
const tinycdp = initTinyCDP({
  endpoint: 'https://your-tinycdp-instance.com',
  writeKey: 'your-write-key',
  readKey: 'your-read-key',
  
  // Custom retry configuration
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
  },
  
  // Custom logger
  logger: {
    debug: (msg, ...args) => console.debug(`[TinyCDP] ${msg}`, ...args),
    info: (msg, ...args) => console.info(`[TinyCDP] ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[TinyCDP] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[TinyCDP] ${msg}`, ...args),
  },
});
```

## API Reference

### `identify(params)`

Identify a user with traits. This is used to create or update user profiles.

```typescript
await tinycdp.identify({
  userId: 'user-123',           // User identifier
  deviceId: 'device-456',       // Optional device identifier
  externalId: 'external-789',   // Optional external identifier
  traits: {                     // Optional user traits
    email: 'user@example.com',
    plan: 'premium',
    createdAt: new Date().toISOString(),
  },
});
```

### `track(params)`

Track user events. Events are automatically batched and sent in the background.

```typescript
tinycdp.track({
  userId: 'user-123',           // User identifier
  event: 'purchase',            // Event name (required)
  timestamp: '2023-01-01T12:00:00Z', // Optional timestamp
  properties: {                 // Optional event properties
    amount: 99.99,
    currency: 'USD',
    product: 'premium-plan',
  },
});
```

### `decide(params)`

Make real-time feature flag decisions.

```typescript
const decision = await tinycdp.decide({
  userId: 'user-123',
  flag: 'premium-features',
});

console.log(decision.allow);    // boolean: whether flag is enabled
console.log(decision.variant);  // string: optional variant
console.log(decision.reasons);  // string[]: evaluation reasons
```

### `flush()`

Manually flush all pending events immediately.

```typescript
await tinycdp.flush();
```

### `getQueueSize()`

Get the current number of queued events.

```typescript
const queueSize = tinycdp.getQueueSize();
console.log(`${queueSize} events queued`);
```

### `clearQueue()`

Clear all queued events without sending them.

```typescript
tinycdp.clearQueue();
```

### `destroy()`

Clean up the client and flush any remaining events.

```typescript
tinycdp.destroy();
```

## Error Handling

The SDK includes comprehensive error handling and retry logic:

```typescript
try {
  await tinycdp.identify({ userId: 'user-123' });
} catch (error) {
  console.error('Failed to identify user:', error);
}

// Track events never throw - they're queued and retried automatically
tinycdp.track({ userId: 'user-123', event: 'purchase' });

try {
  const decision = await tinycdp.decide({
    userId: 'user-123',
    flag: 'premium-features',
  });
} catch (error) {
  console.error('Failed to get decision:', error);
  // Fallback to default behavior
}
```

## Browser Usage

The SDK works seamlessly in browser environments:

```html
<script type="module">
  import { initTinyCDP } from 'https://unpkg.com/@tinycdp/sdk/dist/index.esm.js';
  
  const tinycdp = initTinyCDP({
    endpoint: 'https://your-tinycdp-instance.com',
    writeKey: 'your-write-key',
    readKey: 'your-read-key',
  });
  
  // Automatically flushes events on page unload
  tinycdp.track({ userId: 'user-123', event: 'page_view' });
</script>
```

## Node.js Usage

Perfect for server-side tracking:

```typescript
import { initTinyCDP } from '@tinycdp/sdk';

const tinycdp = initTinyCDP({
  endpoint: process.env.TINYCDP_ENDPOINT,
  writeKey: process.env.TINYCDP_WRITE_KEY,
  readKey: process.env.TINYCDP_READ_KEY,
});

// Track server-side events
tinycdp.track({
  userId: req.user.id,
  event: 'api_request',
  properties: {
    endpoint: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
  },
});

// Make decisions for personalization
const decision = await tinycdp.decide({
  userId: req.user.id,
  flag: 'new-dashboard',
});

res.json({
  user: req.user,
  features: {
    newDashboard: decision.allow,
  },
});
```

## Performance

The SDK is designed for high performance:

- **Event batching**: Events are automatically batched to reduce network requests
- **Automatic retries**: Failed requests are retried with exponential backoff
- **Offline queueing**: Events are queued when offline and sent when reconnected
- **Minimal bundle size**: Tree-shakeable and optimized for both browser and Node.js
- **Non-blocking**: Track events are fire-and-forget, never blocking your application

## TypeScript Support

The SDK is built with TypeScript and provides full type safety:

```typescript
import type { TinyCDPClient, Decision } from '@tinycdp/sdk';

const tinycdp: TinyCDPClient = initTinyCDP({
  endpoint: 'https://your-tinycdp-instance.com',
  writeKey: 'your-write-key',
  readKey: 'your-read-key',
});

const decision: Decision = await tinycdp.decide({
  userId: 'user-123',
  flag: 'premium-features',
});
```

## Best Practices

### 1. Initialize Once

Create a single client instance and reuse it throughout your application:

```typescript
// client.ts
export const tinycdp = initTinyCDP({
  endpoint: process.env.TINYCDP_ENDPOINT!,
  writeKey: process.env.TINYCDP_WRITE_KEY!,
  readKey: process.env.TINYCDP_READ_KEY!,
});

// feature.ts
import { tinycdp } from './client';
tinycdp.track({ userId: 'user-123', event: 'feature_used' });
```

### 2. Handle Decisions Gracefully

Always provide fallback behavior when decisions fail:

```typescript
async function shouldShowFeature(userId: string): Promise<boolean> {
  try {
    const decision = await tinycdp.decide({ userId, flag: 'new-feature' });
    return decision.allow;
  } catch (error) {
    console.error('Decision failed, falling back to default:', error);
    return false; // Safe default
  }
}
```

### 3. Track Meaningful Events

Focus on events that drive your traits and segments:

```typescript
// Good: Business-relevant events
tinycdp.track({ userId, event: 'purchase', properties: { amount: 99.99 } });
tinycdp.track({ userId, event: 'trial_started' });
tinycdp.track({ userId, event: 'feature_adoption', properties: { feature: 'dashboard' } });

// Avoid: Too granular or meaningless events
tinycdp.track({ userId, event: 'mouse_move' }); // Too granular
tinycdp.track({ userId, event: 'page_load' });  // Often not useful
```

### 4. Clean Up Properly

Always destroy the client when your application shuts down:

```typescript
// Node.js
process.on('SIGTERM', async () => {
  await tinycdp.flush();
  tinycdp.destroy();
  process.exit(0);
});

// React
useEffect(() => {
  return () => {
    tinycdp.destroy();
  };
}, []);
```

## License

MIT License - see LICENSE file for details.
