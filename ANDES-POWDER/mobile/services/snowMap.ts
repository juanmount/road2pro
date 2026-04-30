/**
 * Snow Accumulation Map Service
 * Generates visual map of snow accumulation across resorts
 * Uses Andes Powder's unique Snow Reality Engine data
 */

import { resortsService } from './resorts';

export interface SnowDataPoint {
  resortId: string;
  resortName: string;
  latitude: number;
  longitude: number;
  snowfall24h: number;
  snowfall48h: number;
  snowfall7d: number;
  elevation: 'base' | 'mid' | 'summit';
  elevationMeters: number;
  timestamp: Date;
}

export interface SnowMapData {
  dataPoints: SnowDataPoint[];
  lastUpdate: Date;
  summary: {
    totalResorts: number;
    resortsWithSnow: number;
    maxSnowfall24h: number;
    maxSnowfallResort: string;
  };
}

/**
 * Get snow accumulation data for all resorts
 * Returns data for base, mid, and summit elevations
 */
export const getSnowMapData = async (): Promise<SnowMapData> => {
  try {
    const resorts = await resortsService.getAll();
    const dataPoints: SnowDataPoint[] = [];
    
    let maxSnowfall = 0;
    let maxSnowfallResort = '';
    let resortsWithSnow = 0;

    for (const resort of resorts) {
      // Get forecast for each elevation
      const elevations: Array<{ band: 'base' | 'mid' | 'summit'; meters: number }> = [
        { band: 'base', meters: resort.baseElevation },
        { band: 'mid', meters: Math.round((resort.baseElevation + resort.summitElevation) / 2) },
        { band: 'summit', meters: resort.summitElevation },
      ];

      for (const { band, meters } of elevations) {
        try {
          // Get hourly forecast for upcoming 48 hours
          const hourlyData = await resortsService.getHourlyForecast(resort.id, band, 48);
          
          if (!hourlyData || hourlyData.length === 0) continue;

          // Calculate forward accumulations from now
          const snowfall24h = hourlyData
            .slice(0, 24)
            .reduce((sum: number, h: any) => sum + (h.snowfall || 0), 0);

          const snowfall48h = hourlyData
            .slice(0, 48)
            .reduce((sum: number, h: any) => sum + (h.snowfall || 0), 0);

          // Get 7-day forecast
          const dailyData = await resortsService.getDailyForecast(resort.id, band, 7);
          const snowfall7d = dailyData?.reduce((sum: number, d: any) => sum + (d.snowfall || 0), 0) || 0;

          const now = new Date();

          dataPoints.push({
            resortId: resort.id,
            resortName: resort.name,
            latitude: resort.latitude,
            longitude: resort.longitude,
            snowfall24h,
            snowfall48h,
            snowfall7d,
            elevation: band,
            elevationMeters: meters,
            timestamp: now,
          });

          // Track max snowfall
          if (snowfall24h > maxSnowfall) {
            maxSnowfall = snowfall24h;
            maxSnowfallResort = resort.name;
          }

          if (snowfall24h > 0) {
            resortsWithSnow++;
          }
        } catch (error) {
          console.error(`[SnowMap] Error getting data for ${resort.name} ${band}:`, error);
        }
      }
    }

    return {
      dataPoints,
      lastUpdate: new Date(),
      summary: {
        totalResorts: resorts.length,
        resortsWithSnow: Math.floor(resortsWithSnow / 3), // Divide by 3 elevations
        maxSnowfall24h: maxSnowfall,
        maxSnowfallResort,
      },
    };
  } catch (error) {
    console.error('[SnowMap] Error generating snow map data:', error);
    throw error;
  }
};

/**
 * Get snow intensity level for visualization
 * Returns color code based on accumulation
 */
export const getSnowIntensity = (snowfall: number): {
  level: 'none' | 'light' | 'moderate' | 'heavy' | 'extreme';
  color: string;
  label: string;
} => {
  if (snowfall === 0) {
    return { level: 'none', color: '#64748b', label: 'Sin nieve' };
  } else if (snowfall < 5) {
    return { level: 'light', color: '#93c5fd', label: 'Ligera' };
  } else if (snowfall < 15) {
    return { level: 'moderate', color: '#60a5fa', label: 'Moderada' };
  } else if (snowfall < 30) {
    return { level: 'heavy', color: '#3b82f6', label: 'Fuerte' };
  } else {
    return { level: 'extreme', color: '#1e40af', label: 'Extrema' };
  }
};

/**
 * Get resort ranking by snowfall
 */
export const getResortRanking = async (
  period: '24h' | '48h' | '7d' = '24h'
): Promise<Array<{ resortName: string; snowfall: number; elevation: string }>> => {
  const data = await getSnowMapData();
  
  const field = period === '24h' ? 'snowfall24h' : period === '48h' ? 'snowfall48h' : 'snowfall7d';
  
  return data.dataPoints
    .filter(p => p.elevation === 'summit') // Use summit data for ranking
    .map(p => ({
      resortName: p.resortName,
      snowfall: p[field],
      elevation: `${p.elevationMeters}m`,
    }))
    .sort((a, b) => b.snowfall - a.snowfall);
};

/**
 * Get snow forecast trend
 * Returns whether snow is increasing or decreasing
 */
export const getSnowTrend = (dataPoint: SnowDataPoint): 'increasing' | 'stable' | 'decreasing' => {
  const { snowfall24h, snowfall48h } = dataPoint;
  
  // Compare last 24h vs previous 24h
  const previous24h = snowfall48h - snowfall24h;
  
  if (snowfall24h > previous24h * 1.2) return 'increasing';
  if (snowfall24h < previous24h * 0.8) return 'decreasing';
  return 'stable';
};

export default {
  getSnowMapData,
  getSnowIntensity,
  getResortRanking,
  getSnowTrend,
};
