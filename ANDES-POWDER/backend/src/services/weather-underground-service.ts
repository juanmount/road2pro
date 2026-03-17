/**
 * Current Weather Service
 * Fetches real-time conditions from Open-Meteo (free, no API key needed)
 * Updates every 15 minutes
 */

import axios from 'axios';

interface CurrentConditions {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  pressure: number;
  cloudCover: number;
  weatherCode: number;
  conditions: string;
  observedAt: Date;
  source: string;
}

export class CurrentWeatherService {
  private baseUrl = 'https://api.open-meteo.com/v1/forecast';

  constructor() {
    // No API key needed for Open-Meteo
  }

  /**
   * Find nearest weather station to coordinates
   */
  async findNearestStation(latitude: number, longitude: number, radiusKm: number = 50): Promise<string | null> {
    if (!this.apiKey) return null;

    try {
      const response = await axios.get(`${this.baseUrl}`, {
        params: {
          apiKey: this.apiKey,
          geocode: `${latitude},${longitude}`,
          units: 'm',
          format: 'json',
          numericPrecision: 'decimal'
        },
        timeout: 5000
      });

      const observations = response.data?.observations;
      if (!observations || observations.length === 0) {
        console.log(`No Weather Underground stations found near ${latitude},${longitude}`);
        return null;
      }

      // Return closest station
      const station = observations[0];
      console.log(`✓ Found WU station: ${station.stationID} (${station.neighborhood || 'Unknown'})`);
      return station.stationID;
    } catch (error: any) {
      console.error('Error finding WU station:', error.message);
      return null;
    }
  }

  /**
   * Get current conditions from specific station
   */
  async getCurrentConditions(stationId: string): Promise<WUCurrentConditions | null> {
    if (!this.apiKey) {
      console.warn('Weather Underground API key not configured');
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}`, {
        params: {
          apiKey: this.apiKey,
          stationId: stationId,
          units: 'm',
          format: 'json',
          numericPrecision: 'decimal'
        },
        timeout: 5000
      });

      const obs = response.data?.observations?.[0];
      if (!obs) {
        console.log(`No data from station ${stationId}`);
        return null;
      }

      const metric = obs.metric;
      
      return {
        temperature: metric.temp || 0,
        humidity: obs.humidity || 0,
        windSpeed: metric.windSpeed || 0,
        windDirection: obs.winddir || 0,
        precipitation: metric.precipRate || 0,
        pressure: metric.pressure || 0,
        conditions: obs.solarRadiation > 0 ? 'clear' : 'cloudy',
        observedAt: new Date(obs.obsTimeLocal),
        stationId: obs.stationID,
        stationName: obs.neighborhood || 'Unknown'
      };
    } catch (error: any) {
      console.error(`Error fetching WU data from ${stationId}:`, error.message);
      return null;
    }
  }

  /**
   * Get current conditions for resort area
   * Tries to find nearest station and fetch data
   */
  async getResortConditions(latitude: number, longitude: number): Promise<WUCurrentConditions | null> {
    if (!this.apiKey) return null;

    try {
      // Find nearest station
      const stationId = await this.findNearestStation(latitude, longitude);
      if (!stationId) return null;

      // Get conditions from that station
      return await this.getCurrentConditions(stationId);
    } catch (error: any) {
      console.error('Error getting resort conditions:', error.message);
      return null;
    }
  }

  /**
   * Check if precipitation is currently happening
   */
  isPrecipitating(conditions: WUCurrentConditions): boolean {
    return conditions.precipitation > 0;
  }

  /**
   * Get human-readable conditions
   */
  getConditionsText(conditions: WUCurrentConditions): string {
    if (conditions.precipitation > 2) return 'Heavy rain';
    if (conditions.precipitation > 0.5) return 'Rain';
    if (conditions.precipitation > 0) return 'Light rain';
    if (conditions.humidity > 85) return 'Cloudy';
    if (conditions.humidity > 60) return 'Partly cloudy';
    return 'Clear';
  }
}

export const weatherUndergroundService = new WeatherUndergroundService();
