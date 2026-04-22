import { TuyaContext } from '@tuya/tuya-connector-nodejs';

interface TuyaWeatherData {
  temperature: number;
  humidity: number;
  pressure?: number;
  wind_speed?: number;
  wind_direction?: number;
  precipitation?: number;
  timestamp: string;
  source: string;
}

class TuyaWeatherService {
  private tuya: TuyaContext;
  private deviceId: string;

  constructor() {
    const accessId = process.env.TUYA_ACCESS_ID || '';
    const accessSecret = process.env.TUYA_ACCESS_SECRET || '';
    this.deviceId = process.env.TUYA_DEVICE_ID || '';
    const baseUrl = process.env.TUYA_DATA_CENTER || 'https://openapi.tuyaus.com';

    this.tuya = new TuyaContext({
      baseUrl: baseUrl,
      accessKey: accessId,
      secretKey: accessSecret,
    });
  }

  /**
   * Get device shadow properties (full data) from Tuya API
   */
  private async getDeviceStatus(): Promise<any> {
    try {
      const response = await this.tuya.request({
        path: `/v2.0/cloud/thing/${this.deviceId}/shadow/properties`,
        method: 'GET',
      });

      if (response.success) {
        return (response.result as any).properties;
      } else {
        throw new Error(`Failed to get device status: ${response.msg}`);
      }
    } catch (error) {
      console.error('[TUYA] Error getting device status:', error);
      throw error;
    }
  }

  /**
   * Parse Tuya device shadow properties into weather data
   */
  private parseWeatherData(properties: any[]): TuyaWeatherData {
    const data: any = {};

    // Map Tuya shadow property codes to our data structure
    properties.forEach((item: any) => {
      switch (item.code) {
        // Outdoor temperature (channel 1)
        case 'ch1temp':
          data.temperature = item.value / 10; // Tuya sends in tenths of degree
          break;
        // Outdoor humidity (channel 1)
        case 'ch1hum':
          data.humidity = item.value / 10; // Tuya sends in tenths of percent
          break;
        // Atmospheric pressure
        case 'pressure':
          data.pressure = item.value / 10; // Tuya sends in tenths of hPa
          break;
        // Wind speed
        case 'windspeed':
          data.wind_speed = item.value / 10; // Tuya sends in tenths of m/s
          break;
        // Wind direction (enum: N, NE, E, SE, S, SW, W, NW)
        case 'wd':
          data.wind_direction = item.value;
          break;
        // Precipitation (1 hour)
        case 'rain_1h':
          data.precipitation = item.value / 10; // Tuya sends in tenths of mm
          break;
      }
    });

    // Convert wind direction from string to degrees
    const windDirectionMap: { [key: string]: number } = {
      'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
      'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
      'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
      'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
    };

    return {
      temperature: data.temperature || 0,
      humidity: data.humidity || 0,
      pressure: data.pressure,
      wind_speed: data.wind_speed ? data.wind_speed * 3.6 : undefined, // Convert m/s to km/h
      wind_direction: data.wind_direction ? windDirectionMap[data.wind_direction] : undefined,
      precipitation: data.precipitation,
      timestamp: new Date().toISOString(),
      source: 'tuya_weather_station'
    };
  }

  /**
   * Get current weather data from the station
   */
  async getCurrentWeather(): Promise<TuyaWeatherData> {
    try {
      console.log('[TUYA] Fetching current weather data...');
      const status = await this.getDeviceStatus();
      const weatherData = this.parseWeatherData(status);
      console.log('[TUYA] Weather data retrieved:', weatherData);
      return weatherData;
    } catch (error) {
      console.error('[TUYA] Error fetching weather data:', error);
      throw error;
    }
  }

  /**
   * Test connection to Tuya API
   */
  async testConnection(): Promise<boolean> {
    try {
      const status = await this.getDeviceStatus();
      console.log('[TUYA] Connection test successful');
      console.log('[TUYA] Device status:', status);
      return true;
    } catch (error) {
      console.error('[TUYA] Connection test failed:', error);
      return false;
    }
  }
}

export const tuyaWeatherService = new TuyaWeatherService();
