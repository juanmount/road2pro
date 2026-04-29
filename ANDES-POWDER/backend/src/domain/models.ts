/**
 * Domain Models for Andes Powder Production Architecture
 * Following meteorological best practices for multi-model forecasting
 */

export type ElevationBand = 'base' | 'mid' | 'summit';
export type Country = 'AR' | 'CL';
export type Orientation = 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW';
export type ExposureLevel = 'low' | 'moderate' | 'high' | 'extreme';
export type PrecipitationPhase = 'snow' | 'mixed' | 'rain' | 'sleet' | 'none';
export type SnowQuality = 'powder' | 'compact' | 'wet' | 'heavy' | 'rain-affected';
export type WindImpact = 'none' | 'low' | 'moderate' | 'high' | 'severe';
export type FetchStatus = 'success' | 'partial' | 'failed';
export type ModelName = 'ecmwf-ifs' | 'gfs' | 'gefs' | 'era5';
export type ProviderName = 'open-meteo' | 'ecmwf-direct' | 'noaa';
export type ObservationType = 'snowfall' | 'temperature' | 'wind' | 'condition' | 'webcam' | 'manual';
export type ObservationSource = 'resort-report' | 'weather-station' | 'webcam' | 'user-report' | 'automated';
export type Reliability = 'high' | 'medium' | 'low';

/**
 * Resort with full metadata and terrain characteristics
 */
export interface Resort {
  id: string;
  slug: string;
  name: string;
  country: Country;
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
  orientation?: Orientation;
  exposureLevel?: ExposureLevel;
  
  // Correction profile
  correctionProfileId?: string;
  
  // Metadata
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Forecast Run tracking for model provenance
 */
export interface ForecastRun {
  id: string;
  resortId: string;
  
  // Model metadata
  provider: ProviderName;
  modelName: ModelName;
  modelVersion?: string;
  
  // Timing
  issuedAt: Date;      // Model initialization time
  fetchedAt: Date;     // When we retrieved it
  validFrom: Date;     // Forecast start
  validTo: Date;       // Forecast end
  horizonHours: number;
  
  // Quality
  fetchStatus: FetchStatus;
  dataQuality?: number; // 0-1 score
  
  // Metadata
  rawDataUrl?: string;
  processingNotes?: string;
  
  createdAt: Date;
}

/**
 * Elevation Band Forecast - normalized from all models
 */
export interface ElevationForecast {
  id: string;
  forecastRunId: string;
  resortId: string;
  
  // Location context
  elevationBand: ElevationBand;
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
  cloudCoverLow?: number;
  cloudCoverMid?: number;
  cloudCoverHigh?: number;
  pressure?: number;
  
  // Derived atmospheric
  freezingLevelM?: number;
  snowLineM?: number;
  
  // Visibility
  visibility?: 'excellent' | 'good' | 'moderate' | 'poor' | 'whiteout';
  visibilityMeters?: number;
  inCloud?: boolean;
  cloudBaseMeters?: number;
  
  // Snow Engine outputs
  snowfallCmCorrected: number;
  phaseClassification: PrecipitationPhase;
  snowQuality: SnowQuality;
  
  // Scores
  powderScore: number;      // 0-10
  skiabilityScore: number;  // 0-10
  windImpact: WindImpact;
  
  // Metadata
  confidenceScore?: number; // Set by ensemble analysis
  dataSource: string;
  
  createdAt: Date;
}

/**
 * Resort Correction Profile for local calibration
 */
export interface ResortCorrectionProfile {
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

/**
 * Model Agreement & Confidence metrics
 */
export interface ModelAgreement {
  id: string;
  resortId: string;
  validTime: Date;
  elevationBand: ElevationBand;
  
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
  
  createdAt: Date;
}

/**
 * Observation for validation and calibration
 */
export interface Observation {
  id: string;
  resortId: string;
  observedAt: Date;
  
  observationType: ObservationType;
  source: ObservationSource;
  
  // Flexible value storage
  valueNumeric?: number;
  valueText?: string;
  unit: string;
  elevationBand?: ElevationBand;
  
  // Quality
  reliability: Reliability;
  verified: boolean;
  
  // Metadata
  metadata?: Record<string, any>;
  notes?: string;
  
  createdAt: Date;
}

/**
 * Time series point for normalized forecasts
 */
export interface TimeSeriesPoint {
  time: Date;
  temperature: number;
  precipitation: number;
  snowfall?: number;
  windSpeed: number;
  windGust?: number;
  windDirection?: number;
  humidity: number;
  cloudCover: number;
  cloudCoverLow?: number;
  cloudCoverMid?: number;
  cloudCoverHigh?: number;
  pressure?: number;
  freezingLevel?: number;
}

/**
 * Normalized forecast from any provider
 */
export interface NormalizedForecast {
  provider: ProviderName;
  model: ModelName;
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

/**
 * Phase classification result
 */
export interface PhaseResult {
  phase: PrecipitationPhase;
  confidence: 'high' | 'medium' | 'low';
  snowRatio: number; // 0-1
}

/**
 * Confidence score with reasoning
 */
export interface ConfidenceScore {
  score: number; // 0-10
  agreement: number; // 0-1
  spread: number; // 0-1
  horizon: number; // 0-1
  reason: string;
}

/**
 * Best skiing window
 */
export interface BestWindow {
  start: string; // HH:mm format
  end: string;
  reason: string;
  score: number;
}

/**
 * Storm Crossing Probability Category
 */
export type CrossingCategory = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Storm Crossing Probability Score
 */
export interface StormCrossingProbability {
  score: number;                    // 0-100
  category: CrossingCategory;       // LOW | MEDIUM | HIGH
  explanation: string;              // Human-readable explanation
  
  // Component scores for transparency
  components: {
    modelAgreement: number;         // 0-100
    ensembleSpread: number;         // 0-100
    precipitationPersistence: number; // 0-100
    freezingLevelSuitability: number; // 0-100
    windDirectionSuitability: number; // 0-100
    precipitationBias: number;      // 0-100
    chileanStormIntensity: number;  // 0-100 (NEW - Chilean side storm strength)
    chileanPressureDiff: number;    // 0-100 (NEW - Pressure gradient Chile-Argentina)
  };
  
  // Metadata
  validTime: Date;
  computedAt: Date;
}

/**
 * Snow Reality Forecast - adjusted accumulation after real-world effects
 */
export interface SnowRealityForecast {
  validTime: string;
  elevation: 'base' | 'mid' | 'summit';
  elevationMeters: number;
  forecastSnowfall: number;
  realAccumulation: number;
  adjustments: {
    windLoss: number;
    rainContamination: number;
    densityAdjustment: number;
    solarMelt: number;
    sublimation: number;
  };
  snowQuality: 'POWDER' | 'PACKED' | 'DENSE' | 'WET';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
}

/**
 * Processed forecast output
 */
export interface ProcessedForecast {
  resort: Resort;
  issuedAt: Date;
  
  // By elevation band
  base: ElevationForecast[];
  mid: ElevationForecast[];
  summit: ElevationForecast[];
  
  // Summary metrics
  bestWindow?: BestWindow;
  totalSnow24h: number;
  totalSnow72h: number;
  totalSnow7d: number;
  
  // Confidence
  overallConfidence: number;
  modelAgreement: ModelAgreement[];
  
  // Storm Crossing Analysis
  stormCrossingProbabilities?: StormCrossingProbability[];
  
  // Snow Reality Analysis
  snowRealityForecasts?: SnowRealityForecast[];
  
  // Wind Impact Analysis
  windImpactForecasts?: WindImpactForecast[];
}

/**
 * Wind Impact Analysis
 */
export type WindCategory = 'CALM' | 'MODERATE' | 'STRONG' | 'EXTREME';
export type LiftRisk = 'OPEN' | 'CAUTION' | 'HIGH_RISK' | 'CLOSED';

export interface WindImpactAnalysis {
  windSpeedKmh: number;
  adjustedWindKmh: number;
  category: WindCategory;
  windChill: number;
  liftRisk: LiftRisk;
  skiability: number;
  recommendation: string;
  warnings: string[];
}

export interface WindImpactForecast {
  validTime: string;
  elevation: 'base' | 'mid' | 'summit';
  elevationMeters: number;
  analysis: WindImpactAnalysis;
}
