import api from '../config/api';

export interface SAMStatus {
  level: 'very_blocked' | 'blocked' | 'normal' | 'active' | 'very_active';
  color: string;
  label: string;
  description: string;
  impactOnSnow: string;
}

export interface SAMData {
  status: SAMStatus;
  trend: 'improving' | 'worsening' | 'stable';
  trendLabel: string;
  trendDays: number | null;
  updatedAt: string;
}

export const climateService = {
  async getSAM(): Promise<SAMData> {
    const response = await api.get('/aao/current');
    return response.data;
  },
};
