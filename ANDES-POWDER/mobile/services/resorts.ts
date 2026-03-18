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
    hours: number = 24
  ): Promise<any> {
    try {
      // Get resort UUID first
      const resortResponse = await api.get(`/resorts/${id}`);
      const resortId = resortResponse.data.id;
      
      // Query Supabase directly - only get future forecasts from most recent run
      const now = new Date().toISOString();
      console.log('[SUPABASE QUERY] Fetching forecast for resort:', resortId, 'elevation:', elevation, 'from:', now);
      
      // First, get the most recent forecast run ID
      const { data: latestRun } = await supabase
        .from('elevation_forecasts')
        .select('forecast_run_id, created_at')
        .eq('resort_id', resortId)
        .eq('elevation_band', elevation)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!latestRun || latestRun.length === 0) {
        console.log('[SUPABASE] No forecast runs found');
        return [];
      }
      
      const latestRunId = latestRun[0].forecast_run_id;
      console.log('[SUPABASE] Using forecast run:', latestRunId, 'created:', latestRun[0].created_at);
      
      // Now get all future forecasts from that run
      const { data, error } = await supabase
        .from('elevation_forecasts')
        .select('*')
        .eq('resort_id', resortId)
        .eq('elevation_band', elevation)
        .eq('forecast_run_id', latestRunId)
        .gte('valid_time', now)
        .order('valid_time', { ascending: true })
        .limit(hours);
      
      if (error) {
        console.error('[SUPABASE ERROR]', error);
        return [];
      }
      
      console.log('[SUPABASE RESULT] Received', data?.length || 0, 'rows');
      if (data && data.length > 0) {
        console.log('[SUPABASE SAMPLE] First row:', {
          time: data[0].valid_time,
          temp: data[0].temperature_c,
          wind: data[0].wind_speed_kmh,
          snow: data[0].snowfall_cm_corrected
        });
      }
      
      // Map to expected format
      return (data || []).map((row: any) => ({
        time: row.valid_time,
        temperature: parseFloat(row.temperature_c),
        precipitation: parseFloat(row.precipitation_mm || 0),
        windSpeed: parseFloat(row.wind_speed_kmh || 0),
        windDirection: row.wind_direction || 0,
        humidity: 70,
        cloudCover: parseFloat(row.cloud_cover || 0),
        phase: row.snowfall_cm_corrected > 0 ? 'snow' : row.precipitation_mm > 0 ? 'rain' : 'none',
        powderScore: parseFloat(row.powder_score || 0),
        snowfall: parseFloat(row.snowfall_cm_corrected || 0),
        freezingLevel: row.freezing_level_m ? parseInt(row.freezing_level_m) : 2000,
      }));
    } catch (error) {
      console.error('Error fetching hourly forecast from Supabase:', error);
      return [];
    }
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
};
