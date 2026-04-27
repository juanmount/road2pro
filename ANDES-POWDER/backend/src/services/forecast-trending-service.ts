import pool from '../config/database';

interface ForecastSnapshot {
  resortId: string;
  elevationBand: string;
  forecastDate: string;
  snapshotDate: string;
  snowfallCm: number;
  precipitationMm: number;
  maxTempC: number;
  minTempC: number;
  maxWindKmh: number;
}

interface TrendingData {
  date: string;
  currentSnowfall: number;
  yesterdaySnowfall: number;
  change: number;
  changePercent: number;
  trend: 'increase' | 'decrease' | 'stable';
}

export class ForecastTrendingService {
  /**
   * Save daily forecast snapshot for trending analysis
   */
  async saveDailySnapshot(resortId: string): Promise<void> {
    try {
      console.log(`[TRENDING] Saving snapshot for resort ${resortId}`);

      // Get next 7 days of forecasts for all elevations
      const elevations = ['base', 'mid', 'summit'];
      
      for (const elevation of elevations) {
        const result = await pool.query(
          `SELECT 
            DATE(valid_time) as forecast_date,
            SUM(snowfall_cm_corrected) as total_snowfall,
            SUM(precipitation_mm) as total_precipitation,
            MAX(temperature_c) as max_temp,
            MIN(temperature_c) as min_temp,
            MAX(wind_speed_kmh) as max_wind
          FROM elevation_forecasts
          WHERE resort_id = $1
            AND elevation_band = $2
            AND valid_time >= CURRENT_DATE
            AND valid_time < CURRENT_DATE + INTERVAL '7 days'
          GROUP BY DATE(valid_time)
          ORDER BY forecast_date`,
          [resortId, elevation]
        );

        // Insert snapshots
        for (const row of result.rows as any[]) {
          await pool.query(
            `INSERT INTO forecast_snapshots 
              (resort_id, elevation_band, forecast_date, snapshot_date, 
               snowfall_cm, precipitation_mm, max_temp_c, min_temp_c, max_wind_kmh)
            VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8)
            ON CONFLICT (resort_id, elevation_band, forecast_date, snapshot_date)
            DO UPDATE SET
              snowfall_cm = $4,
              precipitation_mm = $5,
              max_temp_c = $6,
              min_temp_c = $7,
              max_wind_kmh = $8`,
            [
              resortId,
              elevation,
              row.forecast_date,
              row.total_snowfall || 0,
              row.total_precipitation || 0,
              row.max_temp,
              row.min_temp,
              row.max_wind
            ]
          );
        }
      }

      console.log(`[TRENDING] ✓ Snapshot saved for resort ${resortId}`);
    } catch (error) {
      console.error('[TRENDING] Error saving snapshot:', error);
      throw error;
    }
  }

  /**
   * Get trending data comparing today's forecast vs yesterday's
   */
  async getTrending(
    resortId: string,
    elevationBand: string,
    days: number = 7
  ): Promise<TrendingData[]> {
    try {
      const result = await pool.query(
        `WITH today_forecast AS (
          SELECT 
            forecast_date,
            snowfall_cm as current_snowfall
          FROM forecast_snapshots
          WHERE resort_id = $1
            AND elevation_band = $2
            AND snapshot_date = CURRENT_DATE
            AND forecast_date >= CURRENT_DATE
            AND forecast_date < CURRENT_DATE + INTERVAL '${days} days'
        ),
        yesterday_forecast AS (
          SELECT 
            forecast_date,
            snowfall_cm as yesterday_snowfall
          FROM forecast_snapshots
          WHERE resort_id = $1
            AND elevation_band = $2
            AND snapshot_date = CURRENT_DATE - INTERVAL '1 day'
            AND forecast_date >= CURRENT_DATE
            AND forecast_date < CURRENT_DATE + INTERVAL '${days} days'
        )
        SELECT 
          t.forecast_date::text as date,
          t.current_snowfall,
          COALESCE(y.yesterday_snowfall, t.current_snowfall) as yesterday_snowfall,
          t.current_snowfall - COALESCE(y.yesterday_snowfall, t.current_snowfall) as change,
          CASE 
            WHEN COALESCE(y.yesterday_snowfall, 0) = 0 THEN 0
            ELSE ROUND(((t.current_snowfall - COALESCE(y.yesterday_snowfall, 0)) / NULLIF(y.yesterday_snowfall, 0) * 100)::numeric, 1)
          END as change_percent
        FROM today_forecast t
        LEFT JOIN yesterday_forecast y ON t.forecast_date = y.forecast_date
        ORDER BY t.forecast_date`,
        [resortId, elevationBand]
      );

      return (result.rows as any[]).map(row => ({
        date: row.date,
        currentSnowfall: parseFloat(row.current_snowfall) || 0,
        yesterdaySnowfall: parseFloat(row.yesterday_snowfall) || 0,
        change: parseFloat(row.change) || 0,
        changePercent: parseFloat(row.change_percent) || 0,
        trend: this.getTrendCategory(parseFloat(row.change_percent) || 0)
      }));
    } catch (error) {
      console.error('[TRENDING] Error getting trending data:', error);
      return [];
    }
  }

  /**
   * Categorize trend based on percentage change
   */
  private getTrendCategory(changePercent: number): 'increase' | 'decrease' | 'stable' {
    if (changePercent > 20) return 'increase';
    if (changePercent < -20) return 'decrease';
    return 'stable';
  }

  /**
   * Save snapshots for all resorts (called by cron)
   */
  async saveAllResortsSnapshots(): Promise<void> {
    try {
      console.log('[TRENDING] Starting daily snapshot for all resorts...');

      const result = await pool.query(
        `SELECT id FROM resorts`
      );

      const resorts = result.rows as any[];
      
      for (const resort of resorts) {
        await this.saveDailySnapshot(resort.id);
      }

      console.log(`[TRENDING] ✓ Snapshots saved for ${resorts.length} resorts`);
    } catch (error) {
      console.error('[TRENDING] Error saving all snapshots:', error);
      throw error;
    }
  }
}

export const forecastTrendingService = new ForecastTrendingService();
