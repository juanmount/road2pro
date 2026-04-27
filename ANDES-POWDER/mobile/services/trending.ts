import api from '../config/api';

export interface TrendingData {
  date: string;
  currentSnowfall: number;
  yesterdaySnowfall: number;
  change: number;
  changePercent: number;
  trend: 'increase' | 'decrease' | 'stable';
}

export interface TrendingResponse {
  success: boolean;
  resortId: string;
  elevation: string;
  trending: TrendingData[];
}

class TrendingService {
  /**
   * Get forecast trending data for a resort
   */
  async getTrending(
    resortId: string,
    elevation: 'base' | 'mid' | 'summit' = 'mid',
    days: number = 7
  ): Promise<TrendingData[]> {
    try {
      const response = await api.get<TrendingResponse>(
        `/trending/${resortId}?elevation=${elevation}&days=${days}`
      );
      
      return response.data.trending || [];
    } catch (error) {
      console.error('Error fetching trending data:', error);
      return [];
    }
  }

  /**
   * Get trending for a specific date
   */
  getTrendingForDate(trending: TrendingData[], date: string): TrendingData | null {
    return trending.find(t => t.date === date) || null;
  }

  /**
   * Format trending message for display
   */
  formatTrendingMessage(data: TrendingData): string {
    if (data.trend === 'stable') return '';
    
    const direction = data.trend === 'increase' ? '↑' : '↓';
    const absChange = Math.abs(data.change);
    const absPercent = Math.abs(data.changePercent);
    
    if (absChange < 1) return ''; // Don't show for tiny changes
    
    return `${direction} ${absChange.toFixed(1)}cm (${absPercent.toFixed(0)}%)`;
  }

  /**
   * Get emoji for trend
   */
  getTrendEmoji(trend: 'increase' | 'decrease' | 'stable'): string {
    switch (trend) {
      case 'increase': return '📈';
      case 'decrease': return '📉';
      default: return '';
    }
  }
}

export default new TrendingService();
