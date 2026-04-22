# Andes Powder Backend

Node.js + TypeScript backend for the Andes Powder snow intelligence app.

## Features

- REST API for resort and forecast data
- Automated forecast fetching every 3 hours via cron
- Open-Meteo API integration
- Powder Score calculation engine
- Best ski window determination
- PostgreSQL data storage

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
npm install
```

### Database Setup

1. Create a PostgreSQL database:
```bash
createdb andes_powder
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Run migrations:
```bash
npm run db:migrate
```

This will:
- Create all necessary tables
- Insert the 4 MVP resorts (Catedral, Chapelco, Castor, Las Leñas)

### Running

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

### Manual Forecast Update

To manually fetch and process forecasts for all resorts:

```bash
npm run cron:forecast
```

## API Endpoints

### Resorts

**GET /api/resorts**
- Returns all resorts

**GET /api/resorts/:id**
- Get resort by ID or slug
- Example: `/api/resorts/cerro-catedral`

**GET /api/resorts/:id/forecast/current**
- Current conditions and today's forecast
- Returns powder score, best window, elevation-specific data

**GET /api/resorts/:id/forecast/hourly**
- Hourly forecast (default: 48 hours)
- Query params: `elevation` (base|mid|summit), `hours`
- Example: `/api/resorts/cerro-catedral/forecast/hourly?elevation=mid&hours=24`

**GET /api/resorts/:id/forecast/daily**
- Daily forecast (default: 15 days)
- Query params: `elevation` (base|mid|summit), `days`
- Example: `/api/resorts/cerro-catedral/forecast/daily?elevation=summit&days=7`

## Architecture

### Services

**open-meteo.ts**
- Fetches weather data from Open-Meteo API
- Handles multi-elevation requests

**powder-score.ts**
- Calculates powder score (0-10) based on:
  - Snowfall (24h and 48h)
  - Temperature
  - Overnight freeze quality
  - Wind conditions
- Determines precipitation type
- Generates conditions summaries

**best-window.ts**
- Analyzes hourly forecasts
- Identifies optimal skiing windows
- Generates human-readable reasons

**forecast-processor.ts**
- Orchestrates forecast fetching and processing
- Stores data in PostgreSQL
- Processes all elevation bands

**forecast-cron.ts**
- Runs every 3 hours
- Updates forecasts for all resorts
- Can be run manually

### Database Schema

**resorts**
- Resort metadata and elevation data

**forecast_snapshots**
- Tracks when forecasts were fetched

**hourly_forecasts**
- Hourly weather data by elevation band
- Includes calculated powder scores

**daily_forecasts**
- Daily aggregated forecasts
- Best windows, freeze quality, summaries

## Powder Score Logic

Base score starts at 0, maximum 10:

- **Snowfall** (0-4 pts): Fresh snow in last 24-48h
- **Freeze Quality** (0-2 pts): Overnight temperature for snow consolidation
- **Temperature** (0-2 pts): Optimal skiing temperature range
- **Wind** (0-2 pts): Impact on lift operations and snow quality

Penalties:
- Rain: 70% reduction
- Mixed precipitation: 40% reduction

## Environment Variables

```
NODE_ENV=development|production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/andes_powder
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1
FORECAST_CRON_SCHEDULE=0 */3 * * *
```

## Deployment

Recommended platforms:
- Railway
- Render
- Fly.io

All support:
- PostgreSQL managed databases
- Cron jobs or worker processes
- Environment variable management

## Development

**Watch mode:**
```bash
npm run dev
```

**Type checking:**
```bash
npx tsc --noEmit
```

**Linting:**
```bash
npm run lint
```
# Force rebuild Wed Apr 22 19:12:46 -03 2026
