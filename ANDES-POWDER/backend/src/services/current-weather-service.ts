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
  isRaining: boolean;
  conditions: string;
  observedAt: Date;
  source: string;
}

export class CurrentWeatherService {
  private baseUrl = 'https://api.open-meteo.com/v1/forecast';

  /**
   * Get current conditions for location
   */
  async getCurrentConditions(latitude: number, longitude: number): Promise<CurrentConditions | null> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          latitude,
          longitude,
          current: 'temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m',
          timezone: 'auto'
        },
        timeout: 5000
      });

      const current = response.data?.current;
      if (!current) {
        console.log('No current weather data available');
        return null;
      }

      const isRaining = (current.precipitation || 0) > 0 || (current.rain || 0) > 0;
      
      return {
        temperature: current.temperature_2m || 0,
        humidity: current.relative_humidity_2m || 0,
        windSpeed: current.wind_speed_10m || 0,
        windDirection: current.wind_direction_10m || 0,
        precipitation: current.precipitation || current.rain || 0,
        pressure: current.pressure_msl || 0,
        cloudCover: current.cloud_cover || 0,
        weatherCode: current.weather_code || 0,
        isRaining,
        conditions: this.getConditionsFromCode(current.weather_code, isRaining),
        observedAt: new Date(current.time),
        source: 'Open-Meteo (Current)'
      };
    } catch (error: any) {
      console.error('Error fetching current conditions:', error.message);
      return null;
    }
  }

  /**
   * Get human-readable conditions from WMO weather code
   */
  private getConditionsFromCode(code: number, isRaining: boolean): string {
    if (isRaining) return 'Rain';
    
    // WMO Weather interpretation codes
    if (code === 0) return 'Clear';
    if (code <= 3) return 'Partly cloudy';
    if (code <= 48) return 'Foggy';
    if (code <= 67) return 'Rain';
    if (code <= 77) return 'Snow';
    if (code <= 82) return 'Rain showers';
    if (code <= 86) return 'Snow showers';
    if (code <= 99) return 'Thunderstorm';
    
    return 'Unknown';
  }

  /**
   * Check if precipitation is currently happening
   */
  isPrecipitating(conditions: CurrentConditions): boolean {
    return conditions.precipitation > 0;
  }
}

export const currentWeatherService = new CurrentWeatherService();
