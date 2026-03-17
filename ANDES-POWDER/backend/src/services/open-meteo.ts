import axios from 'axios';
import { OpenMeteoResponse } from '../types';

const BASE_URL = process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1';

export class OpenMeteoService {
  async getForecast(latitude: number, longitude: number, elevation: number): Promise<OpenMeteoResponse> {
    try {
      const response = await axios.get(`${BASE_URL}/forecast`, {
        params: {
          latitude,
          longitude,
          elevation,
          hourly: [
            'temperature_2m',
            'apparent_temperature',
            'precipitation',
            'snowfall',
            'snow_depth',
            'weather_code',
            'cloud_cover',
            'wind_speed_10m',
            'wind_gusts_10m',
            'wind_direction_10m',
            'visibility',
            'freezinglevel_height',
          ].join(','),
          timezone: 'auto',
          forecast_days: 16,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Open-Meteo forecast:', error);
      throw new Error('Failed to fetch weather forecast');
    }
  }

  async getMultiElevationForecast(
    latitude: number,
    longitude: number,
    baseElevation: number,
    midElevation: number,
    summitElevation: number
  ): Promise<{
    base: OpenMeteoResponse;
    mid: OpenMeteoResponse;
    summit: OpenMeteoResponse;
  }> {
    const [base, mid, summit] = await Promise.all([
      this.getForecast(latitude, longitude, baseElevation),
      this.getForecast(latitude, longitude, midElevation),
      this.getForecast(latitude, longitude, summitElevation),
    ]);

    return { base, mid, summit };
  }
}

export const openMeteoService = new OpenMeteoService();
