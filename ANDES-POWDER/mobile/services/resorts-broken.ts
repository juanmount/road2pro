import api from '../config/api';
import { supabase } from '../config/supabase';
import { Resort, CurrentConditions, HourlyForecast, DailyForecast } from '../types';

// Cache for forecast_run_id to ensure consistency across calls
const forecastRunCache: { [key: string]: { runId: string; timestamp: number } } = {};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes - balance between performance and freshness

export const resortsService = {
  async getAll(): Promise<Resort[]> {
    const response = await api.get('/resorts');
    return response.data;
  },

  async getById(id: string): Promise<Resort> {
    const response = await api.get(`/resorts/${id}`);
    return response.data;
  },

  async getCurrentConditions(id: string): Promise<CurrentConditions> {
    const response = await api.get(`/resorts/${id}/forecast/current`);
    return response.data;
  },

  async getHourlyForecast(
    id: string,
    elevation: 'base' | 'mid' | 'summit' = 'mid',
    hours: number = 24
  ): Promise<any> {
    console.log('[HOURLY FORECAST] Fetching from Open-Meteo with past_days=1');
    
    try {
      // Get resort data
      const resortResponse = await api.get(`/resorts/${id}`);
      const resort = resortResponse.data;
        
        const elevationMeters = elevation === 'base' ? resort.baseElevation : 
                               elevation === 'mid' ? resort.midElevation : 
                               resort.summitElevation;
        
        // Fetch from Open-Meteo directly with BEST_MATCH models (GFS + ECMWF + ICON)
        // This ensures we get the most accurate forecast for Patagonia
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${resort.latitude}&longitude=${resort.longitude}&current=temperature_2m,windspeed_10m,winddirection_10m,relativehumidity_2m&hourly=temperature_2m,precipitation,snowfall,cloudcover,windspeed_10m,winddirection_10m,relativehumidity_2m,freezinglevel_height&forecast_days=7&past_days=1&timezone=auto&models=best_match`;
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const text = await response.text();
        let data;
        
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('[FORECAST ERROR] JSON parse failed. Response:', text.substring(0, 200));
          throw new Error('Invalid JSON response from weather API');
        }
        
        if (!data.hourly || !data.current) {
          console.error('[FORECAST ERROR] Missing data. Response:', data);
          throw new Error('Invalid API response - missing hourly or current data');
        }
      
      // Find start of TODAY (00:00) to include all hours of current day
      const currentTime = new Date(data.current.time);
      const currentDate = currentTime.toISOString().split('T')[0];
      
      // Find first hour of today (00:00)
      let startIndex = data.hourly.time.findIndex((t: string) => {
        const hourTime = new Date(t);
        return hourTime.toISOString().split('T')[0] === currentDate;
      });
      
      if (startIndex === -1) {
        // Fallback: find closest future hour
        const now = currentTime.getTime();
        for (let i = 0; i < data.hourly.time.length; i++) {
          if (new Date(data.hourly.time[i]).getTime() >= now) {
            startIndex = i;
            break;
          }
        }
      }
      
      if (startIndex === -1) startIndex = 0;
      
      console.log('[FORECAST] Current:', data.current.temperature_2m, '°C at', currentTime);
      console.log('[FORECAST] Start index:', startIndex, '(from start of today)');
      console.log('[FORECAST] Total hours in API response:', data.hourly.time.length);
      console.log('[FORECAST] First hour in response:', data.hourly.time[0]);
      console.log('[FORECAST] Last hour in response:', data.hourly.time[data.hourly.time.length - 1]);
      
      // Build forecast array
      const forecast = [];
      let totalPrecipProcessed = 0;
      let hoursWithPrecip = 0;
      
      for (let i = 0; i < hours && (startIndex + i) < data.hourly.time.length; i++) {
        const idx = startIndex + i;
        const hourPrecip = data.hourly.precipitation[idx] || 0;
        if (hourPrecip > 0.01) {
          totalPrecipProcessed += hourPrecip;
          hoursWithPrecip++;
        }
        
        // PATAGONIAN LAPSE RATE - Dynamic adjustment based on local conditions
        const baseTemp = data.hourly.temperature_2m[idx];
        const humidity = data.hourly.relativehumidity_2m?.[idx] || 70;
        const windSpeed = data.hourly.windspeed_10m[idx] || 0;
        const hour = new Date(data.hourly.time[idx]).getHours();
        
        // Base lapse rate: -6.5°C/1000m (standard)
        let lapseRate = 0.0065;
        
        // FACTOR 1: Humidity (Pacific moisture)
        // High humidity (>70%) = moist air = lower lapse rate
        if (humidity > 80) {
          lapseRate = 0.0055; // Very moist: -5.5°C/1000m
        } else if (humidity > 70) {
          lapseRate = 0.006; // Moist: -6.0°C/1000m
        }
        
        // FACTOR 2: Strong wind (>30 km/h) = air mixing = more uniform temp
        if (windSpeed > 30) {
          lapseRate *= 0.9; // Reduce lapse rate by 10%
        }
        
        // FACTOR 3: Night-time inversion risk (22:00-08:00, temp < 5°C)
        // In winter nights, temperature can be WARMER at altitude
        if ((hour >= 22 || hour <= 8) && baseTemp < 5) {
          // Possible inversion - reduce lapse rate significantly
          lapseRate *= 0.7;
        }
        
        const tempAdjust = -(elevationMeters - 840) * lapseRate;
        const temp = baseTemp + tempAdjust;
        
        // Freezing level (same for all elevations)
        const frz = data.hourly.freezinglevel_height?.[idx] || Math.floor(840 + (baseTemp / 0.0065));
        
        // CRITICAL: Calculate snow vs rain based on ADJUSTED temperature at THIS elevation
        // Open-Meteo gives snowfall for base elevation, but we need to recalculate
        const totalPrecip = data.hourly.precipitation[idx] || 0;
        let snowfall = 0;
        let phase = 'clear';
        
        if (totalPrecip > 0.01) {
          // Determine phase based on temperature at THIS elevation
          // Lowered threshold from 0.1mm to 0.01mm to catch light precipitation
          if (temp <= -1) {
            // All snow
            snowfall = totalPrecip * 1.0; // 1mm precip ≈ 1cm snow (10:1 ratio)
            phase = 'snow';
          } else if (temp > -1 && temp <= 2) {
            // Mixed (snow/rain transition zone)
            const snowRatio = Math.max(0, (2 - temp) / 3); // Linear interpolation
            snowfall = totalPrecip * snowRatio * 1.0;
            phase = 'mixed';
          } else {
            // All rain
            snowfall = 0;
            phase = 'rain';
          }
          
          // Debug log for first precipitation hours
          if (i < 10 && totalPrecip > 0) {
            console.log(`[SNOW CALC] Hour ${i}: Temp ${temp.toFixed(1)}°C, Precip ${totalPrecip.toFixed(2)}mm → Snow ${snowfall.toFixed(2)}cm, Phase: ${phase}`);
          }
        }
        
        forecast.push({
          time: data.hourly.time[idx],
          temperature: Math.round(temp * 10) / 10,
          precipitation: totalPrecip,
          snowfall: Math.round(snowfall * 10) / 10, // cm
          windSpeed: Math.round(data.hourly.windspeed_10m[idx] || 0),
          windDirection: data.hourly.winddirection_10m[idx] || 0,
          humidity: data.hourly.relativehumidity_2m?.[idx] || 70,
          cloudCover: data.hourly.cloudcover[idx] || 0,
          freezingLevel: Math.floor(frz),
          phase: phase,
          powderScore: 0
        });
      }
      
      // Log first hour with dynamic lapse rate details
      const firstHumidity = data.hourly.relativehumidity_2m?.[startIndex] || 70;
      const firstWind = data.hourly.windspeed_10m[startIndex] || 0;
      const firstHour = new Date(data.hourly.time[startIndex]).getHours();
      const firstBaseTemp = data.hourly.temperature_2m[startIndex];
      
      let firstLapseRate = 0.0065;
      let lapseFactors = ['Standard (-6.5°C/1000m)'];
      
      if (firstHumidity > 80) {
        firstLapseRate = 0.0055;
        lapseFactors = ['Moist air (-5.5°C/1000m)'];
      } else if (firstHumidity > 70) {
        firstLapseRate = 0.006;
        lapseFactors = ['Humid air (-6.0°C/1000m)'];
      }
      
      if (firstWind > 30) {
        firstLapseRate *= 0.9;
        lapseFactors.push('Strong wind mixing (-10%)');
      }
      
      if ((firstHour >= 22 || firstHour <= 8) && firstBaseTemp < 5) {
        firstLapseRate *= 0.7;
        lapseFactors.push('Night inversion risk (-30%)');
      }
      
      console.log('[FORECAST] Generated', forecast.length, 'hours');
      console.log('[FORECAST] Total precipitation processed:', totalPrecipProcessed.toFixed(2), 'mm');
      console.log('[FORECAST] Hours with precipitation:', hoursWithPrecip);
      console.log('[FORECAST] First 3 hours phase check:', forecast.slice(0, 3).map(f => `${f.temperature}°C → ${f.phase} (${f.snowfall}cm)`));
      console.log('[PATAGONIAN LAPSE RATE] First hour:');
      console.log('  Time:', forecast[0].time);
      console.log('  Base temp (Bariloche 840m):', firstBaseTemp, '°C');
      console.log('  Humidity:', firstHumidity, '%');
      console.log('  Wind:', firstWind, 'km/h');
      console.log('  Conditions:', lapseFactors.join(', '));
      console.log('  Final lapse rate:', (-firstLapseRate * 1000).toFixed(1), '°C/1000m');
      console.log('  Elevation:', elevation, elevationMeters, 'm');
      console.log('  Temp adjustment:', (-(elevationMeters - 840) * firstLapseRate).toFixed(1), '°C');
      console.log('  Final temp:', forecast[0].temperature, '°C');
      console.log('  FRZ:', forecast[0].freezingLevel, 'm');
      
      return forecast;
      
      } catch (error) {
        lastError = error;
        console.log(`[FORECAST] Attempt ${attempt + 1}/${maxRetries + 1} failed:`, error);
        
        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          console.error('[FORECAST ERROR] All retry attempts failed:', lastError);
          throw lastError;
        }
        // Otherwise continue to next retry
      }
    }
    
    // This should never be reached, but just in case
    throw lastError || new Error('Unknown forecast error');
  },

  async getSnowfallHistory(
    id: string,
    elevation: 'base' | 'mid' | 'summit' = 'mid',
    days: number = 5
  ): Promise<any[]> {
    try {
      // Get resort UUID first
      const resortResponse = await api.get(`/resorts/${id}`);
      const resortId = resortResponse.data.id;
      
      // Query snowfall_history table
      const { data, error } = await supabase
        .from('snowfall_history')
        .select('*')
        .eq('resort_id', resortId)
        .eq('elevation_band', elevation)
        .order('date', { ascending: false })
        .limit(days);
      
      if (error) {
        console.error('[HISTORY ERROR]', error);
        return [];
      }
      
      console.log('[HISTORY] Retrieved', data?.length || 0, 'days of snowfall history');
      
      // Map to expected format
      return (data || []).map((row: any) => {
        const date = new Date(row.date);
        return {
          date: row.date,
          dayName: date.toLocaleDateString('es-AR', { weekday: 'short' }),
          dayNumber: date.getDate(),
          month: date.toLocaleDateString('es-AR', { month: 'short' }),
          snowfall: parseFloat(row.snowfall_cm || 0),
          temperature: parseFloat(row.temperature_avg_c || 0),
        };
      });
    } catch (error) {
      console.error('Error fetching snowfall history:', error);
      return [];
    }
  },

  async getDailyForecast(
    id: string,
    elevation: 'base' | 'mid' | 'summit' = 'mid',
    days: number = 15
  ): Promise<DailyForecast[]> {
    const response = await api.get(`/resorts/${id}/forecast/daily`, {
      params: { elevation, days },
    });
    return response.data;
  },

  async getStormCrossing(
    id: string,
    hours: number = 168
  ): Promise<any> {
    const response = await api.get(`/resorts/${id}/storm-crossing`, {
      params: { hours },
    });
    return response.data;
  },

  async getSnowReality(id: string): Promise<any> {
    const response = await api.get(`/resorts/${id}/snow-reality`);
    return response.data;
  },

  async getWindImpact(id: string): Promise<any> {
    const response = await api.get(`/resorts/${id}/wind-impact`);
    return response.data;
  },

  async getBestTimeToSki(id: string, elevation: 'base' | 'mid' | 'summit' = 'mid'): Promise<any> {
    const response = await api.get(`/resorts/${id}/best-time`, {
      params: { elevation }
    });
    return response.data;
  },
};
