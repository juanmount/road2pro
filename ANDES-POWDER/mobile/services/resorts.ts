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
    
    // Fetch from Andes Powder backend which has wind gust data
    console.log('[FORECAST] Fetching from Andes Powder backend...');
    console.log('[FORECAST] Resort:', resort.slug, 'Elevation:', elevation);
    const endpoint = `/resorts/${id}/forecast/hourly`;
    console.log('[API CALL] Endpoint:', endpoint, 'Params:', { elevation, hours });
    
    const response = await api.get(endpoint, {
      params: { elevation, hours },
    });
    const data = response.data;
    
    // DEBUG: Log what backend returns
    console.log('[DEBUG] Backend response:', data);
    console.log('[DEBUG] First 3 hours hourly data:', (data.hourly || []).slice(0, 3).map((h: any) => ({
      time: h.time,
      precipitation: h.precipitation,
      phase: h.phase
    })));
    
    // Return raw data from backend - engines already processed everything
    return response.data.hourly || [];
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
        const [ry, rm, rd] = (row.date as string).split('-').map(Number);
        const date = new Date(ry, rm - 1, rd);
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
