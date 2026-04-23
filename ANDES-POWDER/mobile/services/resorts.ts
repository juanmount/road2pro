import api from '../config/api';
import { supabase } from '../config/supabase';
import { Resort, CurrentConditions, HourlyForecast, DailyForecast } from '../types';

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
    hours: number = 168
  ): Promise<any[]> {
    console.log('[SIMPLE] Fetching hourly forecast for', elevation);
    
    // Get resort data
    const resortResponse = await api.get(`/resorts/${id}`);
    const resort = resortResponse.data;
    
    const elevationMeters = elevation === 'base' ? resort.baseElevation : 
                           elevation === 'mid' ? resort.midElevation : 
                           resort.summitElevation;
    
    // Fetch from Open-Meteo with past_days=1 to get historical data
    // forecast_days=8 to get today + 7 future days (total 8 days forward)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${resort.latitude}&longitude=${resort.longitude}&hourly=temperature_2m,precipitation,snowfall,windspeed_10m,winddirection_10m,relativehumidity_2m,freezinglevel_height,cloudcover&forecast_days=8&past_days=1&timezone=auto&models=best_match`;
    
    console.log('[SIMPLE] Calling Open-Meteo...');
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('[SIMPLE] Got', data.hourly.time.length, 'hours from API');
    console.log('[SIMPLE] First hour:', data.hourly.time[0]);
    console.log('[SIMPLE] Last hour:', data.hourly.time[data.hourly.time.length - 1]);
    console.log('[SIMPLE] Freezing level samples:', {
      first: data.hourly.freezinglevel_height[0],
      mid: data.hourly.freezinglevel_height[Math.floor(data.hourly.time.length / 2)],
      last: data.hourly.freezinglevel_height[data.hourly.time.length - 1]
    });
    
    // Start from index 0 to process ALL hours including past_days data
    // This ensures we get yesterday and today's data
    const startIndex = 0;
    
    console.log('[SIMPLE] Starting from index 0 to include all historical data');
    
    // Process hours
    const forecast = [];
    let totalPrecip = 0;
    let totalSnow = 0;
    
    for (let i = 0; i < hours && (startIndex + i) < data.hourly.time.length; i++) {
      const idx = startIndex + i;
      
      const baseTemp = data.hourly.temperature_2m[idx];
      const precip = data.hourly.precipitation[idx] || 0;
      
      // Adjust temperature for elevation (-6.5°C per 1000m)
      const tempAdjust = -(elevationMeters - 840) * 0.0065;
      const temp = baseTemp + tempAdjust;
      
      // Calculate snow based on adjusted temperature
      let snowfall = 0;
      let phase = 'clear';
      
      if (precip > 0.01) {
        if (temp <= -1) {
          // All snow
          snowfall = precip * 1.0;
          phase = 'snow';
        } else if (temp > -1 && temp <= 2) {
          // Mixed
          const snowRatio = (2 - temp) / 3;
          snowfall = precip * snowRatio * 1.0;
          phase = 'mixed';
        } else {
          // Rain
          snowfall = 0;
          phase = 'rain';
        }
        
        totalPrecip += precip;
        totalSnow += snowfall;
        
        if (i < 5) {
          const freezing = data.hourly.freezinglevel_height[idx];
          console.log(`[SIMPLE] Hour ${i}: ${temp.toFixed(1)}°C, ${precip.toFixed(2)}mm → ${snowfall.toFixed(2)}cm ${phase}, Freezing: ${freezing}m`);
        }
      }
      
      forecast.push({
        time: data.hourly.time[idx],
        temperature: Math.round(temp * 10) / 10,
        precipitation: precip,
        snowfall: Math.round(snowfall * 10) / 10,
        windSpeed: Math.round(data.hourly.windspeed_10m[idx] || 0),
        windDirection: data.hourly.winddirection_10m[idx] || 0,
        humidity: data.hourly.relativehumidity_2m[idx] || 70,
        cloudCover: data.hourly.cloudcover[idx] || 0,
        freezingLevel: Math.floor(data.hourly.freezinglevel_height[idx] || 2000),
        phase: phase,
        powderScore: 0
      });
    }
    
    console.log('[SIMPLE] Processed', forecast.length, 'hours');
    console.log('[SIMPLE] Total precip:', totalPrecip.toFixed(2), 'mm');
    console.log('[SIMPLE] Total snow:', totalSnow.toFixed(2), 'cm');
    
    return forecast;
  },

  async getSnowfallHistory(
    id: string,
    elevation: 'base' | 'mid' | 'summit' = 'mid',
    days: number = 5
  ): Promise<any[]> {
    try {
      const resortResponse = await api.get(`/resorts/${id}`);
      const resortId = resortResponse.data.id;
      
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

  async getStormCrossing(id: string, hours: number = 168): Promise<any> {
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
