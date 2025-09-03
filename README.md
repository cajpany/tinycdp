# TinyCDP - Real-time Traits & Segments Engine

TinyCDP is an open-source, real-time traits & segments engine - a lightweight replacement for Segment Personas / Amplitude Audiences. Apps send events and identities; TinyCDP computes user traits (e.g., "power_user", "recent_buyer"), evaluates segments from those traits, and exposes a low-latency Decisions API for instant feature flagging.

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

4. Seed the database with sample data:
   ```bash
   npx tsx scripts/seed.ts
   ```

5. Start the development server:
   ```bash
   encore run
   ```

The API will be available at `http://localhost:4000`

## Project Structure

```
/backend/
├── shared/           # Shared database, types, and utilities
├── ingest/          # Event ingestion service
├── identity/        # User and identity management
├── traits/          # Trait computation engine
├── segments/        # Segment evaluation
├── decide/          # Low-latency decision API
├── admin/           # Admin operations
└── export/          # Data export functionality
```

## Services

### Health Checks

All services provide health check endpoints:

- `GET /ingest/health`
- `GET /identity/health`
- `GET /traits/health`
- `GET /segments/health`
- `GET /decide/health`
- `GET /admin/health`
- `GET /export/health`

## Testing

Run the test suite:

```bash
npm test
```

## Development Phases

This project is built in phases:

- **Phase 1**: Foundation & Core Infrastructure ✅
- **Phase 2**: Identity & Event Ingestion
- **Phase 3**: Traits Engine
- **Phase 4**: Segments & Decision Engine
- **Phase 5**: Admin API & Management
- **Phase 6**: TypeScript SDK
- **Phase 7**: Web Console

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for detailed development roadmap.

## License

MIT License - see LICENSE file for details.
