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
      
      // Query Supabase directly
      const { data, error } = await supabase
        .from('elevation_forecasts')
        .select('*')
        .eq('resort_id', resortId)
        .eq('elevation_band', elevation)
        .order('valid_time', { ascending: true })
        .limit(hours);
      
      if (error) {
        console.error('Supabase error:', error);
        return [];
      }
      
      // Map to expected format
      return (data || []).map((row: any) => ({
        time: row.valid_time,
        temperature: parseFloat(row.temperature_c),
        precipitation: parseFloat(row.precipitation_mm || 0),
        windSpeed: parseFloat(row.wind_speed_kmh || 0),
        windDirection: row.wind_direction_deg || 0,
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
