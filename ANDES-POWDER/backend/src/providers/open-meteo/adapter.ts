/**
 * Open-Meteo Provider Adapter
 * Implements ForecastProvider interface for Open-Meteo API
 */

import axios from 'axios';
import { ForecastProvider, FetchOptions, RawForecastData, ModelMetadata } from '../interfaces';
import { Resort, NormalizedForecast, ModelName, TimeSeriesPoint } from '../../domain/models';

const OPEN_METEO_API_KEY = process.env.OPEN_METEO_API_KEY || '';
const OM_DOMAIN = OPEN_METEO_API_KEY ? 'customer-api.open-meteo.com' : 'api.open-meteo.com';

export class OpenMeteoProvider implements ForecastProvider {
  readonly name = 'open-meteo' as const;
  readonly models: ModelName[] = ['ecmwf-ifs', 'gfs', 'gefs'];
  private freezingLevelCache: Map<string, number[]> = new Map();
  
  async fetchForecast(
    resort: Resort,
    timeRange: { start: Date; end: Date },
    options?: FetchOptions
  ): Promise<RawForecastData> {
    const model = options?.models?.[0] || 'ecmwf-ifs';
    
    // Map our model names to Open-Meteo API endpoints
    const endpointMap: Record<string, string> = {
      'ecmwf-ifs': `https://${OM_DOMAIN}/v1/ecmwf`,
      'gfs': `https://${OM_DOMAIN}/v1/gfs`,
      'gefs': `https://${OM_DOMAIN}/v1/gem`  // GEM (Global Ensemble Model) replaces old ensemble endpoint
    };
    
    const baseUrl = endpointMap[model];
    
    const params: any = {
      ...(OPEN_METEO_API_KEY ? { apikey: OPEN_METEO_API_KEY } : {}),
      latitude: resort.latitude,
      longitude: resort.longitude,
      elevation: resort.summitElevation, // Use summit elevation as reference for most accurate wind gusts data
      hourly: [
        'temperature_2m',
        'apparent_temperature',
        'precipitation',
        'snowfall',
        'snow_depth',
        'weathercode',
        'windspeed_10m',
        'windgusts_10m',
        'winddirection_10m',
        'relativehumidity_2m',
        'cloudcover',
        'cloudcover_low',
        'cloudcover_mid',
        'cloudcover_high',
        'pressure_msl',
        'freezinglevel_height',
        'temperature_850hPa',
        'temperature_700hPa',
        'geopotential_height_850hPa',
        'geopotential_height_700hPa'
      ].join(','),
      daily: [
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'snowfall_sum',
        'windspeed_10m_max',
        'windgusts_10m_max'
      ].join(','),
      timezone: 'GMT',
      forecast_days: 16 // Request 16 days to ensure we always have 7+ full days of future data
    };
    
    try {
      const response = await axios.get(baseUrl, { params });
      const responseData = response.data;

      if (model === 'ecmwf-ifs') {
        const gusts = responseData?.hourly?.windgusts_10m;
        const hasValidGusts = Array.isArray(gusts) && gusts.some((value: any) => typeof value === 'number');

        if (!hasValidGusts) {
          try {
            const gustFallback = await axios.get(`https://${OM_DOMAIN}/v1/forecast`, {
              params: {
                ...(OPEN_METEO_API_KEY ? { apikey: OPEN_METEO_API_KEY } : {}),
                latitude: resort.latitude,
                longitude: resort.longitude,
                elevation: resort.summitElevation,
                hourly: 'windgusts_10m',
                timezone: 'GMT',
                forecast_days: 16
              }
            });

            const fallbackGusts = gustFallback.data?.hourly?.windgusts_10m;
            if (Array.isArray(fallbackGusts) && fallbackGusts.some((value: any) => typeof value === 'number')) {
              responseData.hourly = {
                ...responseData.hourly,
                windgusts_10m: fallbackGusts
              };
              console.log(`    → ECMWF gust fallback applied for ${resort.name}`);
            }
          } catch (fallbackError) {
            console.warn(`    ⚠ ECMWF gust fallback failed for ${resort.name}:`, fallbackError);
          }
        }
      }
      
      return {
        provider: this.name,
        model,
        fetchedAt: new Date(),
        data: responseData
      };
    } catch (error) {
      console.error(`Error fetching from Open-Meteo for ${resort.name}:`, error);
      throw new Error(`Failed to fetch forecast from Open-Meteo: ${error}`);
    }
  }
  
  async normalizeForecast(
    raw: RawForecastData,
    resort: Resort
  ): Promise<NormalizedForecast> {
    const data = raw.data;
    
    if (!data.hourly || !data.hourly.time) {
      throw new Error('Invalid Open-Meteo response: missing hourly data');
    }
    
    // Build stable freezing level array
    const times = data.hourly.time.map((t: string) => new Date(t));
    console.log(`[OpenMeteo] Building stable FRZ for ${resort.name}...`);
    const pressureLevels = {
      t850: data.hourly.temperature_850hPa || [],
      h850: data.hourly.geopotential_height_850hPa || [],
      t700: data.hourly.temperature_700hPa || [],
      h700: data.hourly.geopotential_height_700hPa || [],
    };
    // ECMWF's freezinglevel_height is unreliable when elevation param is set
    // (it gets clamped near the summit and misses warm frontal intrusions).
    // For ECMWF always derive FRZ from T850/T700 pressure-level interpolation.
    // For GFS/GEFS use freezinglevel_height directly (it is accurate).
    const isECMWF = raw.model === 'ecmwf-ifs';
    const rawFrzInput = isECMWF ? [] : (data.hourly.freezinglevel_height || []);
    let freezingLevels;
    try {
      freezingLevels = this.buildStableFreezingLevels(
        rawFrzInput,
        data.hourly.temperature_2m,
        times,
        resort.midElevation,
        pressureLevels
      );
      console.log(`[OpenMeteo] buildStableFreezingLevels completed for ${resort.name}`);
    } catch (error) {
      console.error(`[OpenMeteo] ERROR in buildStableFreezingLevels for ${resort.name}:`, error);
      throw error;
    }
    
    // Parse hourly data with stable freezing levels
    const hourlyData = this.parseHourlyDataWithFreezingLevel(
      data.hourly, 
      times, 
      resort.summitElevation,
      freezingLevels.map(f => f.heightM)
    );
    
    // Interpolate for different elevations (summit is reference)
    const summit = hourlyData; // Summit is our reference elevation
    const mid = this.interpolateForElevation(hourlyData, resort.midElevation, resort.summitElevation);
    const base = this.interpolateForElevation(hourlyData, resort.baseElevation, resort.summitElevation);
    
    return {
      provider: this.name,
      model: raw.model,
      issuedAt: raw.fetchedAt,
      base,
      mid,
      summit,
      freezingLevels,
      metadata: {
        resolution: '1 hour',
        updateFrequency: raw.model === 'gfs' ? '6 hours' : '12 hours',
        horizon: '15 days'
      }
    };
  }
  
  private deaccumulate3hourly(values: (number | null | undefined)[]): number[] {
    const result: number[] = new Array(values.length).fill(0);
    let i = 0;
    while (i < values.length) {
      const v = values[i];
      if (!v || v <= 0) { result[i] = 0; i++; continue; }
      let j = i + 1;
      while (j < values.length && values[j] === v) j++;
      const blockSize = j - i;
      const perHour = blockSize >= 2 && blockSize <= 6 ? v / blockSize : v;
      for (let k = i; k < j; k++) result[k] = perHour;
      i = j;
    }
    return result;
  }

  private parseHourlyDataWithFreezingLevel(
    hourly: any, 
    times: Date[], 
    referenceElevation: number,
    forecastFreezingLevels: number[] = []
  ): TimeSeriesPoint[] {
    const precipDeacc = this.deaccumulate3hourly(hourly.precipitation);
    const snowDeacc   = this.deaccumulate3hourly(hourly.snowfall);
    return times.map((time, i) => ({
      time,
      temperature: hourly.temperature_2m[i] || 0,
      precipitation: precipDeacc[i],
      snowfall: snowDeacc[i],
      windSpeed: hourly.windspeed_10m[i] || 0,
      windGust: hourly.windgusts_10m?.[i],
      windDirection: hourly.winddirection_10m?.[i],
      humidity: hourly.relativehumidity_2m[i] || 50,
      cloudCover: hourly.cloudcover[i] || 0,
      cloudCoverLow: hourly.cloudcover_low?.[i],
      cloudCoverMid: hourly.cloudcover_mid?.[i],
      cloudCoverHigh: hourly.cloudcover_high?.[i],
      pressure: hourly.pressure_msl?.[i],
      // Use stable freezing level from buildStableFreezingLevels
      freezingLevel: forecastFreezingLevels[i] || 2000, // Fallback to 2000m if somehow missing
      temperature850hPa: hourly.temperature_850hPa?.[i]  // T850 for better phase classification (GFS only)
    }));
  }
  
  private interpolateForElevation(
    reference: TimeSeriesPoint[],
    targetElevation: number,
    referenceElevation: number
  ): TimeSeriesPoint[] {
    const elevationDiff = targetElevation - referenceElevation;
    const tempLapseRate = -0.0065; // °C per meter (standard atmosphere)
    const tempAdjustment = elevationDiff * tempLapseRate;
    
    const month = new Date().getMonth() + 1;
    const isWinter = month >= 5 && month <= 9;
    const isDownward = elevationDiff < 0;

    const WIND_INCREASE_RATE = 0.0004; // 40% per 1000m
    const windMultiplier = Math.max(0.5, 1 + (elevationDiff * WIND_INCREASE_RATE));
    
    return reference.map(point => {
      // Temperature-dependent winter bias (only when interpolating DOWN from summit in winter).
      // Warm/stable summit (T > +2°C): full -2°C — strong valley inversion, model overshoots warmth.
      // Cold/frontal summit (T < -2°C): minimal -0.5°C — well-mixed atmosphere, standard lapse rate holds.
      // Linear interpolation between the two regimes.
      let winterBias = 0;
      if (isWinter && isDownward) {
        const biasScale = Math.max(0, Math.min(1, (point.temperature + 2) / 4));
        winterBias = biasScale * (-2.0) + (1 - biasScale) * (-0.5);
      }
      return {
        time: point.time,
        temperature: point.temperature + tempAdjustment + winterBias,
        precipitation: point.precipitation,
        snowfall: point.snowfall ? point.snowfall * (1 + elevationDiff / 1000 * 0.1) : undefined,
        windSpeed: Math.round(point.windSpeed * windMultiplier),
        windGust: point.windGust ? Math.round(point.windGust * windMultiplier) : point.windGust,
        windDirection: point.windDirection,
        humidity: point.humidity,
        cloudCover: point.cloudCover,
        pressure: point.pressure,
        freezingLevel: point.freezingLevel,
        temperature850hPa: point.temperature850hPa
      };
    });
  }
  
  /**
   * Fetch accurate freezing level from forecast model (ICON)
   * Used as fallback when ECMWF doesn't provide freezing level
   */
  private async fetchFreezingLevelFromForecast(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string
  ): Promise<number[]> {
    const cacheKey = `${latitude},${longitude},${startDate}`;
    
    // Check cache first
    if (this.freezingLevelCache.has(cacheKey)) {
      return this.freezingLevelCache.get(cacheKey)!;
    }
    
    try {
      const response = await axios.get(`https://${OM_DOMAIN}/v1/forecast`, {
        params: {
          ...(OPEN_METEO_API_KEY ? { apikey: OPEN_METEO_API_KEY } : {}),
          latitude,
          longitude,
          hourly: 'freezinglevel_height',
          start_date: startDate,
          end_date: endDate,
          timezone: 'GMT'
        },
        timeout: 5000
      });
      
      const freezingLevels = response.data.hourly.freezinglevel_height || [];
      
      // Cache for 1 hour (will be cleared on next fetch)
      this.freezingLevelCache.set(cacheKey, freezingLevels);
      
      console.log(`    → Fetched ${freezingLevels.length} freezing level values from forecast model`);
      return freezingLevels;
    } catch (error) {
      console.warn('    ⚠ Failed to fetch freezing level from forecast model:', error);
      return [];
    }
  }
  
  /**
   * Derive freezing level from atmospheric pressure-level temperatures via linear interpolation.
   * Primary source when model does not publish freezinglevel_height directly (e.g. ECMWF on Open-Meteo).
   */
  private deriveFrzFromPressureLevels(
    t850: number | null | undefined,
    h850: number | null | undefined,
    t700: number | null | undefined,
    h700: number | null | undefined
  ): number | null {
    if (t850 === null || t850 === undefined || h850 === null || h850 === undefined) return null;

    // Case 1: FRZ is below 850hPa (cold post-frontal, T850 < 0)
    // Extrapolate downward using standard lapse rate: h_frz = h_850 + T_850 / 0.0065
    if (t850 < 0) {
      return Math.max(0, Math.round(h850 + t850 / 0.0065));
    }

    // Case 2: FRZ is between 850hPa and 700hPa (most common winter scenario)
    if (t700 !== null && t700 !== undefined && h700 !== null && h700 !== undefined && t700 < 0) {
      const frzHeight = h850 + (h700 - h850) * (t850 / (t850 - t700));
      return Math.round(Math.max(h850, Math.min(h700, frzHeight)));
    }

    // Case 3: FRZ is above 700hPa (warm event, T700 >= 0)
    if (t700 !== null && t700 !== undefined && h700 !== null && h700 !== undefined) {
      return Math.min(5000, Math.round(h700 + t700 / 0.0065));
    }

    return null;
  }

  /**
   * Build stable freezing level array.
   * Priority: (1) direct model FRZ, (2) derived from pressure-level temperatures, (3) temperature-based estimate.
   */
  private buildStableFreezingLevels(
    rawFreezingLevels: (number | null)[],
    temperatures: number[],
    times: Date[],
    referenceElevation: number,
    pressureLevels?: {
      t850: (number | null)[];
      h850: (number | null)[];
      t700: (number | null)[];
      h700: (number | null)[];
    }
  ): Array<{ time: Date; heightM: number }> {
    const result: Array<{ time: Date; heightM: number }> = [];
    let lastKnownFRZ: number | null = null;
    let lastKnownTemp: number | null = null;

    for (let i = 0; i < times.length; i++) {
      const rawFRZ = rawFreezingLevels[i];
      const temp = temperatures[i];

      // Priority 1: direct model value (ICON / GFS freezinglevel_height)
      let frzValue: number | null = (rawFRZ !== null && rawFRZ !== undefined) ? rawFRZ : null;

      // Priority 2: derive from pressure-level temperatures (ECMWF T850/T700 + geopotential heights)
      if (frzValue === null && pressureLevels) {
        frzValue = this.deriveFrzFromPressureLevels(
          pressureLevels.t850[i], pressureLevels.h850[i],
          pressureLevels.t700[i], pressureLevels.h700[i]
        );
        if (frzValue !== null && i < 3) {
          console.log(`[buildStableFreezingLevels] Hour ${i}: Derived from pressure levels ${frzValue}m (T850=${pressureLevels.t850[i]}, T700=${pressureLevels.t700[i]})`);
        }
      }

      if (frzValue !== null) {
        lastKnownFRZ = frzValue;
        lastKnownTemp = temp;
        result.push({ time: times[i], heightM: frzValue });
        if (i < 3) console.log(`[buildStableFreezingLevels] Hour ${i}: FRZ=${frzValue}m`);
      } else if (lastKnownFRZ !== null && lastKnownTemp !== null) {
        // Priority 3: propagate last known FRZ adjusted by temperature change
        const tempChange: number = temp - lastKnownTemp;
        const adjustedFRZ: number = lastKnownFRZ + tempChange / 0.0065;
        lastKnownFRZ = adjustedFRZ;
        lastKnownTemp = temp;
        result.push({ time: times[i], heightM: Math.max(0, adjustedFRZ) });
      } else {
        // Priority 4: cold-start estimate from surface temperature
        const estimatedFRZ = referenceElevation + (temp / 0.0065);
        const cappedFRZ = Math.min(3000, Math.max(500, estimatedFRZ));
        lastKnownFRZ = cappedFRZ;
        lastKnownTemp = temp;
        result.push({ time: times[i], heightM: cappedFRZ });
      }
    }

    console.log('[buildStableFreezingLevels] First 3 results:', result.slice(0, 3).map(r => r.heightM));
    return result;
  }
  
  private estimateFreezingLevel(temperature: number, referenceElevation: number): number {
    // Fallback estimation (less accurate)
    // Formula: freezingLevel = referenceElevation + (temperature / lapseRate)
    const lapseRate = 0.0065; // °C per meter
    const heightAboveReference = temperature / lapseRate;
    return Math.max(0, referenceElevation + heightAboveReference);
  }
  
  getModelMetadata(): ModelMetadata[] {
    return [
      {
        name: 'ecmwf-ifs',
        provider: this.name,
        resolution: '0.4° (~44 km)',
        updateFrequency: '12 hours',
        maxHorizon: '15 days',
        variables: ['temperature', 'precipitation', 'snowfall', 'wind', 'freezing_level']
      },
      {
        name: 'gfs',
        provider: this.name,
        resolution: '0.25° (~25 km)',
        updateFrequency: '6 hours',
        maxHorizon: '16 days',
        variables: ['temperature', 'precipitation', 'snowfall', 'wind', 'freezing_level']
      },
      {
        name: 'gefs',
        provider: this.name,
        resolution: '0.5° (~50 km)',
        updateFrequency: '6 hours',
        maxHorizon: '16 days',
        variables: ['temperature', 'precipitation', 'snowfall', 'wind', 'ensemble_spread']
      }
    ];
  }
  
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await axios.get(`https://${OM_DOMAIN}/v1/ecmwf`, {
        params: {
          ...(OPEN_METEO_API_KEY ? { apikey: OPEN_METEO_API_KEY } : {}),
          latitude: -41.15,
          longitude: -71.31,
          hourly: 'temperature_2m',
          forecast_days: 1
        },
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
