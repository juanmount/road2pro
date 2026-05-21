/**
 * Open-Meteo Provider Adapter
 * Implements ForecastProvider interface for Open-Meteo API
 */

import axios from 'axios';
import { ForecastProvider, FetchOptions, RawForecastData, ModelMetadata } from '../interfaces';
import { Resort, NormalizedForecast, ModelName, TimeSeriesPoint } from '../../domain/models';

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
      'ecmwf-ifs': 'https://api.open-meteo.com/v1/ecmwf',
      'gfs': 'https://api.open-meteo.com/v1/gfs',
      'gefs': 'https://api.open-meteo.com/v1/gem'  // GEM (Global Ensemble Model) replaces old ensemble endpoint
    };
    
    const baseUrl = endpointMap[model];
    
    const params: any = {
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
        'temperature_850hPa'  // T850 for better phase classification (GFS only)
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
            const gustFallback = await axios.get('https://api.open-meteo.com/v1/forecast', {
              params: {
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
    const freezingLevels = this.buildStableFreezingLevels(
      data.hourly.freezinglevel_height || [],
      data.hourly.temperature_2m,
      times,
      resort.midElevation
    );
    
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
  
  private parseHourlyDataWithFreezingLevel(
    hourly: any, 
    times: Date[], 
    referenceElevation: number,
    forecastFreezingLevels: number[] = []
  ): TimeSeriesPoint[] {
    return times.map((time, i) => ({
      time,
      temperature: hourly.temperature_2m[i] || 0,
      precipitation: hourly.precipitation[i] || 0,
      snowfall: hourly.snowfall?.[i],
      windSpeed: hourly.windspeed_10m[i] || 0,
      windGust: hourly.windgusts_10m?.[i],
      windDirection: hourly.winddirection_10m?.[i],
      humidity: hourly.relativehumidity_2m[i] || 50,
      cloudCover: hourly.cloudcover[i] || 0,
      cloudCoverLow: hourly.cloudcover_low?.[i],
      cloudCoverMid: hourly.cloudcover_mid?.[i],
      cloudCoverHigh: hourly.cloudcover_high?.[i],
      pressure: hourly.pressure_msl?.[i],
      // Priority: 1) Forecast model (ICON), 2) ECMWF, 3) Estimation
      freezingLevel: forecastFreezingLevels[i] || 
                     hourly.freezinglevel_height?.[i] || 
                     this.estimateFreezingLevel(hourly.temperature_2m[i], referenceElevation),
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
    
    const WIND_INCREASE_RATE = 0.0004; // 40% per 1000m
    const windMultiplier = Math.max(0.5, 1 + (elevationDiff * WIND_INCREASE_RATE));
    
    return reference.map(point => ({
      time: point.time,
      temperature: point.temperature + tempAdjustment,
      precipitation: point.precipitation,
      snowfall: point.snowfall ? point.snowfall * (1 + elevationDiff / 1000 * 0.1) : undefined,
      windSpeed: Math.round(point.windSpeed * windMultiplier),
      windGust: point.windGust ? Math.round(point.windGust * windMultiplier) : point.windGust,
      windDirection: point.windDirection,
      humidity: point.humidity,
      cloudCover: point.cloudCover,
      pressure: point.pressure,
      freezingLevel: point.freezingLevel,
      temperature850hPa: point.temperature850hPa  // T850 is constant across elevations (fixed pressure level)
    }));
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
      const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
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
   * Build stable freezing level array
   * Strategy: Use ECMWF data when available, then smoothly transition using temperature
   * This avoids jumps from ~1650m (ECMWF) to ~3700m (ICON fallback)
   */
  private buildStableFreezingLevels(
    ecmwfFreezingLevels: (number | null)[],
    temperatures: number[],
    times: Date[],
    referenceElevation: number
  ): Array<{ time: Date; heightM: number }> {
    const result: Array<{ time: Date; heightM: number }> = [];
    let lastKnownFRZ: number | null = null;
    let lastKnownTemp: number | null = null;
    
    for (let i = 0; i < times.length; i++) {
      const ecmwfFRZ = ecmwfFreezingLevels[i];
      const temp = temperatures[i];
      
      if (ecmwfFRZ !== null && ecmwfFRZ !== undefined) {
        // Use ECMWF data directly
        lastKnownFRZ = ecmwfFRZ;
        lastKnownTemp = temp;
        result.push({ time: times[i], heightM: ecmwfFRZ });
      } else if (lastKnownFRZ !== null && lastKnownTemp !== null) {
        // ECMWF data missing - adjust last known FRZ based on temperature change
        // Formula: ΔFreezingLevel = ΔTemperature / lapseRate
        const lapseRate = 0.0065; // °C per meter
        const tempChange: number = temp - lastKnownTemp;
        const frzAdjustment: number = tempChange / lapseRate;
        const adjustedFRZ: number = lastKnownFRZ + frzAdjustment;
        
        // Update for next iteration
        lastKnownFRZ = adjustedFRZ;
        lastKnownTemp = temp;
        
        result.push({ time: times[i], heightM: Math.max(0, adjustedFRZ) });
      } else {
        // No ECMWF data and no previous reference - use conservative estimate
        // Use temperature-based estimation but cap at reasonable values
        const lapseRate = 0.0065;
        const estimatedFRZ = referenceElevation + (temp / lapseRate);
        const cappedFRZ = Math.min(3000, Math.max(500, estimatedFRZ)); // Cap between 500-3000m
        
        lastKnownFRZ = cappedFRZ;
        lastKnownTemp = temp;
        
        result.push({ time: times[i], heightM: cappedFRZ });
      }
    }
    
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
      const response = await axios.get('https://api.open-meteo.com/v1/ecmwf', {
        params: {
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
