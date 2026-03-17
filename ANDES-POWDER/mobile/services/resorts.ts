import api from '../config/api';
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
    const response = await api.get(`/resorts/${id}/forecast/hourly`, {
      params: { elevation, hours },
    });
    return response.data.hourly || [];
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
