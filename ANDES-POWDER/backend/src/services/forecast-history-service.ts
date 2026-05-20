import pool from '../config/database';

export interface ForecastRun {
  id: string;
  resort_id: string;
  provider: string;
  model_name: string;
  issued_at: Date;
  fetched_at: Date;
  valid_from: Date;
  valid_to: Date;
  horizon_hours: number;
  fetch_status: string;
}

export interface PrecipitationTrend {
  trend: 'strengthening' | 'weakening' | 'stable';
  score: number;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
}

export class ForecastHistoryService {
  
  async getRecentRuns(
    resortId: string, 
    modelName: string, 
    limit: number = 6
  ): Promise<ForecastRun[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM forecast_runs 
         WHERE resort_id = $1 
         AND model_name = $2 
         AND fetch_status = 'success'
         ORDER BY issued_at DESC 
         LIMIT $3`,
        [resortId, modelName, limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('[ForecastHistory] Error fetching recent runs:', error);
      return [];
    }
  }

  async calculatePrecipitationTrend(
    runs: ForecastRun[],
    resortId: string
  ): Promise<PrecipitationTrend> {
    
    if (runs.length < 3) {
      return {
        trend: 'stable',
        score: 50,
        confidence: 'low',
        explanation: 'Historial insuficiente (menos de 3 corridas)'
      };
    }

    try {
      const precipitationData = await this.getHistoricalPrecipitation(runs, resortId);
      
      if (precipitationData.length < 3) {
        return {
          trend: 'stable',
          score: 50,
          confidence: 'low',
          explanation: 'Datos de precipitación insuficientes'
        };
      }

      const trend = this.analyzeTrend(precipitationData);
      const score = this.calculateTrendScore(trend);
      const confidence = this.calculateConfidence(precipitationData);

      return {
        trend: trend.direction,
        score,
        confidence,
        explanation: trend.explanation
      };

    } catch (error) {
      console.error('[ForecastHistory] Error calculating trend:', error);
      return {
        trend: 'stable',
        score: 50,
        confidence: 'low',
        explanation: 'Error al calcular tendencia'
      };
    }
  }

  private async getHistoricalPrecipitation(
    runs: ForecastRun[],
    resortId: string
  ): Promise<Array<{ runId: string; issuedAt: Date; totalPrecip: number }>> {
    
    const precipData = [];

    for (const run of runs) {
      try {
        const result = await pool.query(
          `SELECT SUM(precipitation_mm) as total_precip
           FROM elevation_forecasts
           WHERE resort_id = $1
           AND forecast_time >= NOW()
           AND forecast_time <= NOW() + INTERVAL '72 hours'
           AND created_at >= $2
           AND created_at < $2 + INTERVAL '6 hours'
           GROUP BY resort_id`,
          [resortId, run.fetched_at]
        );

        if (result.rows.length > 0) {
          precipData.push({
            runId: run.id,
            issuedAt: run.issued_at,
            totalPrecip: parseFloat(result.rows[0].total_precip) || 0
          });
        }
      } catch (error) {
        console.error(`[ForecastHistory] Error fetching precip for run ${run.id}:`, error);
      }
    }

    return precipData.sort((a, b) => a.issuedAt.getTime() - b.issuedAt.getTime());
  }

  private analyzeTrend(data: Array<{ totalPrecip: number }>): {
    direction: 'strengthening' | 'weakening' | 'stable';
    explanation: string;
    changePercent: number;
  } {
    
    if (data.length < 2) {
      return {
        direction: 'stable',
        explanation: 'Datos insuficientes',
        changePercent: 0
      };
    }

    const recent = data.slice(-3);
    const older = data.slice(0, -3);

    const recentAvg = recent.reduce((sum, d) => sum + d.totalPrecip, 0) / recent.length;
    const olderAvg = older.length > 0 
      ? older.reduce((sum, d) => sum + d.totalPrecip, 0) / older.length
      : recentAvg;

    const changePercent = olderAvg > 0 
      ? ((recentAvg - olderAvg) / olderAvg) * 100 
      : 0;

    if (changePercent > 20) {
      return {
        direction: 'strengthening',
        explanation: `Sistema fortaleciéndose: +${Math.round(changePercent)}% en últimas corridas`,
        changePercent
      };
    } else if (changePercent < -20) {
      return {
        direction: 'weakening',
        explanation: `Sistema debilitándose: ${Math.round(changePercent)}% en últimas corridas`,
        changePercent
      };
    } else {
      return {
        direction: 'stable',
        explanation: `Sistema estable: ${Math.round(Math.abs(changePercent))}% de variación`,
        changePercent
      };
    }
  }

  private calculateTrendScore(trend: {
    direction: 'strengthening' | 'weakening' | 'stable';
    changePercent: number;
  }): number {
    
    const baseScore = 50;

    if (trend.direction === 'strengthening') {
      const bonus = Math.min(50, Math.abs(trend.changePercent));
      return Math.min(100, baseScore + bonus);
    } else if (trend.direction === 'weakening') {
      const penalty = Math.min(30, Math.abs(trend.changePercent) * 0.6);
      return Math.max(20, baseScore - penalty);
    } else {
      return baseScore + Math.min(20, Math.abs(trend.changePercent) * 0.3);
    }
  }

  private calculateConfidence(
    data: Array<{ totalPrecip: number }>
  ): 'high' | 'medium' | 'low' {
    
    if (data.length < 3) return 'low';
    if (data.length < 5) return 'medium';

    const values = data.map(d => d.totalPrecip);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? (stdDev / mean) : 0;

    if (coefficientOfVariation < 0.3) return 'high';
    if (coefficientOfVariation < 0.6) return 'medium';
    return 'low';
  }
}

export const forecastHistoryService = new ForecastHistoryService();
