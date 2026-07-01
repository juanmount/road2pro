import api from '../config/api';

export interface AAOStatus {
  level: 'very_blocked' | 'blocked' | 'neutral_positive' | 'neutral' | 'active' | 'very_active';
  color: string;
  label: string;
  description: string;
  impactOnSnow: string;
}

export interface AAODay {
  date: string;
  index: number;
}

export interface AAOData {
  current: number;
  date: string;
  trend: 'rising' | 'falling' | 'stable';
  trendDelta: number;
  status: AAOStatus;
  last14Days: AAODay[];
  updatedAt: string;
}

export const climateService = {
  async getAAO(): Promise<AAOData> {
    const response = await api.get('/aao/current');
    return response.data;
  },
};
