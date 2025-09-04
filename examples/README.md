# TinyCDP TypeScript SDK Examples

This directory contains comprehensive examples showing how to use the TinyCDP TypeScript SDK in various scenarios.

## 🚀 Quick Start

### 1. Installation

```bash
npm install @tinycdp/sdk
```

### 2. Basic Usage

```typescript
import { initTinyCDP } from '@tinycdp/sdk';

// Initialize the client
const tinycdp = initTinyCDP({
  endpoint: 'https://staging-tinycdp-s3b2.encr.app',
  writeKey: 'your-write-key',  // For identify() and track()
  readKey: 'your-read-key',    // For decide()
  debug: true, // Enable for development
});

// Identify a user
await tinycdp.identify({
  userId: 'user_123',
  traits: {
    email: 'john@example.com',
    plan: 'premium'
  }
});

// Track events (batched automatically)
tinycdp.track({
  userId: 'user_123',
  event: 'button_clicked',
  properties: {
    button_name: 'signup',
    page: '/homepage'
  }
});

// Make real-time decisions
const decision = await tinycdp.decide({
  userId: 'user_123',
  flag: 'premium_features'
});

if (decision.allow) {
  // Show premium features
}
```

## 📁 Example Files

### [`typescript-sdk-usage.ts`](./typescript-sdk-usage.ts)
Comprehensive examples covering:
- ✅ Basic setup and configuration
- ✅ User identification and profile updates
- ✅ Event tracking (page views, purchases, features)
- ✅ Feature flag decisions
- ✅ A/B testing implementation
- ✅ Production-ready patterns
- ✅ Analytics wrapper class
- ✅ Error handling and fallbacks

### [`react-usage.tsx`](./react-usage.tsx)
React-specific integration examples:
- ✅ Provider pattern for app-wide SDK access
- ✅ Custom hooks (`useFeatureFlag`, `useTracking`, `useExperiment`)
- ✅ Reusable components (`FeatureGate`, `TrackedButton`)
- ✅ Real-world page examples (Homepage, Dashboard, Pricing)
- ✅ Automatic page view tracking
- ✅ Component-level feature flags

## 🔑 API Keys

You'll need API keys from your TinyCDP dashboard:

- **Write Key**: For `identify()` and `track()` calls
- **Read Key**: For `decide()` calls
- **Admin Key**: For management operations (dashboard only)

Get these from: `https://your-tinycdp-url/frontend/` → Settings

## 🎯 Core Features

### User Identification
```typescript
// Create or update user profiles
await tinycdp.identify({
  userId: 'user_123',
  traits: {
    email: 'user@example.com',
    plan: 'premium',
    signup_date: '2024-01-15',
    total_orders: 5
  }
});
```

### Event Tracking
```typescript
// Track user actions (automatically batched)
tinycdp.track({
  userId: 'user_123',
  event: 'purchase_completed',
  properties: {
    order_id: 'ord_123',
    amount: 99.99,
    currency: 'USD',
    items: ['item_1', 'item_2']
  }
});
```

### Feature Flags & Decisions
```typescript
// Real-time feature flag decisions
const decision = await tinycdp.decide({
  userId: 'user_123',
  flag: 'new_checkout_flow'
});

console.log(decision.allow); // true/false
console.log(decision.variant); // optional variant name
```

## 🔧 Advanced Configuration

```typescript
const tinycdp = initTinyCDP({
  endpoint: 'https://your-tinycdp-endpoint.com',
  writeKey: 'your-write-key',
  readKey: 'your-read-key',
  
  // Batching configuration
  flushAt: 20,              // Send when 20 events queued
  flushIntervalMs: 10000,   // Or every 10 seconds
  maxQueueSize: 1000,       // Max events in queue
  
  // Retry configuration
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
  
  // Other options
  debug: false,             // Enable debug logging
  timeout: 15000,           // Request timeout
  autoFlushOnUnload: true,  // Flush on page unload
});
```

## 🎛️ React Integration

### Provider Setup
```tsx
import { TinyCDPProvider } from './react-usage';

function App() {
  return (
    <TinyCDPProvider
      endpoint="https://your-tinycdp-endpoint.com"
      writeKey="your-write-key"
      readKey="your-read-key"
    >
      <YourAppComponents />
    </TinyCDPProvider>
  );
}
```

### Feature Flag Hook
```tsx
function MyComponent() {
  const { value: showFeature, loading } = useFeatureFlag('new_feature');
  
  if (loading) return <div>Loading...</div>;
  
  return showFeature ? <NewFeature /> : <OldFeature />;
}
```

### Automatic Tracking
```tsx
function MyButton() {
  return (
    <TrackedButton 
      trackingEvent="signup_clicked"
      trackingProperties={{ source: 'homepage' }}
    >
      Sign Up
    </TrackedButton>
  );
}
```

## 🧪 Testing Your Integration

### 1. Test with Demo Data

Use the sample data from the cloud seed script:
- Demo users: `demo-user-power`, `demo-user-mobile`, `demo-user-vip`
- Feature flags: `premium_features`, `discount_offer`, `vip_support`

### 2. Check the Dashboard

Monitor your events and decisions at: `https://your-tinycdp-endpoint.com/frontend/`

### 3. Debug Mode

Enable debug logging to see what's happening:
```typescript
const tinycdp = initTinyCDP({
  // ... other config
  debug: true, // Will log all SDK activity
});
```

## 🔍 Common Patterns

### User Lifecycle
```typescript
// Signup
await tinycdp.identify({ userId, traits: { email, plan } });
tinycdp.track({ userId, event: 'user_signed_up' });

// Login
tinycdp.track({ userId, event: 'user_logged_in' });

// Subscription
tinycdp.track({ userId, event: 'subscription_started', properties: { plan } });
```

### A/B Testing
```typescript
const variant = await getExperimentVariant(userId, 'checkout_experiment');

if (variant === 'treatment') {
  // Show new checkout flow
} else {
  // Show control checkout flow
}
```

### Progressive Feature Rollout
```typescript
const showBetaFeature = await tinycdp.decide({ userId, flag: 'beta_feature' });

// Flag could be configured to enable for:
// - Power users: trait("power_user") == true
// - 10% of users: random() < 0.1
// - Specific segments: segment("early_adopters")
```

## 📊 Analytics Best Practices

1. **Identify Early**: Call `identify()` as soon as you know the user
2. **Track Meaningful Events**: Focus on business-critical actions
3. **Use Consistent Naming**: Stick to a naming convention (e.g., `snake_case`)
4. **Include Context**: Add relevant properties to events
5. **Handle Errors**: Feature flags should degrade gracefully
6. **Test Flags**: Always test both enabled/disabled states
7. **Monitor Performance**: Check dashboard for decision latency

## 🚨 Error Handling

```typescript
try {
  const decision = await tinycdp.decide({ userId, flag: 'feature' });
  // Use decision.allow
} catch (error) {
  console.error('Feature flag error:', error);
  // Fall back to default behavior
  const decision = { allow: false }; // Safe default
}
```

## 🧹 Cleanup

```typescript
// Clean up resources when done (e.g., on app unmount)
tinycdp.destroy();
```

## 📚 Additional Resources

- [TinyCDP Dashboard](https://staging-tinycdp-s3b2.encr.app/frontend/)
- [API Documentation](../README.md)
- [Trait Expression Guide](../TRAITS.md)
- [Segment Rules Guide](../SEGMENTS.md)

## 🆘 Need Help?

- Check the examples in this directory
- Review the [main documentation](../README.md)
- Test with the seeded demo data
- Enable debug mode for detailed logging
