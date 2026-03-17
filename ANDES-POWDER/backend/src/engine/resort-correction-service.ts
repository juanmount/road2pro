/**
 * Resort Correction Service
 * Applies resort-specific calibrations and corrections to forecast data
 */

import pool from '../config/database';
import { Resort, ResortCorrectionProfile, ElevationBand } from '../domain/models';

export class ResortCorrectionService {
  private profileCache: Map<string, ResortCorrectionProfile> = new Map();
  
  /**
   * Get correction profile for a resort
   */
  async getCorrectionProfile(resortId: string): Promise<ResortCorrectionProfile | null> {
    // Check cache first
    if (this.profileCache.has(resortId)) {
      return this.profileCache.get(resortId)!;
    }
    
    // Load from database
    const result = await pool.query(
      `SELECT * FROM resort_correction_profiles 
       WHERE resort_id = $1 AND valid_to IS NULL 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [resortId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    const profile: ResortCorrectionProfile = {
      id: row.id,
      resortId: row.resort_id,
      name: row.name,
      precipitationBiasFactor: parseFloat(row.precipitation_bias_factor),
      snowfallBiasFactor: parseFloat(row.snowfall_bias_factor),
      snowLineOffsetM: row.snow_line_offset_m,
      warmEventPenalty: parseFloat(row.warm_event_penalty),
      freezingLevelBiasM: row.freezing_level_bias_m,
      windPenaltyProfile: {
        moderate: row.wind_moderate_threshold,
        high: row.wind_high_threshold,
        severe: row.wind_severe_threshold,
        summitMultiplier: parseFloat(row.wind_summit_multiplier)
      },
      baseAccumulationFactor: parseFloat(row.base_accumulation_factor),
      midAccumulationFactor: parseFloat(row.mid_accumulation_factor),
      summitAccumulationFactor: parseFloat(row.summit_accumulation_factor),
      liftClosureWindThreshold: row.lift_closure_wind_threshold,
      calibrationNotes: row.calibration_notes,
      lastUpdated: row.last_updated,
      validFrom: row.valid_from,
      validTo: row.valid_to
    };
    
    // Load learned temperature biases from observations
    await this.loadTemperatureBiases(profile);
    
    // Cache it
    this.profileCache.set(resortId, profile);
    
    return profile;
  }
  
  /**
   * Load learned temperature biases from recent observations
   */
  private async loadTemperatureBiases(profile: ResortCorrectionProfile): Promise<void> {
    // Get recent observations to calculate bias
    const biasResult = await pool.query(
      `SELECT 
        elevation_band,
        AVG(
          value_numeric - (
            SELECT temperature_c 
            FROM elevation_forecasts ef
            WHERE ef.resort_id = o.resort_id
            AND ef.elevation_band = o.elevation_band
            AND ef.valid_time BETWEEN o.observed_at - '1 hour'::interval 
                                  AND o.observed_at + '1 hour'::interval
            ORDER BY ABS(EXTRACT(EPOCH FROM (ef.valid_time - o.observed_at)))
            LIMIT 1
          )
        ) as avg_bias
      FROM observations o
      WHERE o.resort_id = $1
      AND o.observation_type = 'temperature'
      AND o.observed_at > NOW() - '7 days'::interval
      GROUP BY elevation_band`,
      [profile.resortId]
    );
    
    // Apply learned biases to profile
    for (const row of biasResult.rows) {
      const bias = parseFloat(row.avg_bias) || 0;
      const band = row.elevation_band;
      
      if (bias !== 0) {
        console.log(`  Learned bias for ${band}: ${bias.toFixed(2)}°C`);
        
        // Store in profile (we'll add these fields to the type)
        if (band === 'base') profile.baseAccumulationFactor *= (1 + bias * 0.01);
        if (band === 'mid') profile.midAccumulationFactor *= (1 + bias * 0.01);
        if (band === 'summit') profile.summitAccumulationFactor *= (1 + bias * 0.01);
      }
    }
  }
  
  /**
   * Apply precipitation correction
   */
  applyPrecipitationCorrection(
    precipMm: number,
    profile: ResortCorrectionProfile
  ): number {
    return precipMm * profile.precipitationBiasFactor;
  }
  
  /**
   * Apply snowfall correction based on elevation
   */
  applySnowfallCorrection(
    snowfallCm: number,
    elevationBand: ElevationBand,
    profile: ResortCorrectionProfile
  ): number {
    let factor = profile.snowfallBiasFactor;
    
    // Apply elevation-specific factor
    switch (elevationBand) {
      case 'base':
        factor *= profile.baseAccumulationFactor;
        break;
      case 'mid':
        factor *= profile.midAccumulationFactor;
        break;
      case 'summit':
        factor *= profile.summitAccumulationFactor;
        break;
    }
    
    return snowfallCm * factor;
  }
  
  /**
   * Apply freezing level correction
   */
  applyFreezingLevelCorrection(
    freezingLevelM: number,
    profile: ResortCorrectionProfile
  ): number {
    return freezingLevelM + profile.freezingLevelBiasM;
  }
  
  /**
   * Apply snow line correction
   */
  applySnowLineCorrection(
    snowLineM: number,
    profile: ResortCorrectionProfile
  ): number {
    return snowLineM + profile.snowLineOffsetM;
  }
  
  /**
   * Apply warm event penalty to powder score
   */
  applyWarmEventPenalty(
    powderScore: number,
    temperature: number,
    profile: ResortCorrectionProfile
  ): number {
    // Apply penalty if temperature is marginal (0-2°C)
    if (temperature > 0 && temperature < 2) {
      return powderScore * (1 - profile.warmEventPenalty);
    }
    return powderScore;
  }
  
  /**
   * Apply wind correction based on elevation
   */
  applyWindCorrection(
    windSpeed: number,
    elevationBand: ElevationBand,
    profile: ResortCorrectionProfile
  ): number {
    // Summit winds are typically stronger
    if (elevationBand === 'summit') {
      return windSpeed * profile.windPenaltyProfile.summitMultiplier;
    }
    return windSpeed;
  }
  
  /**
   * Check if wind speed would cause lift closures
   */
  wouldCloseLift(
    windSpeed: number,
    profile: ResortCorrectionProfile
  ): boolean {
    return windSpeed >= profile.liftClosureWindThreshold;
  }
  
  /**
   * Apply all corrections to a forecast point
   */
  async applyAllCorrections(
    resort: Resort,
    elevationBand: ElevationBand,
    data: {
      precipitation: number;
      snowfall: number;
      temperature: number;
      windSpeed: number;
      freezingLevel?: number;
      snowLine?: number;
      powderScore: number;
    }
  ): Promise<{
    precipitationCorrected: number;
    snowfallCorrected: number;
    temperatureCorrected: number;
    windSpeedCorrected: number;
    freezingLevelCorrected?: number;
    snowLineCorrected?: number;
    powderScoreCorrected: number;
    liftClosure: boolean;
  }> {
    const profile = await this.getCorrectionProfile(resort.id);
    
    // If no profile, return original values
    if (!profile) {
      return {
        precipitationCorrected: data.precipitation,
        snowfallCorrected: data.snowfall,
        temperatureCorrected: data.temperature,
        windSpeedCorrected: data.windSpeed,
        freezingLevelCorrected: data.freezingLevel,
        snowLineCorrected: data.snowLine,
        powderScoreCorrected: data.powderScore,
        liftClosure: false
      };
    }
    
    // Apply corrections
    const precipitationCorrected = this.applyPrecipitationCorrection(
      data.precipitation,
      profile
    );
    
    const snowfallCorrected = this.applySnowfallCorrection(
      data.snowfall,
      elevationBand,
      profile
    );
    
    const windSpeedCorrected = this.applyWindCorrection(
      data.windSpeed,
      elevationBand,
      profile
    );
    
    const freezingLevelCorrected = data.freezingLevel
      ? this.applyFreezingLevelCorrection(data.freezingLevel, profile)
      : undefined;
    
    const snowLineCorrected = data.snowLine
      ? this.applySnowLineCorrection(data.snowLine, profile)
      : undefined;
    
    let powderScoreCorrected = this.applyWarmEventPenalty(
      data.powderScore,
      data.temperature,
      profile
    );
    
    const liftClosure = this.wouldCloseLift(windSpeedCorrected, profile);
    
    // Further reduce score if lifts would close
    if (liftClosure) {
      powderScoreCorrected *= 0.5;
    }
    
    return {
      precipitationCorrected,
      snowfallCorrected,
      temperatureCorrected: data.temperature, // No temp correction for now
      windSpeedCorrected,
      freezingLevelCorrected,
      snowLineCorrected,
      powderScoreCorrected,
      liftClosure
    };
  }
  
  /**
   * Clear profile cache (useful for testing or when profiles are updated)
   */
  clearCache(): void {
    this.profileCache.clear();
  }
}
