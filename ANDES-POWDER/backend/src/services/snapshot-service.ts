/**
 * Forecast Snapshot Service
 * Creates daily snapshots of forecasts for validation and ML training
 */

import { ForecastSnapshot, ElevationSnapshot, ValidationEvent, AccuracyMetrics } from '../domain/snapshot-models';
import pool from '../config/database';

export class SnapshotService {
  /**
   * Create a snapshot of current forecast for a resort
   */
  async createSnapshot(resortId: string, forecastDate: Date): Promise<ForecastSnapshot> {
    const snapshotDate = new Date();
    
    // Fetch current forecast from your forecast service
    const forecast = await this.getCurrentForecast(resortId, forecastDate);
    
    const snapshot: Omit<ForecastSnapshot, 'id' | 'createdAt'> = {
      resortId,
      snapshotDate,
      forecastDate,
      base: this.extractElevationData(forecast, 'base'),
      mid: this.extractElevationData(forecast, 'mid'),
      summit: this.extractElevationData(forecast, 'summit'),
      stormCrossing: forecast.stormCrossing,
      confidenceScore: forecast.confidenceScore,
      confidenceReason: forecast.confidenceReason,
    };
    
    // Save to PostgreSQL as JSON (simple and flexible)
    const result = await pool.query(
      `INSERT INTO forecast_snapshots (
        resort_id, snapshot_date, forecast_date, forecast_data
      ) VALUES ($1, $2, $3, $4)
      RETURNING id, resort_id, snapshot_date, forecast_date, forecast_data, created_at`,
      [resortId, snapshotDate, forecastDate, JSON.stringify(snapshot)]
    );
    
    const saved = result.rows[0];
    return {
      id: saved.id,
      resortId: saved.resort_id,
      snapshotDate: saved.snapshot_date,
      forecastDate: saved.forecast_date,
      ...JSON.parse(saved.forecast_data),
      createdAt: saved.created_at,
    } as ForecastSnapshot;
  }
  
  /**
   * Create snapshots for all active resorts
   * Run this daily at 6am via cron
   */
  async createDailySnapshots(): Promise<ForecastSnapshot[]> {
    // Get resorts from PostgreSQL
    const result = await pool.query('SELECT id FROM resorts ORDER BY name');
    const resorts = result.rows;
    
    if (!resorts || resorts.length === 0) return [];
    
    const snapshots: ForecastSnapshot[] = [];
    const today = new Date();
    
    // Create snapshots for today and next 7 days
    for (const resort of resorts) {
      for (let i = 0; i < 7; i++) {
        const forecastDate = new Date(today);
        forecastDate.setDate(today.getDate() + i);
        
        try {
          const snapshot = await this.createSnapshot(resort.id, forecastDate);
          snapshots.push(snapshot);
        } catch (error) {
          console.error(`Failed to create snapshot for ${resort.id} on ${forecastDate}:`, error);
        }
      }
    }
    
    return snapshots;
  }
  
  /**
   * Get snapshot for a specific date (to compare with actual)
   */
  async getSnapshot(resortId: string, forecastDate: Date): Promise<ForecastSnapshot | null> {
    const result = await pool.query(
      `SELECT * FROM forecast_snapshots
       WHERE resort_id = $1
       AND forecast_date = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [resortId, forecastDate.toISOString().split('T')[0]]
    );
    
    if (result.rows.length === 0) return null;
    return result.rows[0] as ForecastSnapshot;
  }
  
  /**
   * Create validation event (compare forecast vs actual)
   */
  async createValidation(
    resortId: string,
    eventDate: Date,
    observed: {
      base?: number;
      mid?: number;
      summit?: number;
    },
    observationType: ValidationEvent['observationType'],
    observationSource: string,
    notes?: string
  ): Promise<ValidationEvent> {
    // Get the snapshot that was made for this date
    const snapshot = await this.getSnapshot(resortId, eventDate);
    
    if (!snapshot) {
      throw new Error(`No snapshot found for ${resortId} on ${eventDate}`);
    }
    
    // Calculate accuracy
    const accuracy = this.calculateAccuracy(
      {
        base: snapshot.base.snowfall,
        mid: snapshot.mid.snowfall,
        summit: snapshot.summit.snowfall,
      },
      observed
    );
    
    const validation: Omit<ValidationEvent, 'id' | 'createdAt'> = {
      resortId,
      eventDate,
      snapshotId: snapshot.id,
      forecastedSnow: {
        base: snapshot.base.snowfall,
        mid: snapshot.mid.snowfall,
        summit: snapshot.summit.snowfall,
      },
      observedSnow: observed,
      observationType,
      observationSource,
      observationNotes: notes,
      accuracy,
    };
    
    const result = await pool.query(
      `INSERT INTO validation_events (
        resort_id, event_date, snapshot_id,
        forecasted_base_snow, forecasted_mid_snow, forecasted_summit_snow,
        observed_base_snow, observed_mid_snow, observed_summit_snow,
        observation_type, observation_source, observation_notes,
        base_error, mid_error, summit_error, overall_mae
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        resortId, eventDate, snapshot.id,
        validation.forecastedSnow.base, validation.forecastedSnow.mid, validation.forecastedSnow.summit,
        validation.observedSnow.base, validation.observedSnow.mid, validation.observedSnow.summit,
        observationType, observationSource, notes,
        accuracy.baseError, accuracy.midError, accuracy.summitError, accuracy.overallMAE
      ]
    );
    
    return result.rows[0] as ValidationEvent;
  }
  
  /**
   * Calculate accuracy metrics for a period
   */
  async calculateMetrics(
    resortId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AccuracyMetrics> {
    const result = await pool.query(
      `SELECT * FROM validation_events
       WHERE resort_id = $1
       AND event_date >= $2
       AND event_date <= $3`,
      [resortId, startDate.toISOString(), endDate.toISOString()]
    );
    
    const validations = result.rows;
    
    if (!validations || validations.length === 0) {
      throw new Error('No validation data available for this period');
    }
    
    // Calculate MAE, RMSE, bias
    const errors = {
      base: [] as number[],
      mid: [] as number[],
      summit: [] as number[],
    };
    
    validations.forEach(v => {
      if (v.accuracy?.baseError !== undefined) errors.base.push(v.accuracy.baseError);
      if (v.accuracy?.midError !== undefined) errors.mid.push(v.accuracy.midError);
      if (v.accuracy?.summitError !== undefined) errors.summit.push(v.accuracy.summitError);
    });
    
    const mae = this.calculateMAE([...errors.base, ...errors.mid, ...errors.summit]);
    const rmse = this.calculateRMSE([...errors.base, ...errors.mid, ...errors.summit]);
    const bias = this.calculateBias([...errors.base, ...errors.mid, ...errors.summit]);
    
    const metrics: AccuracyMetrics = {
      resortId,
      period: 'custom',
      startDate,
      endDate,
      totalForecasts: validations.length,
      validatedForecasts: validations.length,
      snowfallMAE: mae,
      snowfallRMSE: rmse,
      snowfallBias: bias,
      baseAccuracy: this.calculateMAE(errors.base),
      midAccuracy: this.calculateMAE(errors.mid),
      summitAccuracy: this.calculateMAE(errors.summit),
      calculatedAt: new Date(),
    };
    
    return metrics;
  }
  
  // Helper methods
  
  private async getCurrentForecast(resortId: string, date: Date): Promise<any> {
    // Get forecast from PostgreSQL database (already processed by SnowEngine)
    // Use DATE casting to match any time on the target date
    const targetDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const elevations = ['base', 'mid', 'summit'];
    const forecast: any = {};
    
    for (const elevation of elevations) {
      const result = await pool.query(
        `SELECT * FROM elevation_forecasts
         WHERE resort_id = $1
         AND elevation_band = $2
         AND valid_time::date = $3
         ORDER BY valid_time ASC`,
        [resortId, elevation, targetDate]
      );
      
      const rows = result.rows;
      
      if (rows && rows.length > 0) {
        // Aggregate daily data
        const totalSnowfall = rows.reduce((sum, r) => sum + (r.snowfall_cm_corrected || 0), 0);
        const avgTemp = rows.reduce((sum, r) => sum + (r.temperature_c || 0), 0) / rows.length;
        const maxWind = Math.max(...rows.map(r => r.wind_speed_kmh || 0));
        const maxGust = Math.max(...rows.map(r => r.wind_gust_kmh || 0));
        const avgWindDir = rows.reduce((sum, r) => sum + (r.wind_direction || 0), 0) / rows.length;
        const avgHumidity = rows.reduce((sum, r) => sum + (r.humidity || 0), 0) / rows.length;
        const avgCloud = rows.reduce((sum, r) => sum + (r.cloud_cover || 0), 0) / rows.length;
        const totalPrecip = rows.reduce((sum, r) => sum + (r.precipitation_mm || 0), 0);
        const freezingLevel = rows[0].freezing_level || 1800;
        
        forecast[elevation] = {
          snowfall: totalSnowfall,
          temperature: avgTemp,
          windSpeed: maxWind,
          windGust: maxGust,
          windDirection: avgWindDir,
          freezingLevel,
          humidity: avgHumidity,
          cloudCover: avgCloud,
          precipitation: totalPrecip,
        };
      } else {
        // No data available
        forecast[elevation] = {
          snowfall: 0,
          temperature: 0,
          windSpeed: 0,
          windGust: 0,
          windDirection: 0,
          freezingLevel: 1800,
          humidity: 0,
          cloudCover: 0,
          precipitation: 0,
        };
      }
    }
    
    // Get storm crossing data if available
    // TODO: Query storm crossing from your database if you store it
    forecast.stormCrossing = {
      score: 0,
      category: 'LOW',
      explanation: 'No storm crossing data available',
    };
    
    forecast.confidenceScore = 7.0;
    forecast.confidenceReason = 'Standard forecast';
    
    return forecast;
  }
  
  private extractElevationData(forecast: any, band: string): ElevationSnapshot {
    const data = forecast[band];
    return {
      elevation: band === 'base' ? 1030 : band === 'mid' ? 1600 : 2100,
      temperature: data.temperature,
      snowfall: data.snowfall,
      precipitation: data.precipitation,
      windSpeed: data.windSpeed,
      windGust: data.windGust,
      windDirection: data.windDirection,
      freezingLevel: data.freezingLevel,
      humidity: data.humidity,
      cloudCover: data.cloudCover,
    };
  }
  
  private calculateAccuracy(forecasted: any, observed: any): any {
    const errors: any = {};
    
    if (observed.base !== undefined) {
      errors.baseError = forecasted.base - observed.base;
    }
    if (observed.mid !== undefined) {
      errors.midError = forecasted.mid - observed.mid;
    }
    if (observed.summit !== undefined) {
      errors.summitError = forecasted.summit - observed.summit;
    }
    
    const allErrors = Object.values(errors).filter(e => e !== undefined) as number[];
    if (allErrors.length > 0) {
      errors.overallMAE = this.calculateMAE(allErrors);
    }
    
    return errors;
  }
  
  private calculateMAE(errors: number[]): number {
    if (errors.length === 0) return 0;
    return errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length;
  }
  
  private calculateRMSE(errors: number[]): number {
    if (errors.length === 0) return 0;
    const mse = errors.reduce((sum, e) => sum + e * e, 0) / errors.length;
    return Math.sqrt(mse);
  }
  
  private calculateBias(errors: number[]): number {
    if (errors.length === 0) return 0;
    return errors.reduce((sum, e) => sum + e, 0) / errors.length;
  }
}

export const snapshotService = new SnapshotService();
