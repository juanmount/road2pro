export interface Resort {
  id: string;
  name: string;
  slug: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  timezone: string;
  baseElevation: number;
  midElevation: number;
  summitElevation: number;
}

export type ElevationBand = 'base' | 'mid' | 'summit';
export type PrecipitationType = 'snow' | 'rain' | 'mixed' | 'sleet' | 'none';
export type FreezeQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'none';

export interface BestWindow {
  start: string;
  end: string;
  reason: string;
}

export interface ElevationConditions {
  elevation: number;
  temperature: number;
  conditions: string;
  powderScore: number;
  windSpeed?: number;
  windImpact?: string;
  humidity?: number;
  cloudCover?: number;
  phase?: string;
  snowfall24h?: number;
}

export interface CurrentConditions {
  resort: {
    id: string;
    name: string;
    slug: string;
  };
  current: {
    timestamp: Date;
    powderScore: number;
    confidence?: {
      score: number;
      reason: string;
    } | null;
    bestWindow?: BestWindow | null;
    snowLine?: number | null;
    freezingLevel?: number | null;
    phase?: string;
    snowQuality?: string;
    freezeQuality?: FreezeQuality | null;
    recommendedZone?: string | null;
    summary?: string | null;
  };
  byElevation: {
    base: ElevationConditions;
    mid: ElevationConditions;
    summit: ElevationConditions;
  };
}

export interface HourlyForecast {
  id: string;
  timestamp: Date;
  elevationBand: ElevationBand;
  temperature: number;
  feelsLike: number;
  precipitation: number;
  precipitationType: PrecipitationType;
  snowDepth: number;
  windSpeed: number;
  windGust: number;
  windDirection: number;
  cloudCover: number;
  visibility: number;
  powderScore: number;
}

export interface DailyForecast {
  id: string;
  date: Date;
  elevationBand: ElevationBand;
  tempMin: number;
  tempMax: number;
  snowfallTotal: number;
  precipitationTotal: number;
  windMax: number;
  powderScoreAvg: number;
  powderScoreMax: number;
  bestWindowStart: string | null;
  bestWindowEnd: string | null;
  bestWindowReason: string | null;
  snowLine: number | null;
  freezeQuality: FreezeQuality | null;
  recommendedZone: string | null;
  conditionsSummary: string | null;
}
