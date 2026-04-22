# API Response Examples

Sample responses from the Andes Powder backend API.

## GET /api/resorts

List all resorts.

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Cerro Catedral",
    "slug": "cerro-catedral",
    "country": "Argentina",
    "region": "Patagonia",
    "latitude": -41.15,
    "longitude": -71.4,
    "timezone": "America/Argentina/Buenos_Aires",
    "baseElevation": 1030,
    "midElevation": 1600,
    "summitElevation": 2100,
    "createdAt": "2026-03-10T12:00:00.000Z",
    "updatedAt": "2026-03-10T12:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Cerro Chapelco",
    "slug": "cerro-chapelco",
    "country": "Argentina",
    "region": "Patagonia",
    "latitude": -40.1667,
    "longitude": -71.2833,
    "timezone": "America/Argentina/Buenos_Aires",
    "baseElevation": 1250,
    "midElevation": 1700,
    "summitElevation": 2200,
    "createdAt": "2026-03-10T12:00:00.000Z",
    "updatedAt": "2026-03-10T12:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Cerro Castor",
    "slug": "cerro-castor",
    "country": "Argentina",
    "region": "Tierra del Fuego",
    "latitude": -54.7833,
    "longitude": -68.1167,
    "timezone": "America/Argentina/Buenos_Aires",
    "baseElevation": 195,
    "midElevation": 600,
    "summitElevation": 1057,
    "createdAt": "2026-03-10T12:00:00.000Z",
    "updatedAt": "2026-03-10T12:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "name": "Las Leñas",
    "slug": "las-lenas",
    "country": "Argentina",
    "region": "Mendoza",
    "latitude": -35.15,
    "longitude": -70.0833,
    "timezone": "America/Argentina/Buenos_Aires",
    "baseElevation": 2240,
    "midElevation": 2900,
    "summitElevation": 3430,
    "createdAt": "2026-03-10T12:00:00.000Z",
    "updatedAt": "2026-03-10T12:00:00.000Z"
  }
]
```

## GET /api/resorts/cerro-catedral

Get single resort by slug or ID.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Cerro Catedral",
  "slug": "cerro-catedral",
  "country": "Argentina",
  "region": "Patagonia",
  "latitude": -41.15,
  "longitude": -71.4,
  "timezone": "America/Argentina/Buenos_Aires",
  "baseElevation": 1030,
  "midElevation": 1600,
  "summitElevation": 2100,
  "createdAt": "2026-03-10T12:00:00.000Z",
  "updatedAt": "2026-03-10T12:00:00.000Z"
}
```

## GET /api/resorts/cerro-catedral/forecast/current

Current conditions with best ski window and elevation-specific data.

```json
{
  "resort": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Cerro Catedral",
    "slug": "cerro-catedral"
  },
  "current": {
    "timestamp": "2026-07-15T14:00:00.000Z",
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
      "conditions": "Rain, Above freezing",
      "powderScore": 3.5
    },
    "mid": {
      "elevation": 1600,
      "temperature": -4,
      "conditions": "15cm fresh snow",
      "powderScore": 8.5
    },
    "summit": {
      "elevation": 2100,
      "temperature": -8,
      "conditions": "Moderate winds",
      "powderScore": 6.5
    }
  }
}
```

## GET /api/resorts/cerro-catedral/forecast/hourly?elevation=mid&hours=12

Hourly forecast for next 12 hours at mid-mountain.

```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "snapshot_id": "770e8400-e29b-41d4-a716-446655440000",
    "resort_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-07-15T14:00:00.000Z",
    "elevation_band": "mid",
    "temperature": -4.2,
    "feels_like": -8.5,
    "precipitation": 0.5,
    "precipitation_type": "snow",
    "snow_depth": 145,
    "wind_speed": 18,
    "wind_gust": 25,
    "wind_direction": 270,
    "cloud_cover": 65,
    "visibility": 8.5,
    "powder_score": 7.5,
    "created_at": "2026-07-15T12:00:00.000Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "snapshot_id": "770e8400-e29b-41d4-a716-446655440000",
    "resort_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-07-15T15:00:00.000Z",
    "elevation_band": "mid",
    "temperature": -3.8,
    "feels_like": -7.9,
    "precipitation": 0.3,
    "precipitation_type": "snow",
    "snow_depth": 145,
    "wind_speed": 16,
    "wind_gust": 22,
    "wind_direction": 265,
    "cloud_cover": 70,
    "visibility": 9.0,
    "powder_score": 7.2,
    "created_at": "2026-07-15T12:00:00.000Z"
  }
]
```

## GET /api/resorts/cerro-catedral/forecast/daily?elevation=mid&days=7

Daily forecast for next 7 days at mid-mountain.

```json
[
  {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "snapshot_id": "770e8400-e29b-41d4-a716-446655440000",
    "resort_id": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2026-07-15",
    "elevation_band": "mid",
    "temp_min": -8.5,
    "temp_max": -2.0,
    "snowfall_total": 15,
    "precipitation_total": 15,
    "wind_max": 35,
    "powder_score_avg": 7.2,
    "powder_score_max": 8.5,
    "best_window_start": "10:30",
    "best_window_end": "13:00",
    "best_window_reason": "Strong overnight freeze, best skiing before snow softens",
    "snow_line": 1400,
    "freeze_quality": "excellent",
    "recommended_zone": "mid",
    "conditions_summary": "15cm fresh powder mid-mountain. Perfect overnight freeze. Moderate winds on summit",
    "created_at": "2026-07-15T12:00:00.000Z"
  },
  {
    "id": "880e8400-e29b-41d4-a716-446655440001",
    "snapshot_id": "770e8400-e29b-41d4-a716-446655440000",
    "resort_id": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2026-07-16",
    "elevation_band": "mid",
    "temp_min": -6.0,
    "temp_max": -1.5,
    "snowfall_total": 8,
    "precipitation_total": 8,
    "wind_max": 28,
    "powder_score_avg": 6.5,
    "powder_score_max": 7.8,
    "best_window_start": "09:00",
    "best_window_end": "12:00",
    "best_window_reason": "Good overnight freeze, optimal conditions early",
    "snow_line": 1300,
    "freeze_quality": "good",
    "recommended_zone": "mid-summit",
    "conditions_summary": "8cm fresh powder mid-mountain. Good overnight freeze. Calm wind conditions",
    "created_at": "2026-07-15T12:00:00.000Z"
  },
  {
    "id": "880e8400-e29b-41d4-a716-446655440002",
    "snapshot_id": "770e8400-e29b-41d4-a716-446655440000",
    "resort_id": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2026-07-17",
    "elevation_band": "mid",
    "temp_min": -4.5,
    "temp_max": 0.5,
    "snowfall_total": 2,
    "precipitation_total": 2,
    "wind_max": 22,
    "powder_score_avg": 5.8,
    "powder_score_max": 6.5,
    "best_window_start": "08:30",
    "best_window_end": "11:00",
    "best_window_reason": "Best conditions during this period",
    "snow_line": 1200,
    "freeze_quality": "fair",
    "recommended_zone": "summit",
    "conditions_summary": "Standard ski conditions",
    "created_at": "2026-07-15T12:00:00.000Z"
  }
]
```

## Error Responses

### 404 - Resort Not Found

```json
{
  "error": "Resort not found"
}
```

### 404 - No Forecast Data

```json
{
  "error": "No forecast data available"
}
```

### 500 - Server Error

```json
{
  "error": "Failed to fetch resorts"
}
```

## Query Parameters

### Hourly Forecast

- `elevation`: `base` | `mid` | `summit` (default: `mid`)
- `hours`: Number of hours (default: `48`, max: `384`)

### Daily Forecast

- `elevation`: `base` | `mid` | `summit` (default: `mid`)
- `days`: Number of days (default: `15`, max: `16`)

## Response Field Descriptions

### Powder Score
- **0-2**: Very poor conditions
- **2-4**: Poor conditions
- **4-6**: Fair conditions
- **6-8**: Good conditions
- **8-9**: Excellent conditions
- **9-10**: Epic conditions

### Freeze Quality
- **excellent**: Perfect overnight freeze (-2°C to -6°C)
- **good**: Good freeze (-6°C to -10°C)
- **fair**: Marginal freeze (-10°C to -12°C)
- **poor**: Too cold (< -12°C)
- **none**: No freeze (> -2°C)

### Precipitation Type
- **snow**: Temperature < 0°C
- **mixed**: Temperature 0-2°C
- **rain**: Temperature > 2°C
- **none**: No precipitation

### Recommended Zone
- **base**: Best conditions at base elevation
- **mid**: Best conditions at mid-mountain
- **summit**: Best conditions at summit
- **mid-summit**: Good conditions across upper mountain
- **base-mid**: Good conditions across lower mountain
