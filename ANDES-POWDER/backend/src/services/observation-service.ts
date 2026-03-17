/**
 * Observation Service
 * Ingests real observations from resorts to calibrate forecasts
 */

import pool from '../config/database';

export interface Observation {
  resortId: string;
  observedAt: Date;
  observationType: 'temperature' | 'snowfall' | 'wind' | 'conditions';
  value: number;
  unit: string;
  elevationBand: 'base' | 'mid' | 'summit';
  source: string;
  reliability: 'high' | 'medium' | 'low';
}

export class ObservationService {
  /**
   * Record a new observation
   */
  async recordObservation(obs: Observation): Promise<void> {
    try {
      const result = await pool.query(
        `INSERT INTO observations (
          resort_id, observed_at, observation_type, value_numeric, unit,
          elevation_band, source, reliability
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          obs.resortId,
          obs.observedAt,
          obs.observationType,
          obs.value,
          obs.unit,
          obs.elevationBand,
          obs.source,
          obs.reliability
        ]
      );
      
      if (result.rows.length > 0) {
        console.log(`✓ Recorded observation: ${obs.observationType} = ${obs.value}${obs.unit} at ${obs.elevationBand} (ID: ${result.rows[0].id})`);
      } else {
        console.error(`⚠️  Observation INSERT returned no rows`);
      }
    } catch (error) {
      console.error(`✗ Failed to record observation:`, error);
      console.error(`  Data:`, obs);
      throw error;
    }
  }
  
  /**
   * Calculate temperature bias from recent observations
   */
  async calculateTemperatureBias(resortId: string, elevationBand: string): Promise<number> {
    // Get recent observations (last 7 days)
    const obsResult = await pool.query(
      `SELECT value_numeric, observed_at 
       FROM observations 
       WHERE resort_id = $1 
       AND observation_type = 'temperature'
       AND elevation_band = $2
       AND observed_at > NOW() - '7 days'::interval
       ORDER BY observed_at DESC
       LIMIT 20`,
      [resortId, elevationBand]
    );
    
    if (obsResult.rows.length === 0) {
      return 0; // No bias if no observations
    }
    
    // Get corresponding forecasts
    const biases: number[] = [];
    
    for (const obs of obsResult.rows) {
      const forecastResult = await pool.query(
        `SELECT temperature_c 
         FROM elevation_forecasts 
         WHERE resort_id = $1 
         AND elevation_band = $2
         AND valid_time BETWEEN $3::timestamptz - '1 hour'::interval 
                            AND $3::timestamptz + '1 hour'::interval
         ORDER BY ABS(EXTRACT(EPOCH FROM (valid_time - $3::timestamptz)))
         LIMIT 1`,
        [resortId, elevationBand, obs.observed_at]
      );
      
      if (forecastResult.rows.length > 0) {
        const forecastTemp = parseFloat(forecastResult.rows[0].temperature_c);
        const observedTemp = parseFloat(obs.value_numeric);
        const bias = observedTemp - forecastTemp;
        biases.push(bias);
        console.log(`  Observation: ${observedTemp}°C, Forecast: ${forecastTemp}°C, Bias: ${bias.toFixed(2)}°C`);
      }
    }
    
    if (biases.length === 0) {
      return 0;
    }
    
    // Calculate average bias
    const avgBias = biases.reduce((sum, b) => sum + b, 0) / biases.length;
    
    console.log(`Temperature bias for ${elevationBand}: ${avgBias.toFixed(2)}°C (from ${biases.length} observations)`);
    
    return avgBias;
  }
  
  /**
   * Update resort correction profile based on observations
   */
  async updateCorrectionProfile(resortId: string): Promise<void> {
    console.log(`Updating correction profile for resort ${resortId}...`);
    
    // Calculate biases for each elevation
    const baseBias = await this.calculateTemperatureBias(resortId, 'base');
    const midBias = await this.calculateTemperatureBias(resortId, 'mid');
    const summitBias = await this.calculateTemperatureBias(resortId, 'summit');
    
    if (baseBias === 0 && midBias === 0 && summitBias === 0) {
      console.log('No observations available for calibration');
      return;
    }
    
    // Get current profile
    const profileResult = await pool.query(
      `SELECT * FROM resort_correction_profiles 
       WHERE resort_id = $1 AND valid_to IS NULL
       LIMIT 1`,
      [resortId]
    );
    
    if (profileResult.rows.length === 0) {
      console.log('No correction profile found');
      return;
    }
    
    const currentProfile = profileResult.rows[0];
    
    // Update profile with new biases
    // Note: We're storing temperature bias in freezing_level_bias_m for now
    // In a full implementation, we'd add a temperature_bias_c column
    await pool.query(
      `UPDATE resort_correction_profiles 
       SET calibration_notes = $1,
           last_updated = NOW()
       WHERE id = $2`,
      [
        `Auto-calibrated on ${new Date().toISOString()}. Temperature biases: base=${baseBias.toFixed(2)}°C, mid=${midBias.toFixed(2)}°C, summit=${summitBias.toFixed(2)}°C`,
        currentProfile.id
      ]
    );
    
    console.log(`✓ Updated correction profile with observation-based calibration`);
  }
  
  /**
   * Quick method to record current conditions from resort
   */
  async recordCurrentConditions(
    resortSlug: string,
    baseTemp: number,
    midTemp?: number,
    summitTemp?: number
  ): Promise<void> {
    // Get resort ID
    const resortResult = await pool.query(
      'SELECT id FROM resorts WHERE slug = $1',
      [resortSlug]
    );
    
    if (resortResult.rows.length === 0) {
      throw new Error(`Resort ${resortSlug} not found`);
    }
    
    const resortId = resortResult.rows[0].id;
    const now = new Date();
    
    // Record base temperature
    await this.recordObservation({
      resortId,
      observedAt: now,
      observationType: 'temperature',
      value: baseTemp,
      unit: '°C',
      elevationBand: 'base',
      source: 'resort_official',
      reliability: 'high'
    });
    
    // Record mid temperature if provided
    if (midTemp !== undefined) {
      await this.recordObservation({
        resortId,
        observedAt: now,
        observationType: 'temperature',
        value: midTemp,
        unit: '°C',
        elevationBand: 'mid',
        source: 'resort_official',
        reliability: 'high'
      });
    }
    
    // Record summit temperature if provided
    if (summitTemp !== undefined) {
      await this.recordObservation({
        resortId,
        observedAt: now,
        observationType: 'temperature',
        value: summitTemp,
        unit: '°C',
        elevationBand: 'summit',
        source: 'resort_official',
        reliability: 'high'
      });
    }
    
    console.log(`✓ Recorded current conditions for ${resortSlug}`);
    
    // Update correction profile
    await this.updateCorrectionProfile(resortId);
  }
}

export const observationService = new ObservationService();
