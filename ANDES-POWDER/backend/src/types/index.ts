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
  createdAt: Date;
  updatedAt: Date;
}

export type ElevationBand = 'base' | 'mid' | 'summit';
export type PrecipitationType = 'snow' | 'rain' | 'mixed' | 'none';
export type FreezeQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'none';

export interface HourlyForecast {
  id: string;
  snapshotId: string;
  resortId: string;
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
  createdAt: Date;
}

export interface DailyForecast {
  id: string;
  snapshotId: string;
  resortId: string;
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
  createdAt: Date;
}

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
    bestWindow: BestWindow | null;
    snowLine: number | null;
    freezeQuality: FreezeQuality | null;
    recommendedZone: string | null;
    summary: string | null;
  };
  byElevation: {
    base: ElevationConditions;
    mid: ElevationConditions;
    summit: ElevationConditions;
  };
}

export interface OpenMeteoHourlyData {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation: number[];
  snowfall: number[];
  snow_depth: number[];
  weather_code: number[];
  cloud_cover: number[];
  wind_speed_10m: number[];
  wind_gusts_10m: number[];
  wind_direction_10m: number[];
  visibility: number[];
  freezinglevel_height?: number[];
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  hourly: OpenMeteoHourlyData;
}
