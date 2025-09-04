# TinyCDP - Real-time Traits & Segments Engine

TinyCDP is an open-source, real-time traits & segments engine - a lightweight replacement for Segment Personas / Amplitude Audiences. Apps send events and identities; TinyCDP computes user traits (e.g., "power_user", "recent_buyer"), evaluates segments from those traits, and exposes a low-latency Decisions API for instant feature flagging.

> **Updated**: September 2025 - Fixed authentication and user search functionality

## Quick Start

### Prerequisites
- Node.js 18+
- Encore CLI ([install here](https://encore.dev/docs/install))

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run database migrations:
   ```bash
   encore db migrate
   ```

4. Create demo API keys:
   ```bash
   npx tsx scripts/create-demo-key.ts
   ```

5. Seed the database with sample data (optional):
   ```bash
   npx tsx scripts/seed.ts
   ```

6. Start the development server:
   ```bash
   encore run
   ```

The API will be available at `http://localhost:4000`

## Web Console

TinyCDP includes a web console for managing traits, segments, and flags:

1. **Access the console**: Open `http://localhost:4000` in your browser (when running locally)
2. **Configure API key**: Go to Settings and paste your admin API key
3. **Start managing**: Create traits, segments, and feature flags through the UI

### Console Features

- **Dashboard**: System overview with metrics and activity
- **Traits**: Create and manage trait definitions with expression testing
- **Segments**: Define user segments with real-time validation
- **Flags**: Configure feature flags with decision testing
- **Users**: Search and explore user profiles and data
- **Exports**: Export segment data as CSV files

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
npx tsx scripts/create-demo-key.ts

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

## Getting Started with the Web Console

1. **Start TinyCDP**:
   ```bash
   encore run
   ```

2. **Create API keys**:
   ```bash
   npx tsx scripts/create-demo-key.ts
   ```

3. **Access the console**: Open http://localhost:4000 in your browser

4. **Configure API key**: 
   - Go to Settings
   - Paste your admin API key
   - Save

5. **Start building**:
   - Create traits to define user characteristics
   - Build segments to group users
   - Set up feature flags for A/B testing
   - Track events with the SDK

## Troubleshooting

### Common Issues

- **Console shows "API key required"**: Go to Settings and configure your admin API key
- **Database connection failures**: Check PostgreSQL is running and accessible
- **Storage errors**: Verify object storage bucket configuration
- **Service startup**: Check for port conflicts or missing dependencies
- **Export failures**: Ensure object storage has proper write permissions

### Getting Help

1. **Check health endpoints** - All services now provide detailed health information
2. **Review logs** - Enhanced logging provides better error context
3. **Run health check script** - Use `npx tsx scripts/health-check.ts` for comprehensive testing
4. **Verify database** - Ensure migrations have run successfully
5. **Check storage** - Verify object storage is properly configured

## License

MIT License - see LICENSE file for details.
