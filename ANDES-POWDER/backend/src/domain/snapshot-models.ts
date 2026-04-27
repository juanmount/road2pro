/**
 * Forecast Snapshot Models
 * Daily snapshots of forecasts for validation and accuracy tracking
 */

export interface ForecastSnapshot {
  id: string;
  resortId: string;
  snapshotDate: Date;
  forecastDate: Date; // The date being forecasted
  
  // Forecast data by elevation
  base: ElevationSnapshot;
  mid: ElevationSnapshot;
  summit: ElevationSnapshot;
  
  // Storm crossing
  stormCrossing?: {
    score: number;
    category: 'LOW' | 'MEDIUM' | 'HIGH';
    explanation?: string;
  };
  
  // Confidence
  confidenceScore?: number;
  confidenceReason?: string;
  
  // Metadata
  createdAt: Date;
}

export interface ElevationSnapshot {
  elevation: number;
  
  // Core metrics
  temperature: number;
  snowfall: number;
  precipitation: number;
  
  // Wind
  windSpeed: number;
  windGust: number;
  windDirection: number;
  
  // Other
  freezingLevel: number;
  humidity: number;
  cloudCover: number;
}

export interface ValidationEvent {
  id: string;
  resortId: string;
  eventDate: Date;
  
  // What we forecasted (from snapshot)
  snapshotId: string;
  forecastedSnow: {
    base: number;
    mid: number;
    summit: number;
  };
  
  // What actually happened
  observedSnow?: {
    base?: number;
    mid?: number;
    summit?: number;
  };
  
  // Observations
  observationType: 'webcam' | 'weather-station' | 'user-report' | 'resort-report';
  observationSource: string;
  observationNotes?: string;
  observationPhotos?: string[];
  
  // Accuracy metrics
  accuracy?: {
    baseError?: number;
    midError?: number;
    summitError?: number;
    overallMAE?: number;
  };
  
  // Metadata
  validatedBy?: string;
  validatedAt?: Date;
  createdAt: Date;
}

export interface AccuracyMetrics {
  resortId: string;
  period: 'week' | 'month' | 'season' | 'all-time';
  startDate: Date;
  endDate: Date;
  
  // Overall metrics
  totalForecasts: number;
  validatedForecasts: number;
  
  // Snowfall accuracy
  snowfallMAE: number; // Mean Absolute Error
  snowfallRMSE: number; // Root Mean Square Error
  snowfallBias: number; // Tendency to over/under forecast
  
  // By elevation
  baseAccuracy: number;
  midAccuracy: number;
  summitAccuracy: number;
  
  // Storm crossing accuracy
  stormCrossingAccuracy?: number;
  
  // Confidence calibration
  confidenceCalibration?: number; // How well confidence matches actual accuracy
  
  calculatedAt: Date;
}
