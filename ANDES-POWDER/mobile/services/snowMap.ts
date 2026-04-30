/**
 * Snow Depth Map Service
 * Shows current accumulated snow on ground across resorts
 * Uses Open-Meteo snow depth data (not forecast)
 */

import { resortsService } from './resorts';
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://road2pro-production.up.railway.app/api';

export interface SnowDataPoint {
  resortId: string;
  resortName: string;
  latitude: number;
  longitude: number;
  snowDepthCm: number;
  elevation: 'base' | 'mid' | 'summit';
  elevationMeters: number;
  lastUpdate: Date;
}

export interface SnowMapData {
  dataPoints: SnowDataPoint[];
  lastUpdate: Date;
  summary: {
    totalResorts: number;
    resortsWithSnow: number;
    maxSnowDepth: number;
    maxSnowResort: string;
  };
}

/**
 * Get current snow depth data for all resorts
 * Returns accumulated snow on ground for mid elevation
 */
export const getSnowMapData = async (): Promise<SnowMapData> => {
  try {
    const resorts = await resortsService.getAll();
    const dataPoints: SnowDataPoint[] = [];
    
    let maxSnowDepth = 0;
    let maxSnowResort = '';
    let resortsWithSnow = 0;

    for (const resort of resorts) {
      try {
        // Get current snow depth from backend
        const response = await axios.get(`${API_BASE_URL}/resorts/${resort.id}/snow-depth`);
        const snowDepthData = response.data.snowDepth;
        
        // Get MID elevation data (most relevant for skiing)
        const midData = snowDepthData.find((d: any) => d.elevation === 'mid');
        
        if (midData) {
          const snowDepthCm = midData.snowDepthCm;
          
          dataPoints.push({
            resortId: resort.id,
            resortName: resort.name,
            latitude: resort.latitude,
            longitude: resort.longitude,
            snowDepthCm,
            elevation: 'mid',
            elevationMeters: midData.elevationMeters,
            lastUpdate: new Date(midData.lastUpdate),
          });

          if (snowDepthCm > 0) {
            resortsWithSnow++;
          }

          if (snowDepthCm > maxSnowDepth) {
            maxSnowDepth = snowDepthCm;
            maxSnowResort = resort.name;
          }
        }
      } catch (error) {
        console.error(`Error fetching snow depth for ${resort.name}:`, error);
        // Continue with other resorts
      }
    }

    return {
      dataPoints,
      lastUpdate: new Date(),
      summary: {
        totalResorts: resorts.length,
        resortsWithSnow,
        maxSnowDepth,
        maxSnowResort,
      },
    };
  } catch (error) {
    console.error('Error fetching snow map data:', error);
    throw error;
  }
};

/**
 * Get snow intensity classification
 */
export const getSnowIntensity = (snowDepthCm: number): { label: string; color: string } => {
  if (snowDepthCm >= 100) {
    return { label: 'Excelente', color: '#10b981' }; // Green
  } else if (snowDepthCm >= 50) {
    return { label: 'Muy bueno', color: '#3b82f6' }; // Blue
  } else if (snowDepthCm >= 20) {
    return { label: 'Bueno', color: '#f59e0b' }; // Orange
  } else if (snowDepthCm > 0) {
    return { label: 'Escaso', color: '#ef4444' }; // Red
  } else {
    return { label: 'Sin nieve', color: '#64748b' }; // Gray
  }
};
