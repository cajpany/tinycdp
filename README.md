# TinyCDP - Real-time Traits & Segments Engine

TinyCDP is an open-source, real-time traits & segments engine - a lightweight replacement for Segment Personas / Amplitude Audiences. Apps send events and identities; TinyCDP computes user traits (e.g., "power_user", "recent_buyer"), evaluates segments from those traits, and exposes a low-latency Decisions API for instant feature flagging.

> **Updated**: September 2025 - Production-ready with cloud deployment, Encore secrets, and comprehensive TypeScript SDK

🌐 **Live Demo**: [https://staging-tinycdp-s3b2.encr.app/frontend/](https://staging-tinycdp-s3b2.encr.app/frontend/)  
📊 **Dashboard**: Full web console with visual management  
🔧 **SDK**: Production-ready TypeScript SDK with React integration  
☁️ **Cloud Ready**: Deploy with Encore Cloud in one command

## Quick Start

### 🚀 Option 1: Try the Live Demo

The fastest way to explore TinyCDP:

1. **Visit the live demo**: [https://staging-tinycdp-s3b2.encr.app/frontend/](https://staging-tinycdp-s3b2.encr.app/frontend/)
2. **Use the admin API key**: `uykXSMQkHIerkcmRcJ4sJYTxhQEKycfY`
3. **Explore**: Pre-loaded with sample users, traits, segments, and flags
4. **Test the SDK**: See [TypeScript SDK examples](./examples/)

### 💻 Option 2: Local Development

**Prerequisites:**
- Node.js 18+
- Encore CLI ([install here](https://encore.dev/docs/install))

**Setup:**

1. **Clone and install**:
   ```bash
   git clone https://github.com/cajpany/tinycdp.git
   cd tinycdp
   npm install
   ```

2. **Start the backend**:
   ```bash
   cd backend && encore run
   ```
   The API will be available at `http://localhost:4000`

3. **Set up secrets** (choose one):
   - **Via Encore secrets**: Configure in [Encore Dashboard](https://app.encore.dev)
   - **Via environment file**: Create `backend/.env` with your API keys

4. **Seed sample data**:
   ```bash
   npx tsx scripts/seed-local.ts
   ```

5. **Start the frontend** (optional):
   ```bash
   cd frontend && npm install && npm run dev
   ```
   Web console available at `http://localhost:5173/`

## 📊 Web Console

TinyCDP includes a powerful web console for managing traits, segments, and flags:

### 🌐 **Live Demo**: [staging-tinycdp-s3b2.encr.app/frontend/](https://staging-tinycdp-s3b2.encr.app/frontend/)
### 💻 **Local**: [localhost:5173](http://localhost:5173/) (when running locally)

**Setup:**
1. **Access the console** via the URLs above
2. **Configure API key**: Go to Settings and enter your API key:
   - **Live Demo**: `uykXSMQkHIerkcmRcJ4sJYTxhQEKycfY`
   - **Local**: Use keys from your local secrets or database
3. **Start managing**: Create and test traits, segments, and feature flags

### Console Features

- 📊 **Dashboard**: Real-time system metrics and activity overview
- 🧬 **Traits**: Visual trait builder with expression testing
- 🎯 **Segments**: Segment designer with live validation
- 🏳️ **Flags**: Feature flag management with decision testing
- 👥 **Users**: Search and debug user profiles and data
- 📄 **Exports**: CSV export with download management
- ⚙️ **Settings**: API key configuration and system settings

## Project Structure

```
/backend/
├── shared/           # Shared database, types, utilities, and logging
├── ingest/          # Event ingestion service
├── identity/        # User and identity management
├── traits/          # Trait computation engine
├── segments/        # Segment evaluation
├── decide/          # Low-latency decision API
├── admin/           # Admin operations
└── exports/         # Data export functionality

/frontend/           # React web console
/packages/sdk/       # TypeScript SDK
/examples/           # SDK usage examples
/scripts/            # Development and deployment scripts
```

## Core Features ✅

### Phase 1-7 Complete!

**✅ Event Ingestion**: Track user events and manage identities
- `POST /v1/identify` - Create/update user profiles
- `POST /v1/track` - Track behavioral events

**✅ Real-time Trait Computation**: Automatic calculation of user characteristics
- Rolling window aggregates (7d, 14d, 30d counts)
- Complex trait expressions with full DSL support
- Profile-based traits and behavioral metrics

**✅ Segment Evaluation**: Group users based on traits
- Boolean logic for combining traits
- Real-time segment membership updates
- Automatic computation pipeline

**✅ Decision API**: Fast feature flag decisions
- `GET /v1/decide?userId=<id>&flag=<flag>` - Real-time decisions
- Built-in caching (60s TTL) for sub-150ms responses
- Support for segment() and trait() functions in flag rules

**✅ Complete Admin APIs**: Full management interface
- CRUD operations for traits, segments, and flags
- Expression validation and testing
- User search and detailed debugging
- System metrics and monitoring
- Full API key authentication system

**✅ CSV Export**: Data export functionality
- `GET /v1/export/segment/:key` - Export segment users to CSV
- `GET /v1/export/list` - List available exports
- Secure signed download URLs

**✅ TypeScript SDK**: Production-ready SDK
- Browser and Node.js support  
- Event batching with configurable flush
- Automatic retries and error handling
- Offline queueing support
- React hooks and components
- Comprehensive examples and documentation

**✅ Web Console**: Complete management interface
- Dashboard with system metrics
- Visual trait and segment management
- Feature flag configuration
- User search and debugging
- Export management

## API Examples

### Basic Usage

```bash
# 1. Create demo API keys
cd backend && encore exec npx tsx ../scripts/create-demo-key.ts

# 2. Track user events
curl -X POST http://localhost:4000/v1/track \
  -H "Authorization: Bearer YOUR_WRITE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "user123",
    "event": "purchase", 
    "props": {"amount": 99.99}
  }'

# 3. Create a trait definition (via admin API or web console)
curl -X POST http://localhost:4000/v1/admin/traits \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "frequent_buyer",
    "expression": "events.purchase.count_30d >= 3"
  }'

# 4. Create a segment (via admin API or web console)
curl -X POST http://localhost:4000/v1/admin/segments \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "vip_users", 
    "rule": "frequent_buyer == true"
  }'

# 5. Create a feature flag (via admin API or web console)
curl -X POST http://localhost:4000/v1/admin/flags \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "premium_features",
    "rule": "segment(\"vip_users\")"
  }'

# 6. Make real-time decisions
curl "http://localhost:4000/v1/decide?userId=user123&flag=premium_features" \
  -H "Authorization: Bearer YOUR_READ_KEY"
```

### Admin & Debugging APIs

```bash
# Search users
curl "http://localhost:4000/v1/admin/users/search?query=user123" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"

# Get detailed user information
curl "http://localhost:4000/v1/admin/users/USER_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"

# Get system metrics
curl "http://localhost:4000/v1/admin/metrics" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"

# Validate expressions
curl -X POST http://localhost:4000/v1/admin/validate \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "expression": "events.purchase.count_30d >= 1",
    "type": "trait"
  }'

# Export segment to CSV
curl "http://localhost:4000/v1/export/segment/vip_users" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"

# List available exports
curl "http://localhost:4000/v1/export/list" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"
```

## 💻 TypeScript SDK

TinyCDP includes a comprehensive TypeScript SDK for easy integration into web and Node.js applications.

### Quick Start

```bash
npm install @tinycdp/sdk
```

```typescript
import { initTinyCDP } from '@tinycdp/sdk';

// Initialize the client
const tinycdp = initTinyCDP({
  endpoint: 'https://staging-tinycdp-s3b2.encr.app',
  writeKey: 'your-write-key',  // For identify() and track()
  readKey: 'your-read-key',    // For decide()
  debug: true,
});

// Identify a user
await tinycdp.identify({
  userId: 'user_123',
  traits: { email: 'john@example.com', plan: 'premium' }
});

// Track events (automatically batched)
tinycdp.track({
  userId: 'user_123',
  event: 'button_clicked',
  properties: { button_name: 'signup', page: '/homepage' }
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

### React Integration

The SDK includes React hooks and components for seamless integration:

```tsx
import { TinyCDPProvider, useFeatureFlag, TrackedButton } from './examples/react-usage';

// App-level provider
function App() {
  return (
    <TinyCDPProvider
      endpoint="https://staging-tinycdp-s3b2.encr.app"
      writeKey="your-write-key"
      readKey="your-read-key"
    >
      <HomePage />
    </TinyCDPProvider>
  );
}

// Feature flag hook
function MyComponent() {
  const { value: showFeature, loading } = useFeatureFlag('new_feature');
  
  if (loading) return <div>Loading...</div>;
  return showFeature ? <NewFeature /> : <OldFeature />;
}

// Automatic event tracking
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

### 📚 SDK Examples

Comprehensive examples are available in the [`examples/`](./examples/) directory:

- **[`test-sdk-example.ts`](./examples/test-sdk-example.ts)**: **Runnable test script** - validates SDK patterns against live API
- **[`sdk-usage-patterns.ts`](./examples/sdk-usage-patterns.ts)**: Complete integration guide with real-world patterns  
- **[`typescript-sdk-usage.ts`](./examples/typescript-sdk-usage.ts)**: Complete SDK integration examples
- **[`react-usage.tsx`](./examples/react-usage.tsx)**: React hooks, components, and patterns
- **[`README.md`](./examples/README.md)**: Getting started guide and best practices

**Try the examples:**
```bash
# Run end-to-end SDK tests against staging environment
npx tsx examples/test-sdk-example.ts
```

### 🔧 SDK Features

- **✅ Event Batching**: Automatic batching with configurable flush intervals
- **✅ Offline Support**: Queue events when offline, sync when online
- **✅ Auto Retry**: Configurable retry logic with exponential backoff
- **✅ TypeScript**: Full type safety and IntelliSense support
- **✅ React Hooks**: `useFeatureFlag`, `useTracking`, `useExperiment`
- **✅ Browser & Node**: Works in both browser and server environments
- **✅ Debug Mode**: Detailed logging for development
- **✅ Production Ready**: Battle-tested patterns and error handling

### Trait Expression Examples

```typescript
// Event-based traits
"events.purchase.count_30d >= 1"
"events.app_open.unique_days_14d >= 5"  
"last_seen_minutes_ago < 1440"

// Complex combinations
"events.purchase.count_30d >= 1 && events.app_open.count_7d >= 3"
"profile.plan in [\"premium\", \"enterprise\"]"
```

### Flag Rule Examples

```typescript
// Segment-based flags
"segment(\"power_users\")"
"segment(\"recent_buyers\") && segment(\"high_value\")"

// Trait-based flags  
"trait(\"frequent_buyer\") == true"
"trait(\"total_spent\") >= 500"
```

## Services

### Health Checks

All services provide comprehensive health check endpoints with detailed logging:

- `GET /ingest/health`
- `GET /identity/health`
- `GET /traits/health`
- `GET /segments/health`
- `GET /decide/health`
- `GET /admin/health`
- `GET /exports/health`

Each health check includes:
- Service status
- Database connectivity and latency
- Storage connectivity (for export service)
- Detailed error information
- Performance metrics

### Testing

Run the test suite:

```bash
npm test
```

Test SDK functionality end-to-end:

```bash
# Test SDK examples against live staging environment
npx tsx examples/test-sdk-example.ts
```

Test Phase 4 functionality:

```bash
# Test segments and decision engine
npx tsx scripts/test-phase4.ts YOUR_ADMIN_KEY
```

### Debugging

For deployment issues, you can:

1. **Check individual service health:**
   ```bash
   curl http://localhost:4000/ingest/health
   ```

2. **Run comprehensive health checks:**
   ```bash
   npx tsx scripts/health-check.ts
   ```

3. **Test API functionality:**
   ```bash
   npx tsx scripts/test-api.ts YOUR_WRITE_KEY
   ```

## Development Phases

This project is built in phases:

- **Phase 1**: Foundation & Core Infrastructure ✅
- **Phase 2**: Identity & Event Ingestion ✅
- **Phase 3**: Traits Engine ✅
- **Phase 4**: Segments & Decision Engine ✅
- **Phase 5**: Admin API & Management ✅
- **Phase 6**: TypeScript SDK ✅
- **Phase 7**: Web Console ✅

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for detailed development roadmap.

## Production Ready Features

TinyCDP is now production-ready with:

**✅ Complete API Coverage:**
- Event tracking and identity management
- Real-time trait computation
- Segment evaluation
- Feature flag decisions
- Full admin APIs
- CSV export functionality
- User debugging and monitoring

**✅ Web Console:**
- Visual management interface
- Real-time metrics dashboard
- Expression testing and validation
- User search and debugging
- Export management

**✅ Production SDK:**
- Browser and Node.js support
- Event batching and offline queueing
- Automatic retries and error handling
- Full TypeScript support

**✅ Developer Experience:**
- Comprehensive testing tools
- Health check endpoints
- Detailed logging
- Clear documentation

## 🚀 Cloud Deployment

### Deploy to Encore Cloud

1. **Deploy with one command**:
   ```bash
   git push  # Automatically triggers deployment
   ```

2. **Configure secrets** in the [Encore Dashboard](https://app.encore.dev):
   - `ADMIN_API_KEY`: For admin operations
   - `WRITE_API_KEY`: For identify() and track() calls  
   - `READ_API_KEY`: For decide() calls

3. **Seed production data**:
   ```bash
   npx tsx scripts/seed-cloud.ts
   ```

4. **Access your deployment**: Your app will be available at `https://your-app.encr.app/frontend/`

### 📊 Configuration Options

#### Local Development
- **Encore Secrets**: Configure in [Encore Dashboard](https://app.encore.dev)
- **Environment File**: Create `backend/.env` with API keys
- **Database Keys**: Use `scripts/create-demo-key.ts` for database-stored keys

#### Production 
- **Encore Secrets**: Managed secrets with automatic syncing
- **Environment Variables**: Set via cloud platform
- **Hybrid Approach**: Secrets for keys, environment for configuration

## 🏠 Getting Started with the Web Console

### 🌐 Live Demo
1. **Visit**: [staging-tinycdp-s3b2.encr.app/frontend/](https://staging-tinycdp-s3b2.encr.app/frontend/)
2. **Admin API key**: `uykXSMQkHIerkcmRcJ4sJYTxhQEKycfY`
3. **Pre-loaded data**: Sample users, traits, segments, and flags ready to explore

### 💻 Local Development
1. **Start TinyCDP**: `encore run` (from backend directory)
2. **Configure API key**: Go to Settings in the web console
3. **Create sample data**: `npx tsx scripts/seed-local.ts`
4. **Start building**: Create traits, segments, flags, and test with the SDK

## 🔧 Troubleshooting

### Common Issues

#### Local Development
- **"API key required" in console**: Set up secrets or create database keys
- **Secrets not loading**: Ensure app is linked to correct Encore Cloud app
- **500 errors**: Check if API keys are properly configured in secrets or environment
- **Build issues**: Run `npm install` in both root and frontend directories

#### Cloud Deployment  
- **Deployment fails**: Check that secrets are configured in Encore Dashboard
- **Frontend assets 404**: Ensure `base: '/frontend/'` is set in vite config
- **API not accessible**: Verify root directory is set to `backend` in Encore settings

#### General
- **Database connection failures**: Check PostgreSQL is running and accessible
- **Storage errors**: Verify object storage bucket configuration
- **Export failures**: Ensure object storage has proper write permissions

### 🎯 Getting Help

#### Debug Tools
1. **Health endpoints**: Check `/service-name/health` for each service
2. **Comprehensive health check**: `npx tsx scripts/health-check.ts`
3. **API testing**: `npx tsx scripts/test-api.ts YOUR_API_KEY`
4. **Live demo**: Test functionality at [staging-tinycdp-s3b2.encr.app/frontend/](https://staging-tinycdp-s3b2.encr.app/frontend/)

#### Configuration Issues
- **Local secrets**: Use Encore Dashboard or create `backend/.env`
- **App linking**: Run `encore app link YOUR_APP_ID` in backend directory
- **API keys**: Generate via scripts or configure in Encore secrets
- **Database**: Ensure `encore run` completes migration successfully

## License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.
