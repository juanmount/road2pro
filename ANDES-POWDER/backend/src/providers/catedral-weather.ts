import axios from 'axios';
import * as cheerio from 'cheerio';

export interface CatedralWeatherData {
  temperature: {
    base?: number;
    mid?: number;
    summit?: number;
  };
  snowDepth: {
    base?: number;
    mid?: number;
    summit?: number;
  };
  conditions?: string;
  lastUpdate?: Date;
}

export class CatedralWeatherFetcher {
  private readonly baseUrl = 'https://catedralaltapatagonia.com';
  
  /**
   * Fetch weather data from Cerro Catedral's website
   * This attempts to scrape their parte diario page for real-time conditions
   */
  async fetchWeatherData(): Promise<CatedralWeatherData | null> {
    try {
      console.log('Fetching Catedral weather data...');
      
      // Try the main parte de nieve page
      const response = await axios.get(`${this.baseUrl}/parte-de-nieve/`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });
      
      const $ = cheerio.load(response.data);
      const weatherData: CatedralWeatherData = {
        temperature: {},
        snowDepth: {},
      };
      
      // Look for temperature data in common patterns
      // This will need to be adjusted based on actual HTML structure
      $('[class*="temp"], [class*="temperatura"]').each((_, elem) => {
        const text = $(elem).text();
        const tempMatch = text.match(/(-?\d+)\s*°?\s*[Cc]/);
        if (tempMatch) {
          const temp = parseFloat(tempMatch[1]);
          
          // Try to determine elevation from context
          const context = $(elem).parent().text().toLowerCase();
          if (context.includes('base')) {
            weatherData.temperature.base = temp;
          } else if (context.includes('mid') || context.includes('medio')) {
            weatherData.temperature.mid = temp;
          } else if (context.includes('summit') || context.includes('cumbre')) {
            weatherData.temperature.summit = temp;
          }
        }
      });
      
      // Look for snow depth data
      $('[class*="snow"], [class*="nieve"]').each((_, elem) => {
        const text = $(elem).text();
        const snowMatch = text.match(/(\d+)\s*cm/);
        if (snowMatch) {
          const depth = parseFloat(snowMatch[1]);
          
          const context = $(elem).parent().text().toLowerCase();
          if (context.includes('base')) {
            weatherData.snowDepth.base = depth;
          } else if (context.includes('mid') || context.includes('medio')) {
            weatherData.snowDepth.mid = depth;
          } else if (context.includes('summit') || context.includes('cumbre')) {
            weatherData.snowDepth.summit = depth;
          }
        }
      });
      
      weatherData.lastUpdate = new Date();
      
      console.log('✓ Catedral weather data fetched:', weatherData);
      return weatherData;
      
    } catch (error) {
      console.error('Error fetching Catedral weather data:', error);
      return null;
    }
  }
  
  /**
   * Try alternative method: check if they have a JSON API endpoint
   */
  async fetchWeatherDataAPI(): Promise<CatedralWeatherData | null> {
    try {
      // Try common API endpoint patterns
      const possibleEndpoints = [
        '/api/weather',
        '/api/parte-diario',
        '/partediario/api',
        '/weather.json',
        '/data/weather.json',
      ];
      
      for (const endpoint of possibleEndpoints) {
        try {
          const response = await axios.get(`${this.baseUrl}${endpoint}`, {
            timeout: 5000,
            headers: {
              'Accept': 'application/json',
            },
          });
          
          if (response.data) {
            console.log(`✓ Found Catedral API at ${endpoint}`);
            console.log('API Response:', JSON.stringify(response.data, null, 2));
            const parsed = this.parseAPIResponse(response.data);
            console.log('Parsed data:', JSON.stringify(parsed, null, 2));
            return parsed;
          }
        } catch (err) {
          // Continue to next endpoint
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching Catedral API data:', error);
      return null;
    }
  }
  
  private parseAPIResponse(data: any): CatedralWeatherData {
    // Parse API response - structure will depend on their actual API
    return {
      temperature: {
        base: data.temperature?.base || data.temp_base,
        mid: data.temperature?.mid || data.temp_mid,
        summit: data.temperature?.summit || data.temp_summit,
      },
      snowDepth: {
        base: data.snow?.base || data.snow_base,
        mid: data.snow?.mid || data.snow_mid,
        summit: data.snow?.summit || data.snow_summit,
      },
      conditions: data.conditions || data.estado,
      lastUpdate: new Date(data.timestamp || data.fecha || Date.now()),
    };
  }
}
