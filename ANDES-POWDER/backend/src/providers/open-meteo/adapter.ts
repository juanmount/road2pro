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
      'gefs': 'https://api.open-meteo.com/v1/ensemble'
    };
    
    const baseUrl = endpointMap[model];
    
    const params: any = {
      latitude: resort.latitude,
      longitude: resort.longitude,
      elevation: resort.midElevation, // Use mid elevation as reference for GFS
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
        'pressure_msl',
        'freezinglevel_height'
      ].join(','),
      daily: [
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'snowfall_sum',
        'windspeed_10m_max',
        'windgusts_10m_max'
      ].join(','),
      timezone: resort.timezone || 'auto',
      forecast_days: 16 // Request 16 days to ensure we always have 7+ full days of future data
    };
    
    try {
      const response = await axios.get(baseUrl, { params });
      
      return {
        provider: this.name,
        model,
        fetchedAt: new Date(),
        data: response.data
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
    
    // Parse hourly data
    const times = data.hourly.time.map((t: string) => new Date(t));
    const hourlyData = this.parseHourlyData(data.hourly, times);
    
    // Interpolate for different elevations
    const base = this.interpolateForElevation(hourlyData, resort.baseElevation, resort.midElevation);
    const mid = hourlyData; // Mid is our reference elevation
    const summit = this.interpolateForElevation(hourlyData, resort.summitElevation, resort.midElevation);
    
    // Extract freezing levels
    const freezingLevels = times.map((time: Date, i: number) => ({
      time,
      heightM: data.hourly.freezinglevel_height?.[i] || this.estimateFreezingLevel(data.hourly.temperature_2m[i])
    }));
    
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
  
  private parseHourlyData(hourly: any, times: Date[]): TimeSeriesPoint[] {
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
      pressure: hourly.pressure_msl?.[i],
      freezingLevel: hourly.freezinglevel_height?.[i]
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
    
    return reference.map(point => ({
      ...point,
      temperature: point.temperature + tempAdjustment,
      // Adjust snowfall based on elevation (more snow at higher elevations)
      snowfall: point.snowfall ? point.snowfall * (1 + elevationDiff / 1000 * 0.1) : undefined
    }));
  }
  
  private estimateFreezingLevel(temperature: number): number {
    // Rough estimate: freezing level based on surface temperature
    // Assumes standard lapse rate
    const lapseRate = 0.0065; // °C per meter
    return temperature / lapseRate;
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
