# Andes Powder - Production Architecture Plan

## Executive Summary

This document outlines the evolution from current MVP to production-grade snow forecast system following meteorological best practices for Patagonia and Southern Andes.

**Current State**: Single-model, basic elevation forecasts
**Target State**: Multi-model ensemble system with resort-specific intelligence

---

## 1. Layered Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│                    (Web, Mobile, API)                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                       │
│              (Express REST + GraphQL future)                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Snow Engine  │  │ Confidence   │  │ Resort       │     │
│  │ Core         │  │ Scorer       │  │ Corrections  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Provider Abstraction Layer                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ ECMWF    │  │   GFS    │  │  GEFS    │  │  ERA5    │   │
│  │ Adapter  │  │ Adapter  │  │ Adapter  │  │ Adapter  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│         (via Open-Meteo or direct APIs)                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │ Redis Cache  │  │ TimescaleDB  │     │
│  │ (Domain)     │  │ (Forecasts)  │  │ (Time Series)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Enhanced Domain Model

### 2.1 Core Entities

```typescript
// Resort with full metadata
interface Resort {
  id: string;
  slug: string;
  name: string;
  country: 'AR' | 'CL';
  region: string;
  town: string;
  
  // Elevation bands (meters)
  baseElevation: number;
  midElevation: number;
  summitElevation: number;
  
  // Geographic
  latitude: number;
  longitude: number;
  timezone: string;
  
  // Terrain characteristics
  orientation?: 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW';
  exposureLevel?: 'low' | 'moderate' | 'high' | 'extreme';
  
  // Correction profile
  correctionProfileId: string;
  
  // Metadata
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Forecast Run tracking
interface ForecastRun {
  id: string;
  resortId: string;
  
  // Model metadata
  provider: 'open-meteo' | 'ecmwf-direct' | 'noaa';
  modelName: 'ecmwf-ifs' | 'gfs' | 'gefs' | 'era5';
  modelVersion?: string;
  
  // Timing
  issuedAt: Date;      // Model initialization time
  fetchedAt: Date;     // When we retrieved it
  validFrom: Date;     // Forecast start
  validTo: Date;       // Forecast end
  horizonHours: number;
  
  // Quality
  fetchStatus: 'success' | 'partial' | 'failed';
  dataQuality?: number; // 0-1 score
  
  // Metadata
  rawDataUrl?: string;
  processingNotes?: string;
}

// Elevation Band Forecast (normalized from all models)
interface ElevationForecast {
  id: string;
  forecastRunId: string;
  resortId: string;
  
  // Location context
  elevationBand: 'base' | 'mid' | 'summit';
  elevationMeters: number;
  
  // Time
  validTime: Date;
  forecastHour: number; // Hours from model init
  
  // Raw meteorological inputs
  temperatureC: number;
  apparentTempC?: number;
  dewPointC?: number;
  
  precipitationMm: number;
  snowfallCmRaw?: number; // From model if available
  
  windSpeedKmh: number;
  windGustKmh?: number;
  windDirection?: number;
  
  humidity: number;
  cloudCover: number;
  pressure?: number;
  
  // Derived atmospheric
  freezingLevelM?: number;
  snowLineM?: number;
  
  // Snow Engine outputs
  snowfallCmCorrected: number;
  phaseClassification: 'snow' | 'mixed' | 'rain' | 'sleet';
  snowQuality: 'powder' | 'compact' | 'wet' | 'heavy' | 'rain-affected';
  
  // Scores
  powderScore: number;      // 0-10
  skiabilityScore: number;  // 0-10
  windImpact: 'none' | 'low' | 'moderate' | 'high' | 'severe';
  
  // Metadata
  confidenceScore?: number; // Set by ensemble analysis
  dataSource: string;
}

// Resort Correction Profile
interface ResortCorrectionProfile {
  id: string;
  resortId: string;
  name: string;
  
  // Precipitation corrections
  precipitationBiasFactor: number; // Multiplier (e.g., 1.2 = 20% more)
  snowfallBiasFactor: number;
  
  // Temperature/phase corrections
  snowLineOffsetM: number;          // Adjust snow line up/down
  warmEventPenalty: number;         // Reduce scores in marginal temps
  freezingLevelBiasM: number;
  
  // Wind corrections
  windPenaltyProfile: {
    moderate: number;    // km/h threshold
    high: number;
    severe: number;
    summitMultiplier: number;
  };
  
  // Accumulation patterns
  baseAccumulationFactor: number;
  midAccumulationFactor: number;
  summitAccumulationFactor: number;
  
  // Operational
  liftClosureWindThreshold: number;
  
  // Notes
  calibrationNotes: string;
  lastUpdated: Date;
  validFrom: Date;
  validTo?: Date;
}

// Model Agreement & Confidence
interface ModelAgreement {
  id: string;
  resortId: string;
  validTime: Date;
  elevationBand: 'base' | 'mid' | 'summit';
  
  // Model outputs being compared
  ecmwfSnowfallCm?: number;
  gfsSnowfallCm?: number;
  
  ecmwfFreezingLevelM?: number;
  gfsFreezingLevelM?: number;
  
  // Ensemble spread (from GEFS)
  gefsSnowfallMean?: number;
  gefsSnowfallStdDev?: number;
  gefsSnowfallMin?: number;
  gefsSnowfallMax?: number;
  
  // Agreement metrics
  snowfallAgreement: number;      // 0-1
  freezingLevelAgreement: number; // 0-1
  overallAgreement: number;       // 0-1
  
  // Derived confidence
  confidenceScore: number; // 0-10
  confidenceReason: string;
}

// Observation (future-ready)
interface Observation {
  id: string;
  resortId: string;
  observedAt: Date;
  
  observationType: 'snowfall' | 'temperature' | 'wind' | 'condition' | 'webcam' | 'manual';
  source: 'resort-report' | 'weather-station' | 'webcam' | 'user-report' | 'automated';
  
  // Flexible value storage
  value: number | string;
  unit: string;
  elevationBand?: 'base' | 'mid' | 'summit';
  
  // Quality
  reliability: 'high' | 'medium' | 'low';
  verified: boolean;
  
  // Metadata
  metadata: Record<string, any>;
  notes?: string;
}
```

---

## 3. Provider Abstraction Layer

### 3.1 Provider Interface

```typescript
interface ForecastProvider {
  name: string;
  models: string[];
  
  // Fetch raw forecast data
  fetchForecast(
    resort: Resort,
    timeRange: { start: Date; end: Date },
    options?: FetchOptions
  ): Promise<RawForecastData>;
  
  // Normalize to internal format
  normalizeForecast(
    raw: RawForecastData,
    resort: Resort
  ): Promise<NormalizedForecast>;
  
  // Provider metadata
  getModelMetadata(): ModelMetadata;
  
  // Health check
  checkAvailability(): Promise<boolean>;
}

interface NormalizedForecast {
  provider: string;
  model: string;
  issuedAt: Date;
  
  // Normalized time series per elevation
  base: TimeSeriesPoint[];
  mid: TimeSeriesPoint[];
  summit: TimeSeriesPoint[];
  
  // Atmospheric profiles
  freezingLevels: Array<{ time: Date; heightM: number }>;
  
  metadata: {
    resolution: string;
    updateFrequency: string;
    horizon: string;
  };
}

interface TimeSeriesPoint {
  time: Date;
  temperature: number;
  precipitation: number;
  snowfall?: number;
  windSpeed: number;
  windGust?: number;
  humidity: number;
  cloudCover: number;
  pressure?: number;
}
```

### 3.2 Provider Implementations

```typescript
// Open-Meteo Provider (current MVP, enhanced)
class OpenMeteoProvider implements ForecastProvider {
  name = 'open-meteo';
  models = ['ecmwf-ifs', 'gfs', 'gefs'];
  
  async fetchForecast(resort, timeRange, options) {
    // Fetch from Open-Meteo API
    // Support multiple models in parallel
  }
  
  async normalizeForecast(raw, resort) {
    // Convert Open-Meteo format to internal format
    // Handle elevation interpolation
  }
}

// Future: Direct ECMWF Provider
class ECMWFProvider implements ForecastProvider {
  name = 'ecmwf-direct';
  models = ['ifs', 'ens'];
  // Implementation when we have direct access
}

// Future: NOAA Provider
class NOAAProvider implements ForecastProvider {
  name = 'noaa';
  models = ['gfs', 'gefs'];
  // Implementation for GFS/GEFS direct access
}
```

---

## 4. Snow Engine Architecture

### 4.1 Core Snow Engine

```typescript
class SnowEngine {
  constructor(
    private providers: ForecastProvider[],
    private correctionService: ResortCorrectionService,
    private confidenceService: ConfidenceService
  ) {}
  
  async processResortForecast(resort: Resort): Promise<ProcessedForecast> {
    // 1. Fetch from all providers
    const rawForecasts = await this.fetchAllModels(resort);
    
    // 2. Normalize to common format
    const normalized = await this.normalizeForecasts(rawForecasts, resort);
    
    // 3. Apply snow/rain phase logic
    const phaseClassified = this.classifyPrecipitationPhase(normalized, resort);
    
    // 4. Calculate snow accumulation
    const snowAccumulation = this.calculateSnowfall(phaseClassified, resort);
    
    // 5. Apply resort-specific corrections
    const corrected = await this.correctionService.apply(snowAccumulation, resort);
    
    // 6. Calculate confidence from model agreement
    const withConfidence = await this.confidenceService.score(corrected, normalized);
    
    // 7. Calculate derived scores
    const scored = this.calculateScores(withConfidence, resort);
    
    // 8. Identify best windows
    const withWindows = this.identifyBestWindows(scored);
    
    return withWindows;
  }
}
```

### 4.2 Phase Classification Logic

```typescript
class PhaseClassifier {
  classifyPrecipitation(
    temp: number,
    freezingLevel: number,
    elevation: number,
    precipMm: number
  ): PhaseResult {
    const margin = 200; // meters uncertainty band
    
    if (freezingLevel < elevation - margin) {
      return { phase: 'snow', confidence: 'high', snowRatio: 1.0 };
    }
    
    if (freezingLevel > elevation + margin) {
      if (temp > 2) {
        return { phase: 'rain', confidence: 'high', snowRatio: 0.0 };
      }
      return { phase: 'mixed', confidence: 'medium', snowRatio: 0.3 };
    }
    
    // In uncertainty band
    const snowRatio = this.calculateTransitionRatio(freezingLevel, elevation, margin);
    return { phase: 'mixed', confidence: 'low', snowRatio };
  }
  
  estimateSnowLine(
    freezingLevel: number,
    temperature: number,
    humidity: number
  ): number {
    // Snow line typically 200-400m below freezing level
    // Adjust based on humidity and temperature gradient
    const baseOffset = 300;
    const humidityAdjust = (humidity - 70) * 2; // Drier = higher snow line
    const tempAdjust = temperature > 0 ? temperature * 50 : 0;
    
    return freezingLevel - baseOffset + humidityAdjust + tempAdjust;
  }
}
```

### 4.3 Confidence Scoring

```typescript
class ConfidenceService {
  async calculateConfidence(
    forecasts: NormalizedForecast[],
    timePoint: Date,
    elevationBand: string
  ): Promise<ConfidenceScore> {
    // Extract values from different models
    const ecmwf = this.extractValue(forecasts, 'ecmwf-ifs', timePoint, elevationBand);
    const gfs = this.extractValue(forecasts, 'gfs', timePoint, elevationBand);
    const gefs = this.extractEnsemble(forecasts, 'gefs', timePoint, elevationBand);
    
    // Calculate agreement
    const snowfallAgreement = this.calculateAgreement(
      ecmwf.snowfall,
      gfs.snowfall,
      gefs.snowfallStdDev
    );
    
    const freezingLevelAgreement = this.calculateAgreement(
      ecmwf.freezingLevel,
      gfs.freezingLevel,
      gefs.freezingLevelStdDev
    );
    
    // Ensemble spread penalty
    const spreadPenalty = gefs.snowfallStdDev / gefs.snowfallMean;
    
    // Time horizon penalty
    const hoursOut = (timePoint.getTime() - Date.now()) / (1000 * 60 * 60);
    const horizonPenalty = Math.min(hoursOut / 168, 1); // Max penalty at 7 days
    
    // Combined confidence
    const baseConfidence = (snowfallAgreement + freezingLevelAgreement) / 2;
    const adjusted = baseConfidence * (1 - spreadPenalty * 0.3) * (1 - horizonPenalty * 0.2);
    
    return {
      score: Math.max(0, Math.min(10, adjusted * 10)),
      agreement: baseConfidence,
      spread: spreadPenalty,
      horizon: horizonPenalty,
      reason: this.generateReason(baseConfidence, spreadPenalty, horizonPenalty)
    };
  }
}
```

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create new domain models
- [ ] Build provider abstraction interfaces
- [ ] Refactor current Open-Meteo code into adapter pattern
- [ ] Create SnowEngine skeleton
- [ ] Add ForecastRun tracking
- [ ] Database migrations for new schema

### Phase 2: Multi-Model Support (Week 3-4)
- [ ] Add GFS support via Open-Meteo
- [ ] Add GEFS ensemble support
- [ ] Implement model agreement calculation
- [ ] Build confidence scoring v1
- [ ] Add model metadata tracking

### Phase 3: Snow Intelligence (Week 5-6)
- [ ] Implement phase classification logic
- [ ] Build snow line estimation
- [ ] Add snow quality classification
- [ ] Implement wind impact scoring
- [ ] Create skiability score

### Phase 4: Resort Corrections (Week 7-8)
- [ ] Create ResortCorrectionProfile schema
- [ ] Build correction application logic
- [ ] Calibrate profiles for 3 main resorts
- [ ] Add correction admin interface
- [ ] Document calibration methodology

### Phase 5: Observation Layer (Week 9-10)
- [ ] Create Observation schema
- [ ] Build observation ingestion API
- [ ] Add manual observation entry
- [ ] Create validation comparison logic
- [ ] Build bias detection system

### Phase 6: Advanced Features (Week 11-12)
- [ ] Add ERA5 historical calibration
- [ ] Implement forecast verification
- [ ] Build automated bias correction
- [ ] Add uncertainty visualization
- [ ] Create model performance dashboard

---

## 6. Data Flow Example

```
1. Cron Job triggers forecast update for Cerro Catedral

2. SnowEngine.processResortForecast(catedral)
   ↓
3. Fetch from providers in parallel:
   - OpenMeteoProvider.fetchForecast() → ECMWF data
   - OpenMeteoProvider.fetchForecast() → GFS data
   - OpenMeteoProvider.fetchForecast() → GEFS ensemble
   ↓
4. Normalize all to common format
   ↓
5. PhaseClassifier.classifyPrecipitation()
   - Calculate freezing level
   - Estimate snow line
   - Classify snow/rain/mixed
   ↓
6. SnowAccumulationCalculator.calculate()
   - Apply snow ratios
   - Calculate 24h/72h/7d totals
   ↓
7. ResortCorrectionService.apply()
   - Load correction profile
   - Apply precipitation bias
   - Apply snow line offset
   - Apply wind penalties
   ↓
8. ConfidenceService.score()
   - Compare ECMWF vs GFS
   - Analyze GEFS spread
   - Calculate agreement metrics
   - Assign confidence scores
   ↓
9. ScoreCalculator.calculate()
   - Powder score
   - Skiability score
   - Wind impact
   ↓
10. BestWindowIdentifier.identify()
    - Find optimal skiing windows
    ↓
11. Save to database:
    - ForecastRun record
    - ElevationForecast records (base/mid/summit)
    - ModelAgreement records
    ↓
12. Cache in Redis for fast API access
    ↓
13. API serves to clients
```

---

## 7. API Endpoints (Enhanced)

```
GET /api/resorts
GET /api/resorts/:slug

GET /api/resorts/:slug/forecast/current
  → Returns current conditions with confidence

GET /api/resorts/:slug/forecast/hourly
  ?elevation=base|mid|summit
  ?hours=48
  → Returns hourly forecast with confidence bands

GET /api/resorts/:slug/forecast/daily
  ?elevation=base|mid|summit
  ?days=15
  → Returns daily summary with model agreement

GET /api/resorts/:slug/forecast/models
  → Returns comparison of ECMWF vs GFS vs GEFS

GET /api/resorts/:slug/forecast/confidence
  → Returns confidence analysis and uncertainty

GET /api/resorts/:slug/observations
  → Returns recent observations for validation

POST /api/observations
  → Submit manual observation

GET /api/resorts/:slug/correction-profile
  → Returns resort correction parameters (admin)
```

---

## 8. Database Schema Changes

```sql
-- New tables needed

CREATE TABLE forecast_runs (
  id UUID PRIMARY KEY,
  resort_id UUID REFERENCES resorts(id),
  provider VARCHAR(50),
  model_name VARCHAR(50),
  model_version VARCHAR(20),
  issued_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  horizon_hours INTEGER,
  fetch_status VARCHAR(20),
  data_quality DECIMAL(3,2),
  raw_data_url TEXT,
  processing_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE elevation_forecasts (
  id UUID PRIMARY KEY,
  forecast_run_id UUID REFERENCES forecast_runs(id),
  resort_id UUID REFERENCES resorts(id),
  elevation_band VARCHAR(10),
  elevation_meters INTEGER,
  valid_time TIMESTAMPTZ,
  forecast_hour INTEGER,
  
  -- Raw inputs
  temperature_c DECIMAL(5,2),
  apparent_temp_c DECIMAL(5,2),
  precipitation_mm DECIMAL(7,2),
  snowfall_cm_raw DECIMAL(7,2),
  wind_speed_kmh DECIMAL(6,2),
  wind_gust_kmh DECIMAL(6,2),
  humidity INTEGER,
  cloud_cover INTEGER,
  
  -- Derived
  freezing_level_m INTEGER,
  snow_line_m INTEGER,
  snowfall_cm_corrected DECIMAL(7,2),
  phase_classification VARCHAR(20),
  snow_quality VARCHAR(20),
  
  -- Scores
  powder_score DECIMAL(3,1),
  skiability_score DECIMAL(3,1),
  wind_impact VARCHAR(20),
  confidence_score DECIMAL(3,1),
  
  data_source VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE model_agreements (
  id UUID PRIMARY KEY,
  resort_id UUID REFERENCES resorts(id),
  valid_time TIMESTAMPTZ,
  elevation_band VARCHAR(10),
  
  ecmwf_snowfall_cm DECIMAL(7,2),
  gfs_snowfall_cm DECIMAL(7,2),
  ecmwf_freezing_level_m INTEGER,
  gfs_freezing_level_m INTEGER,
  
  gefs_snowfall_mean DECIMAL(7,2),
  gefs_snowfall_stddev DECIMAL(7,2),
  gefs_snowfall_min DECIMAL(7,2),
  gefs_snowfall_max DECIMAL(7,2),
  
  snowfall_agreement DECIMAL(3,2),
  freezing_level_agreement DECIMAL(3,2),
  overall_agreement DECIMAL(3,2),
  
  confidence_score DECIMAL(3,1),
  confidence_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resort_correction_profiles (
  id UUID PRIMARY KEY,
  resort_id UUID REFERENCES resorts(id),
  name VARCHAR(100),
  
  precipitation_bias_factor DECIMAL(4,2),
  snowfall_bias_factor DECIMAL(4,2),
  snow_line_offset_m INTEGER,
  warm_event_penalty DECIMAL(3,2),
  freezing_level_bias_m INTEGER,
  
  wind_moderate_threshold INTEGER,
  wind_high_threshold INTEGER,
  wind_severe_threshold INTEGER,
  wind_summit_multiplier DECIMAL(3,2),
  
  base_accumulation_factor DECIMAL(4,2),
  mid_accumulation_factor DECIMAL(4,2),
  summit_accumulation_factor DECIMAL(4,2),
  
  lift_closure_wind_threshold INTEGER,
  
  calibration_notes TEXT,
  last_updated TIMESTAMPTZ,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE observations (
  id UUID PRIMARY KEY,
  resort_id UUID REFERENCES resorts(id),
  observed_at TIMESTAMPTZ,
  observation_type VARCHAR(50),
  source VARCHAR(50),
  value_numeric DECIMAL(10,2),
  value_text TEXT,
  unit VARCHAR(20),
  elevation_band VARCHAR(10),
  reliability VARCHAR(20),
  verified BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_forecast_runs_resort ON forecast_runs(resort_id, issued_at DESC);
CREATE INDEX idx_elevation_forecasts_run ON elevation_forecasts(forecast_run_id);
CREATE INDEX idx_elevation_forecasts_time ON elevation_forecasts(resort_id, valid_time);
CREATE INDEX idx_model_agreements_time ON model_agreements(resort_id, valid_time);
CREATE INDEX idx_observations_resort ON observations(resort_id, observed_at DESC);
```

---

## 9. Next Steps

### Immediate Actions:
1. Review this architecture with team
2. Decide on Phase 1 timeline
3. Create feature branches for refactoring
4. Set up new database schema in dev
5. Begin provider abstraction implementation

### Questions to Resolve:
1. Budget for direct ECMWF API access?
2. Timeline for ERA5 historical data integration?
3. Priority: Multi-model or resort corrections first?
4. Observation ingestion: Manual only or automated?
5. Redis caching strategy details?

---

**Document Status**: Draft for Review
**Last Updated**: 2026-03-10
**Next Review**: After Phase 1 completion
