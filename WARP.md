# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

TinyCDP is an open-source, real-time traits & segments engine - a lightweight replacement for Segment Personas / Amplitude Audiences. It provides event tracking, trait computation, segment evaluation, and feature flag decisions through a microservices architecture built with Encore.ts.

## Development Commands

### Setup and Installation
```bash
# Install Encore CLI (prerequisite)
curl -L https://encore.dev/install.sh | bash  # Linux/macOS
brew install encoredev/tap/encore             # macOS via Homebrew

# Install dependencies
npm install

# Setup database
encore db migrate

# Create API keys for development
npx tsx scripts/create-demo-key.ts

# Seed database with sample data (optional)
npx tsx scripts/seed.ts
```

### Running the Application
```bash
# Start backend development server
cd backend && encore run
# Backend available at http://localhost:4000

# Start frontend (separate terminal)
cd frontend && npm install && npx vite dev
# Frontend available at http://localhost:5173
```

### Testing
```bash
# Run all tests
npm test

# Run specific test suites
cd backend && npm test                    # Backend unit tests
npx tsx scripts/health-check.ts         # Health check all services
npx tsx scripts/test-api.ts <API_KEY>   # Test API endpoints
npx tsx scripts/test-phase4.ts <API_KEY> # Test segments and decisions
```

### Development Utilities
```bash
# Generate frontend API client
cd backend && encore gen client --target leap

# Create additional API keys
npx tsx scripts/create-admin-key.ts

# Build frontend for production
cd backend && npm run build
```

## Architecture Overview

### Service Architecture
TinyCDP follows a microservices architecture with 7 distinct services:

1. **ingest** - Event ingestion and validation (`POST /v1/track`, `/v1/identify`)
2. **identity** - User management and alias linking
3. **traits** - Trait computation engine with DSL evaluation
4. **segments** - Segment evaluation using trait-based rules
5. **decide** - Low-latency decision API with caching (`GET /v1/decide`)
6. **admin** - CRUD operations and system management
7. **exports** - CSV data export functionality

### Data Flow
```
Events → Ingest → Identity → Traits → Segments → Decide
                                                   ↓
                                              Cache Layer
```

### Key Design Patterns

**Service Communication**: Services communicate via direct Encore.ts service calls (`identity.ensureUser()`, `traits.compute()`)

**Authentication**: Three-tier API key system (read/write/admin) with SHA256 hashing

**Caching**: Built-in Encore caching with 60-second TTL for decision API performance

**Database**: Single PostgreSQL database with service-specific table access patterns

## Core Components

### Trait DSL (Domain Specific Language)
The traits engine supports a powerful expression language:
```typescript
// Event aggregates
"events.purchase.count_30d >= 3"
"events.app_open.unique_days_14d >= 5"

// Profile fields  
"profile.plan in [\"premium\", \"enterprise\"]"

// Time-based
"last_seen_minutes_ago < 1440"
"first_seen_days_ago > 7"

// Complex combinations
"events.purchase.count_30d >= 1 && events.app_open.count_7d >= 3"
```

### Segment Rules
Boolean logic combining traits:
```typescript
"frequent_buyer == true"
"power_user == true && recent_buyer == true"
```

### Flag Rules
Decision logic with segment/trait functions:
```typescript
"segment(\"vip_users\")"
"trait(\"total_spent\") >= 500"
"segment(\"recent_buyers\") && segment(\"high_value\")"
```

## Database Schema

### Core Tables
- `users` - User identity records
- `user_aliases` - Identity mapping (deviceId, externalId, emailHash)
- `events` - Raw event data with JSONB properties
- `user_traits` - Computed trait values per user
- `user_segments` - Segment membership with timestamps
- `api_keys` - Authentication tokens

### Configuration Tables
- `trait_defs` - Trait expression definitions
- `segment_defs` - Segment rule definitions  
- `flags` - Feature flag rules

## Performance Considerations

### Targets
- Decision API: ≤150ms p95 with warm cache
- Trait update to decision: ≤5s end-to-end
- Throughput: 1000+ events/minute per user

### Optimization Strategies
- Indexed queries on `events(user_id, ts)` and `events(name, ts)`
- Cached decision responses with automatic invalidation
- Batched segment computation
- Direct service calls (no message queues)

## API Structure

### Public APIs
- `POST /v1/identify` - Create/update user profiles (write key)
- `POST /v1/track` - Track behavioral events (write key)  
- `GET /v1/decide` - Real-time feature flag decisions (read key)

### Admin APIs
- `/v1/admin/traits` - CRUD for trait definitions
- `/v1/admin/segments` - CRUD for segment definitions
- `/v1/admin/flags` - CRUD for feature flags
- `/v1/admin/users/*` - User search and debugging
- `/v1/admin/metrics` - System monitoring

### Health Endpoints
All services provide `/health` endpoints with database connectivity and performance metrics.

## Development Workflow

### Phase-Based Development
The project was built in 7 phases:
1. Foundation & Infrastructure
2. Identity & Event Ingestion  
3. Traits Engine
4. Segments & Decision Engine
5. Admin API & Management
6. TypeScript SDK
7. Web Console

### Testing Strategy
- **Unit Tests**: Trait DSL evaluation, segment logic, window calculations
- **Integration Tests**: Service communication, database integrity
- **Health Checks**: All services monitored via health endpoints
- **Manual Testing**: Scripts for API validation and performance testing

## File Organization

### Backend Structure
```
backend/
├── shared/           # Common utilities (db, auth, logger, errors)
├── ingest/          # Event ingestion service  
├── identity/        # User management
├── traits/          # Trait computation engine
├── segments/        # Segment evaluation
├── decide/          # Decision API with caching
├── admin/           # Management operations
└── exports/         # CSV export functionality
```

### Key Files
- `shared/auth.ts` - API key authentication system
- `shared/db.ts` - Database connection and monitoring
- `shared/logger.ts` - Structured logging
- `shared/errors.ts` - Error handling patterns
- `traits/compute.ts` - DSL evaluation engine
- `decide/decide.ts` - Cached decision logic

### Scripts Directory
- `create-demo-key.ts` - Generate development API keys
- `test-api.ts` - Validate API functionality
- `health-check.ts` - Comprehensive service testing
- `seed.ts` - Sample data generation

## Common Development Tasks

### Adding New Trait Expressions
1. Update trait DSL parser in `traits/` service
2. Add unit tests for new operators
3. Update admin API validation
4. Test via web console or admin API

### Adding New Services
1. Create service directory with `encore.service.ts`
2. Implement health endpoint
3. Add database access patterns
4. Update inter-service communication

### Performance Debugging
1. Check health endpoints for service status
2. Use admin metrics API for system overview
3. Monitor database query performance
4. Test decision API latency with warm/cold cache

## Production Considerations

### Deployment
- Uses Encore Cloud Platform or self-hosted Docker
- Frontend builds into backend for single deployment
- Database migrations handled by Encore CLI

### Monitoring
- Health endpoints provide service status
- Metrics API exposes system performance
- Structured logging throughout codebase
- Error tracking with context

### Security
- API key authentication with permission levels
- SHA256 hashed key storage
- Input validation with Zod schemas
- SQL injection protection via parameterized queries
