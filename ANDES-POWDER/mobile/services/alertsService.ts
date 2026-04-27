/**
 * Alerts Service
 * Fetches weather alerts from the backend API
 */

import api from '../config/api';

export interface Alert {
  id: string;
  title: string;
  severity: 'low' | 'moderate' | 'high' | 'extreme';
  type: 'wind' | 'rain' | 'snow' | 'storm' | 'other';
  startDate: string;
  endDate: string;
  description: string;
  affectedRegions: string[];
  isActive: boolean;
}

export interface AlertsResponse {
  success: boolean;
  count: number;
  alerts: Alert[];
}

class AlertsService {
  async getAllAlerts(): Promise<Alert[]> {
    try {
      const response = await api.get<AlertsResponse>('/alerts');
      
      if (response.data.success) {
        return response.data.alerts;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  }

  async getAlertsForRegion(region: string): Promise<Alert[]> {
    try {
      const response = await api.get<AlertsResponse>(`/alerts/region/${encodeURIComponent(region)}`);
      
      if (response.data.success) {
        return response.data.alerts;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching alerts for region:', error);
      return [];
    }
  }

  getSeverityColor(severity: Alert['severity']): string {
    switch (severity) {
      case 'low': return '#4CAF50';
      case 'moderate': return '#FF9800';
      case 'high': return '#F44336';
      case 'extreme': return '#9C27B0';
      default: return '#757575';
    }
  }

  getSeverityIcon(severity: Alert['severity']): string {
    switch (severity) {
      case 'low': return '⚠️';
      case 'moderate': return '⚠️';
      case 'high': return '🚨';
      case 'extreme': return '🔴';
      default: return 'ℹ️';
    }
  }

  getTypeIcon(type: Alert['type']): string {
    switch (type) {
      case 'wind': return '💨';
      case 'rain': return '🌧️';
      case 'snow': return '❄️';
      case 'storm': return '⛈️';
      default: return '⚠️';
    }
  }
}

export default new AlertsService();
