# TinyCDP - Real-time Traits & Segments Engine

## Project Overview

TinyCDP is an open-source, real-time traits & segments engine - a lightweight replacement for Segment Personas / Amplitude Audiences. Apps send events and identities; TinyCDP computes user traits (e.g., "power_user", "recent_buyer"), evaluates segments from those traits, and exposes a low-latency Decisions API for instant feature flagging.

**Target Audience:** Indie developers and startups wanting audience targeting without expensive CDP fees or vendor lock-in.

## Tech Stack (Finalized)

### Backend
- **Encore.ts** - TypeScript framework with built-in service boundaries
- **PostgreSQL** - Primary database via Encore's SQL database support
- **Built-in Caching** - Encore's caching primitives (no external Redis)
- **Built-in Object Storage** - For CSV exports via Encore's object storage
- **Direct API Calls** - Between services for simpler debugging
- **Simple API Key Auth** - Write/read/admin keys

### Frontend
- **React + TypeScript** - Frontend framework
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Vite** - Build tool

### Validation & Testing
- **Zod** - Schema validation
- **Vitest** - Unit and integration testing
- **Playwright** - E2E testing

### SDK
- **TypeScript SDK** - Browser + Node.js support with batching

## Architecture Overview

### Service Boundaries
1. **ingest** - Accept identify/track events, validate, persist
2. **identity** - User creation and alias management
3. **traits** - Compute rolling aggregates and trait expressions
4. **segments** - Evaluate segment rules from traits
5. **decide** - Low-latency decision API with caching
6. **admin** - CRUD operations for traits, segments, flags
7. **exports** - CSV export functionality

### Data Flow
```
Events → Ingest → Identity → Traits → Segments → Decide
                                                    ↓
                                              Cache Layer
```

## Phase-Based Development Plan

## Phase 1: Foundation & Core Infrastructure (Days 1-2) ✅

### 1.1 Project Setup ✅
- ✅ Initialize Encore.ts monorepo structure
- ✅ Set up database with migrations
- ✅ Configure built-in object storage
- ✅ Set up TypeScript configurations
- ✅ Initialize testing framework (Vitest)

### 1.2 Database Schema ✅
**Single-tenant simplified schema:**
```sql
-- Core tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_aliases (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT CHECK (kind IN ('deviceId','externalId','emailHash')) NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (kind, value)
);

CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL,
  name TEXT NOT NULL,
  props JSONB
);

-- Configuration tables
CREATE TABLE trait_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  expression TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE segment_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  rule TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE flags (
  key TEXT PRIMARY KEY,
  rule TEXT NOT NULL
);

-- Computed data tables
CREATE TABLE user_traits (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

CREATE TABLE user_segments (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  in_segment BOOLEAN NOT NULL,
  since TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

-- API Keys for simple auth
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT CHECK (kind IN ('write','read','admin')) NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX events_user_ts ON events(user_id, ts DESC);
CREATE INDEX events_name_ts ON events(name, ts DESC);
```

### 1.3 Service Scaffolding ✅
- ✅ Create all 7 services with basic structure
- ✅ Set up inter-service communication
- ✅ Basic health check endpoints

**Deliverables:**
- Working Encore.ts project structure
- Database migrations
- All services initialized with basic endpoints
- Test suite setup

---

## Phase 2: Identity & Event Ingestion (Day 3) ✅

### 2.1 Identity Service ✅
- ✅ User creation and lookup
- ✅ Alias linking (deviceId, externalId, emailHash)
- ✅ User merging logic

**API Functions:**
```typescript
// Internal service calls
ensureUser(deviceId?: string, externalId?: string): Promise<User>
linkAlias(userId: string, kind: string, value: string): Promise<void>
```

### 2.2 Ingest Service ✅
- ✅ `POST /v1/identify` - Create/update user identities
- ✅ `POST /v1/track` - Accept and validate events
- ✅ Simple API key authentication
- ✅ Event batching support
- ✅ Zod schema validation

**API Endpoints:**
```typescript
POST /v1/identify
{
  deviceId?: string;
  userId?: string;
  externalId?: string;
  traits?: Record<string, unknown>;
}

POST /v1/track
{
  userId: string;
  event: string;
  ts?: string; // ISO datetime
  props?: Record<string, unknown>;
}
```

### 2.3 Authentication System ✅
- ✅ Simple API key generation and validation
- ✅ Write/read/admin key types
- ✅ Middleware for endpoint protection

**Deliverables:**
- Working identity management
- Event ingestion with validation
- API key authentication
- Basic seed script with sample data

---

## Phase 3: Traits Engine (Day 4) ✅

### 3.1 Trait Computation Engine ✅
- ✅ Rolling window calculations (7d, 14d, 30d)
- ✅ Event counting and aggregation
- ✅ Profile field access
- ✅ Trait definition storage and retrieval

### 3.2 Trait DSL (Domain Specific Language) ✅
**Supported Operations:**
```typescript
// Aggregates
events.<name>.count_7d | count_30d
events.<name>.unique_days_14d
first_seen_days_ago
last_seen_minutes_ago

// Profile fields
profile.country
profile.plan

// Operators
==, !=, >, <, >=, <=, &&, ||, in([...])
```

**Example Expressions:**
```typescript
power_user = events.app_open.unique_days_14d >= 5
recent_buyer = events.purchase.count_30d >= 1 && last_seen_minutes_ago < 1440
```

### 3.3 Trait Processing ✅
- ✅ Parse and validate trait expressions
- ✅ Compute traits on event ingestion
- ✅ Update user_traits table
- ✅ Trigger segment re-evaluation

**Deliverables:**
- Working trait computation engine
- DSL parser and evaluator
- Trait persistence
- Unit tests for edge cases

---

## Phase 4: Segments & Decision Engine (Day 5) ✅

### 4.1 Segments Service ✅
- ✅ Segment rule evaluation
- ✅ Boolean logic for trait combinations
- ✅ Segment membership tracking
- ✅ Real-time segment updates

### 4.2 Decide Service ✅
- ✅ `GET /v1/decide` endpoint
- ✅ Built-in caching layer (60s TTL)
- ✅ Cache invalidation on segment changes
- ✅ Flag rule evaluation

**API Endpoint:**
```typescript
GET /v1/decide?userId=<id>&flag=<flag>
Response: {
  allow: boolean;
  variant?: string;
  reasons?: string[];
}
```

### 4.3 Performance Optimization ✅
- ✅ Cache warming strategies
- ✅ Optimized database queries
- ✅ Segment computation batching

**Performance Target:** 
- `GET /v1/decide` ≤150ms p95 with warm cache
- Trait update to decision change ≤5s end-to-end

**Deliverables:**
- Working segment evaluation
- Fast decision API
- Caching system
- Performance benchmarks

---

## Phase 5: Admin API & Management (Day 6) ✅

### 5.1 Admin Service ✅
- ✅ CRUD operations for trait definitions
- ✅ CRUD operations for segment definitions  
- ✅ CRUD operations for flags
- ✅ Admin token authentication
- ✅ Expression validation API
- ✅ User search and detail APIs
- ✅ System metrics and monitoring

**API Endpoints:**
```typescript
GET/POST/PUT/DELETE /v1/admin/traits
GET/POST/PUT/DELETE /v1/admin/segments
GET/POST/PUT/DELETE /v1/admin/flags
POST /v1/admin/validate - Expression validation
GET /v1/admin/users/search - User search
GET /v1/admin/users/:id - User detail
GET /v1/admin/metrics - System metrics
```

### 5.2 Exports Service ✅
- ✅ CSV export for segments
- ✅ Object storage integration
- ✅ `GET /v1/export/segment/:key.csv`
- ✅ Export file listing with download URLs

### 5.3 Monitoring & Debugging ✅
- ✅ User detail API (events, traits, segments)
- ✅ System health endpoints
- ✅ Comprehensive metrics collection
- ✅ User search functionality

**Deliverables:**
- Complete admin API
- CSV export functionality
- User debugging tools
- System monitoring dashboard data

---

## Phase 6: TypeScript SDK (Day 6-7) ✅

### 6.1 SDK Core ✅
- ✅ Browser and Node.js support
- ✅ Type-safe client generation
- ✅ Event batching with configurable flush

```typescript
export function initTinyCDP(opts: {
  writeKey?: string;
  readKey?: string;
  endpoint: string;
  flushAt?: number; // default 20
  flushIntervalMs?: number; // default 10000
}) {
  return {
    identify: (params: IdentifyParams) => Promise<void>;
    track: (params: TrackParams) => void; // batched
    flush: () => Promise<void>;
    decide: (params: DecideParams) => Promise<Decision>;
  };
}
```

### 6.2 SDK Features ✅
- ✅ Automatic retry logic
- ✅ Error handling and logging
- ✅ Offline queue support (via `sendBeacon`)
- ✅ TypeScript type exports

**Deliverables:**
- Production-ready SDK
- NPM package structure
- SDK documentation

---

## Phase 7: Web Console (Day 7)

### 7.1 React Console Application
- [ ] Authentication (admin token)
- [ ] Traits management (CRUD + expression tester)
- [ ] Segments management (CRUD + live counts)
- [ ] Flags management (CRUD + rule builder)
- [ ] User detail view (events, traits, segments)
- [ ] Export interface

### 7.2 Console Pages
```
/login          - Admin token authentication
/traits         - List/create/edit traits, test expressions
/segments       - List/create/edit segments, view counts
/flags          - List/create/edit flags, rule configuration
/users/:id      - User detail view
/exports        - Segment export downloads
```

### 7.3 Demo Application
- [ ] Simple web shop interface
- [ ] SDK integration example
- [ ] Real-time flag demonstration
- [ ] Paywall toggle based on segments

**Deliverables:**
- Working web console
- Demo application
- User documentation

---

## Testing Strategy

### Unit Tests (Vitest)
- ✅ Trait expression evaluation
- ✅ Segment rule logic
- ✅ Window calculation accuracy
- ✅ API input validation

### Integration Tests
- [ ] End-to-end event flow
- [ ] Cache invalidation
- [ ] Service communication
- [ ] Database integrity

### E2E Tests (Playwright)
- [ ] Console workflows
- [ ] SDK integration
- [ ] Demo application flows

### Performance Tests
- [ ] Decision API latency
- [ ] Event ingestion throughput
- [ ] Concurrent user handling

## Success Criteria

### Performance
- ✅ `GET /v1/decide` ≤150ms p95 with warm cache
- ✅ Trait update to decision change ≤5s end-to-end
- ✅ Handle 1000+ events/minute per user

### Functionality
- ✅ Complete trait computation with rolling windows
- ✅ Segment evaluation with boolean logic
- ✅ Real-time decision API
- ✅ CSV export functionality
- ✅ Complete admin API with monitoring
- [ ] Working web console
- ✅ Production-ready SDK

### Code Quality
- ✅ 80%+ test coverage
- ✅ Type-safe throughout
- ✅ Comprehensive documentation
- ✅ Clean, maintainable code

## Future Enhancements (Post-MVP)

### Advanced Features
- [ ] Multi-project support
- [ ] Advanced trait expressions (percentiles, etc.)
- [ ] A/B testing framework
- [ ] Real-time streaming dashboard

### Integrations
- [ ] Webhook support
- [ ] Third-party analytics connectors
- [ ] Cloud deployment templates
- [ ] Docker containers

### Scalability
- [ ] Horizontal scaling support
- [ ] Advanced caching strategies
- [ ] Event sourcing patterns
- [ ] Time-series optimizations

## Development Environment

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Encore CLI

### Setup Commands
```bash
# Install Encore CLI
curl -L https://encore.dev/install.sh | bash

# Clone and setup
git clone <repo>
cd tinycdp
npm install

# Database setup
encore db migrate
npm run seed

# Development
encore run
```

### Project Structure
```
/
├── backend/              # Encore.ts services
│   ├── ingest/          # Event ingestion
│   ├── identity/        # User management
│   ├── traits/          # Trait computation
│   ├── segments/        # Segment evaluation
│   ├── decide/          # Decision API
│   ├── admin/           # Admin operations
│   └── exports/         # Data export
├── frontend/            # React console
├── packages/
│   └── sdk/             # TypeScript SDK
├── examples/
│   └── web-demo/        # Demo application
└── scripts/             # Utilities and seeds
```

This phased approach ensures we build a solid foundation and incrementally add complexity while maintaining working software at each stage.
