/**
 * Forecast Service - New Multi-Model Architecture
 * Replaces old forecast-processor with SnowEngine
 */

import { SnowEngine } from '../engine/snow-engine';
import { OpenMeteoProvider } from '../providers/open-meteo/adapter';
import { providerRegistry } from '../providers/registry';
import pool from '../config/database';
import { Resort } from '../domain/models';

class ForecastService {
  private snowEngine: SnowEngine;
  private initialized = false;
  
  constructor() {
    // Initialize providers
    const openMeteo = new OpenMeteoProvider();
    providerRegistry.register(openMeteo);
    
    // Initialize snow engine with all registered providers
    this.snowEngine = new SnowEngine([openMeteo]);
    this.initialized = true;
    
    console.log('✓ Forecast Service initialized with multi-model support');
  }
  
  /**
   * Process forecast for a single resort using new architecture
   */
  async processResortForecast(resort: Resort): Promise<void> {
    if (!this.initialized) {
      throw new Error('Forecast Service not initialized');
    }
    
    try {
      console.log(`Processing forecast for ${resort.name} with SnowEngine...`);
      
      // Use new SnowEngine to process forecast
      const processed = await this.snowEngine.processResortForecast(resort);
      
      // Store results in new schema
      await this.storeForecastResults(processed);
      
      console.log(`✓ Forecast processed for ${resort.name}`);
    } catch (error) {
      console.error(`Error processing forecast for ${resort.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Process all resorts
   */
  async processAllResorts(): Promise<void> {
    // STEP 1: Clean old data BEFORE syncing to prevent duplicates
    console.log('Cleaning old forecast data (older than 1 day)...');
    try {
      const cleanResult = await pool.query(`
        DELETE FROM elevation_forecasts 
        WHERE valid_time < NOW() - INTERVAL '1 day'
      `);
      console.log(`✓ Cleaned ${cleanResult.rowCount} old forecast rows`);
    } catch (error) {
      console.error('Warning: Failed to clean old data:', error);
      // Continue anyway
    }
    
    // STEP 2: Get resorts and process forecasts
    const result = await pool.query('SELECT * FROM resorts ORDER BY name');
    const resorts = result.rows.map(this.mapResortFromDb);
    
    console.log(`Processing forecasts for ${resorts.length} resorts...`);
    
    for (const resort of resorts) {
      try {
        await this.processResortForecast(resort);
      } catch (error) {
        console.error(`Failed to process ${resort.name}:`, error);
        // Continue with other resorts
      }
    }
    
    console.log('All resort forecasts processed');
    
    // Save yesterday's snowfall to history
    console.log('Saving snowfall history for yesterday...');
    for (const resort of resorts) {
      try {
        await this.saveYesterdaySnowfall(resort);
      } catch (error) {
        console.error(`Failed to save history for ${resort.name}:`, error);
      }
    }
    console.log('Snowfall history saved');
  }
  
  /**
   * Save yesterday's snowfall to history table
   */
  private async saveYesterdaySnowfall(resort: Resort): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Get yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);
      
      // Get yesterday's snowfall for each elevation from elevation_forecasts
      const elevations = ['base', 'mid', 'summit'];
      
      for (const elevation of elevations) {
        const result = await client.query(
          `SELECT 
            SUM(snowfall_cm_corrected) as total_snowfall,
            AVG(temperature_c) as avg_temp
          FROM elevation_forecasts
          WHERE resort_id = $1
            AND elevation_band = $2
            AND valid_time >= $3
            AND valid_time <= $4
            AND created_at >= NOW() - INTERVAL '2 days'
          GROUP BY resort_id, elevation_band`,
          [resort.id, elevation, yesterday.toISOString(), yesterdayEnd.toISOString()]
        );
        
        if (result.rows.length > 0 && result.rows[0].total_snowfall !== null) {
          const snowfall = parseFloat(result.rows[0].total_snowfall) || 0;
          const avgTemp = parseFloat(result.rows[0].avg_temp);
          
          // Insert or update history (upsert)
          await client.query(
            `INSERT INTO snowfall_history (
              resort_id, elevation_band, date, snowfall_cm, temperature_avg_c
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (resort_id, elevation_band, date)
            DO UPDATE SET 
              snowfall_cm = EXCLUDED.snowfall_cm,
              temperature_avg_c = EXCLUDED.temperature_avg_c,
              created_at = NOW()`,
            [resort.id, elevation, yesterday.toISOString().split('T')[0], snowfall, avgTemp]
          );
          
          console.log(`  ✓ Saved ${elevation} history: ${snowfall.toFixed(1)} cm for ${resort.name}`);
        }
      }
    } catch (error) {
      console.error(`Error saving snowfall history for ${resort.name}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Store forecast results in new schema
   */
  private async storeForecastResults(processed: any): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // CRITICAL: Delete existing forecasts for this resort to prevent duplicates
      const deleteResult = await client.query(
        `DELETE FROM elevation_forecasts WHERE resort_id = $1`,
        [processed.resort.id]
      );
      console.log(`  ✓ Deleted ${deleteResult.rowCount} existing forecasts for ${processed.resort.name}`);
      
      // Create forecast run record
      const runResult = await client.query(
        `INSERT INTO forecast_runs (
          resort_id, provider, model_name, issued_at, fetched_at,
          valid_from, valid_to, horizon_hours, fetch_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          processed.resort.id,
          'open-meteo',
          'ecmwf-ifs',
          processed.issuedAt,
          new Date(),
          processed.issuedAt,
          new Date(processed.issuedAt.getTime() + 15 * 24 * 60 * 60 * 1000),
          360, // 15 days
          'success'
        ]
      );
      
      const forecastRunId = runResult.rows[0].id;
      console.log(`  ✓ Created forecast run ${forecastRunId}`);
      
      // Store elevation forecasts (up to 168 hours / 7 days)
      const allForecasts = [
        ...processed.base.slice(0, 168),
        ...processed.mid.slice(0, 168),
        ...processed.summit.slice(0, 168)
      ];
      
      for (const forecast of allForecasts) {
        await client.query(
          `INSERT INTO elevation_forecasts (
            forecast_run_id, resort_id, elevation_band, elevation_meters,
            valid_time, forecast_hour,
            temperature_c, apparent_temp_c, precipitation_mm, snowfall_cm_raw,
            wind_speed_kmh, wind_gust_kmh, wind_direction, humidity, cloud_cover, pressure_msl,
            cloud_cover_low, cloud_cover_mid, cloud_cover_high,
            freezing_level_m, snow_line_m,
            visibility, visibility_meters, in_cloud, cloud_base_meters,
            snowfall_cm_corrected, phase_classification, snow_quality,
            powder_score, skiability_score, wind_impact,
            confidence_score, data_source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)`,
          [
            forecastRunId,
            forecast.resortId,
            forecast.elevationBand,
            forecast.elevationMeters,
            forecast.validTime,
            forecast.forecastHour,
            forecast.temperatureC,
            forecast.apparentTempC,
            forecast.precipitationMm,
            forecast.snowfallCmRaw,
            forecast.windSpeedKmh,
            forecast.windGustKmh,
            forecast.windDirection || null,
            forecast.humidity,
            forecast.cloudCover,
            forecast.pressure,
            forecast.cloudCoverLow || null,
            forecast.cloudCoverMid || null,
            forecast.cloudCoverHigh || null,
            forecast.freezingLevelM ? Math.round(forecast.freezingLevelM) : null,
            forecast.snowLineM ? Math.round(forecast.snowLineM) : null,
            forecast.visibility || null,
            forecast.visibilityMeters || null,
            forecast.inCloud || false,
            forecast.cloudBaseMeters || null,
            forecast.snowfallCmCorrected,
            forecast.phaseClassification,
            forecast.snowQuality,
            forecast.powderScore,
            forecast.skiabilityScore,
            forecast.windImpact,
            forecast.confidenceScore,
            forecast.dataSource
          ]
        );
      }
      console.log(`  ✓ Stored ${allForecasts.length} elevation forecasts`);
      
      // Store model agreements
      if (processed.modelAgreement && processed.modelAgreement.length > 0) {
        for (const agreement of processed.modelAgreement) {
          await client.query(
            `INSERT INTO model_agreements (
              resort_id, valid_time, elevation_band,
              ecmwf_snowfall_cm, gfs_snowfall_cm,
              ecmwf_freezing_level_m, gfs_freezing_level_m,
              gefs_snowfall_mean, gefs_snowfall_stddev,
              gefs_snowfall_min, gefs_snowfall_max,
              snowfall_agreement, freezing_level_agreement, overall_agreement,
              confidence_score, confidence_reason
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [
              agreement.resortId,
              agreement.validTime,
              agreement.elevationBand,
              agreement.ecmwfSnowfallCm,
              agreement.gfsSnowfallCm,
              agreement.ecmwfFreezingLevelM,
              agreement.gfsFreezingLevelM,
              agreement.gefsSnowfallMean,
              agreement.gefsSnowfallStdDev,
              agreement.gefsSnowfallMin,
              agreement.gefsSnowfallMax,
              agreement.snowfallAgreement,
              agreement.freezingLevelAgreement,
              agreement.overallAgreement,
              agreement.confidenceScore,
              agreement.confidenceReason
            ]
          );
        }
        console.log(`  ✓ Stored ${processed.modelAgreement.length} model agreements`);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Map database row to Resort domain model
   */
  private mapResortFromDb(row: any): Resort {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      country: row.country,
      region: row.region,
      town: row.town || row.region,
      baseElevation: row.base_elevation,
      midElevation: row.mid_elevation,
      summitElevation: row.summit_elevation,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      timezone: row.timezone || 'America/Argentina/Buenos_Aires',
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

// Singleton instance
export const forecastService = new ForecastService();
