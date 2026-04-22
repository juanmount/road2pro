# Technical Architecture

## System Overview

```
┌─────────────────┐
│  iPhone App     │
│  (React Native) │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  Backend API    │
│  (Node.js)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│  PostgreSQL     │◄─────│  Cron Job    │
│  Database       │      │  (3 hours)   │
└─────────────────┘      └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │  Open-Meteo  │
                         │  API         │
                         └──────────────┘
```

## Backend Components

### 1. API Server
**Purpose**: Serve processed forecast data to mobile app

**Endpoints**:
- `GET /api/resorts` - List all resorts
- `GET /api/resorts/:id` - Resort details
- `GET /api/resorts/:id/forecast/hourly` - Hourly forecast (48h)
- `GET /api/resorts/:id/forecast/daily` - Daily forecast (15 days)
- `GET /api/resorts/:id/forecast/current` - Current conditions + best window

**Tech Stack**:
- Express.js
- TypeScript
- PostgreSQL client (pg)

### 2. Forecast Service
**Purpose**: Fetch and process weather data every 3 hours

**Responsibilities**:
- Call Open-Meteo API for each resort
- Transform weather data into ski conditions
- Calculate Powder Score
- Determine best ski windows
- Analyze snow line, freeze quality, wind impact
- Store processed data in database

**Cron Schedule**: Every 3 hours (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC)

### 3. Powder Score Engine
**Purpose**: Calculate ski condition quality (0-10)

**Inputs**:
- Fresh snowfall (24h, 48h)
- Temperature profile
- Overnight freeze quality
- Wind speed/gusts
- Snow line elevation
- Precipitation type

**Logic**:
```
Base Score = 0

+ Snowfall (0-4 points)
  - 0-5cm: 0 pts
  - 5-10cm: 1 pt
  - 10-20cm: 2 pts
  - 20-30cm: 3 pts
  - 30+cm: 4 pts

+ Overnight Freeze (0-2 points)
  - Perfect freeze (-2°C to -6°C): 2 pts
  - Good freeze (-6°C to -10°C): 1 pt
  - Marginal: 0.5 pts
  - None: 0 pts

+ Temperature (0-2 points)
  - Optimal ski temp (-2°C to -8°C): 2 pts
  - Good (-8°C to -12°C): 1.5 pts
  - Acceptable: 1 pt
  - Too warm/cold: 0 pts

+ Wind Impact (0-2 points)
  - Calm (<15 km/h): 2 pts
  - Light (15-25 km/h): 1.5 pts
  - Moderate (25-40 km/h): 1 pt
  - Strong (40+ km/h): 0 pts

Total: 0-10 scale
```

### 4. Best Window Calculator
**Purpose**: Identify optimal skiing hours

**Factors**:
- Sun exposure timing
- Temperature evolution
- Wind patterns
- Snow quality transitions
- Freeze timing

**Output**:
```json
{
  "bestWindow": {
    "start": "10:30",
    "end": "13:00",
    "reason": "Strong overnight freeze, best skiing before snow softens"
  }
}
```

## Database Schema

### Resorts Table
```sql
resorts
- id (uuid, primary key)
- name (text)
- slug (text, unique)
- country (text)
- region (text)
- latitude (decimal)
- longitude (decimal)
- timezone (text)
- base_elevation (integer) -- meters
- mid_elevation (integer)
- summit_elevation (integer)
- created_at (timestamp)
- updated_at (timestamp)
```

### Forecast Snapshots Table
```sql
forecast_snapshots
- id (uuid, primary key)
- resort_id (uuid, foreign key)
- fetched_at (timestamp)
- source (text) -- 'open-meteo'
- valid_from (timestamp)
- valid_until (timestamp)
- created_at (timestamp)
```

### Hourly Forecast Table
```sql
hourly_forecasts
- id (uuid, primary key)
- snapshot_id (uuid, foreign key)
- resort_id (uuid, foreign key)
- timestamp (timestamp)
- elevation_band (text) -- 'base', 'mid', 'summit'
- temperature (decimal)
- feels_like (decimal)
- precipitation (decimal) -- mm
- precipitation_type (text) -- 'snow', 'rain', 'mixed', 'none'
- snow_depth (decimal) -- cm
- wind_speed (decimal) -- km/h
- wind_gust (decimal)
- wind_direction (integer) -- degrees
- cloud_cover (integer) -- percentage
- visibility (decimal) -- km
- powder_score (decimal) -- 0-10
- created_at (timestamp)
```

### Daily Forecast Table
```sql
daily_forecasts
- id (uuid, primary key)
- snapshot_id (uuid, foreign key)
- resort_id (uuid, foreign key)
- date (date)
- elevation_band (text)
- temp_min (decimal)
- temp_max (decimal)
- snowfall_total (decimal) -- cm
- precipitation_total (decimal) -- mm
- wind_max (decimal)
- powder_score_avg (decimal)
- powder_score_max (decimal)
- best_window_start (time)
- best_window_end (time)
- best_window_reason (text)
- snow_line (integer) -- meters
- freeze_quality (text) -- 'excellent', 'good', 'fair', 'poor', 'none'
- recommended_zone (text) -- 'base', 'mid', 'summit', 'mid-upper', etc.
- conditions_summary (text) -- "Base rainy, better above 1500m"
- created_at (timestamp)
```

## Mobile App Structure

### Navigation
```
App Root (Expo Router)
├── (tabs)
│   ├── index.tsx          # Home / Resort List
│   └── settings.tsx       # Settings
├── resort/[id].tsx        # Resort Detail
├── resort/[id]/hourly.tsx # Hourly Forecast
└── resort/[id]/daily.tsx  # Daily Forecast
```

### Key Screens

**1. Home / Resort List**
- List of 4 MVP resorts
- Current powder score for each
- Quick conditions summary
- Tap to view resort detail

**2. Resort Detail**
- Current conditions
- Today's powder score
- Best ski window
- Quick hourly preview (next 12h)
- Elevation band selector
- Navigation to hourly/daily views

**3. Hourly Forecast**
- 48-hour hourly view
- Scrollable timeline
- Powder score per hour
- Temp, snow, wind
- Elevation band tabs

**4. Daily Forecast**
- 15-day extended forecast
- Daily powder scores
- Snowfall totals
- Best windows
- Conditions summaries

### Design Direction
- **Clean**: Minimal UI, focus on data
- **Premium but practical**: Polished but not over-designed
- **Skier-focused**: Language and metrics for skiers
- **Easy to scan**: 3-second readability
- **Not overloaded**: Show what matters

### Color Palette
- Primary: Deep blue (#1a365d)
- Accent: Powder blue (#63b3ed)
- Snow: White (#ffffff)
- Ice: Light blue (#e6f7ff)
- Warning: Orange (#ed8936)
- Success: Green (#48bb78)
- Text: Dark gray (#2d3748)

## API Response Examples

### Current Conditions
```json
{
  "resort": {
    "id": "uuid",
    "name": "Cerro Catedral",
    "slug": "cerro-catedral"
  },
  "current": {
    "timestamp": "2026-07-15T14:00:00Z",
    "powderScore": 7.5,
    "bestWindow": {
      "start": "10:30",
      "end": "13:00",
      "reason": "Strong overnight freeze, best skiing before snow softens"
    },
    "snowLine": 1400,
    "freezeQuality": "excellent",
    "recommendedZone": "mid-mountain",
    "summary": "Excellent conditions mid-mountain, avoid base (rain last night)"
  },
  "byElevation": {
    "base": {
      "elevation": 1030,
      "temperature": 2,
      "conditions": "Rainy overnight, slushy snow",
      "powderScore": 3.5
    },
    "mid": {
      "elevation": 1600,
      "temperature": -4,
      "conditions": "Perfect freeze, 15cm fresh powder",
      "powderScore": 8.5
    },
    "summit": {
      "elevation": 2100,
      "temperature": -8,
      "conditions": "Windy, good snow quality",
      "powderScore": 6.5
    }
  }
}
```

## Deployment Strategy

### Backend
- **Hosting**: Railway / Render / Fly.io
- **Database**: Managed PostgreSQL
- **Cron**: Built-in cron or separate worker dyno
- **Environment**: Production + Staging

### Mobile
- **Distribution**: TestFlight → App Store
- **Updates**: OTA updates via Expo
- **Analytics**: Simple usage tracking

## Future Enhancements
- Push notifications for powder alerts
- Historical data analysis
- Webcam integration
- User favorites
- Offline mode
- Multi-language (Spanish/English)
