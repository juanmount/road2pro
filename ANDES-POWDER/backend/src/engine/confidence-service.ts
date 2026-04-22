/**
 * Confidence Service
 * Calculates confidence scores based on model agreement and ensemble spread
 */

import { NormalizedForecast, ConfidenceScore, ModelAgreement, ElevationBand } from '../domain/models';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export class ConfidenceService {
  /**
   * Get confidence category from score
   */
  getConfidenceLevel(score: number): ConfidenceLevel {
    if (score >= 7.5) return 'HIGH';
    if (score >= 5.0) return 'MEDIUM';
    return 'LOW';
  }
  
  /**
   * Calculate confidence for a specific time point and elevation
   * Returns score 0-10 and category (HIGH/MEDIUM/LOW)
   */
  calculateConfidence(
    ecmwf: NormalizedForecast | undefined,
    gfs: NormalizedForecast | undefined,
    gefs: NormalizedForecast | undefined,
    timeIndex: number,
    elevationBand: ElevationBand
  ): ConfidenceScore {
    // Extract data for the specific elevation band
    const ecmwfData = ecmwf?.[elevationBand]?.[timeIndex];
    const gfsData = gfs?.[elevationBand]?.[timeIndex];
    const gefsData = gefs?.[elevationBand]?.[timeIndex];
    
    // If no data available, return low confidence
    if (!ecmwfData && !gfsData) {
      return {
        score: 3,
        agreement: 0,
        spread: 1,
        horizon: 0,
        reason: 'Datos insuficientes'
      };
    }
    
    // 1. Model Agreement (50% weight) - Most important
    const snowfallAgreement = this.calculateSnowfallAgreement(
      ecmwfData?.snowfall,
      gfsData?.snowfall,
      gefsData?.snowfall
    );
    
    const tempAgreement = this.calculateTemperatureAgreement(
      ecmwfData?.temperature,
      gfsData?.temperature
    );
    
    const freezingAgreement = this.calculateFreezingLevelAgreement(
      ecmwfData?.freezingLevel,
      gfsData?.freezingLevel
    );
    
    // Weighted model agreement
    const modelAgreement = (
      snowfallAgreement * 0.5 +  // Snowfall is most critical
      tempAgreement * 0.3 +       // Temperature affects phase
      freezingAgreement * 0.2     // Freezing level for snow/rain
    );
    
    // 2. Lead Time Factor (30% weight)
    // Confidence degrades with forecast horizon
    const hoursOut = timeIndex;
    const leadTimeFactor = this.calculateLeadTimeFactor(hoursOut);
    
    // 3. Ensemble Spread (20% weight) - if available
    const ensembleSpreadFactor = gefsData ? this.calculateEnsembleSpreadFactor(gefsData) : 0.8;
    
    // 4. Calculate final confidence (0-1 scale)
    const confidenceRaw = (
      modelAgreement * 0.50 +
      leadTimeFactor * 0.30 +
      ensembleSpreadFactor * 0.20
    );
    
    // Convert to 0-10 scale
    const score = Math.max(0, Math.min(10, confidenceRaw * 10));
    
    // Generate human-readable reason
    const reason = this.generateConfidenceReason(
      score,
      modelAgreement,
      leadTimeFactor,
      ensembleSpreadFactor,
      hoursOut
    );
    
    return {
      score,
      agreement: modelAgreement,
      spread: 1 - ensembleSpreadFactor,
      horizon: 1 - leadTimeFactor,
      reason
    };
  }
  
  /**
   * Calculate lead time factor (1.0 = near term, 0.0 = far future)
   */
  private calculateLeadTimeFactor(hoursOut: number): number {
    // Confidence degradation curve
    // 0-24h: 1.0 (excellent)
    // 24-48h: 0.9 (very good)
    // 48-72h: 0.8 (good)
    // 72-120h: 0.7 (fair)
    // 120-168h: 0.6 (moderate)
    // 168h+: 0.5 (low)
    
    if (hoursOut <= 24) return 1.0;
    if (hoursOut <= 48) return 0.9;
    if (hoursOut <= 72) return 0.8;
    if (hoursOut <= 120) return 0.7;
    if (hoursOut <= 168) return 0.6;
    return 0.5;
  }
  
  /**
   * Calculate ensemble spread factor (1.0 = tight spread, 0.0 = wide spread)
   */
  private calculateEnsembleSpreadFactor(gefsData: any): number {
    // TODO: Implement when GEFS ensemble members are available
    // For now, return neutral factor
    return 0.8;
  }
  
  /**
   * Calculate snowfall agreement between models
   */
  private calculateSnowfallAgreement(
    ecmwf?: number,
    gfs?: number,
    gefs?: number
  ): number {
    if (ecmwf === undefined && gfs === undefined) return 0.5;
    if (ecmwf === undefined || gfs === undefined) return 0.7;
    
    // Both models have data - compare them
    const maxSnow = Math.max(ecmwf, gfs);
    const minSnow = Math.min(ecmwf, gfs);
    
    // If both predict no snow, high agreement
    if (maxSnow < 0.5) return 1.0;
    
    // Calculate relative difference
    const diff = maxSnow - minSnow;
    const relativeDiff = diff / (maxSnow + 1); // +1 to avoid division by zero
    
    // Convert to agreement score (0-1)
    // 0% diff = 1.0 agreement, 100% diff = 0.0 agreement
    const agreement = Math.max(0, 1 - relativeDiff);
    
    // If GEFS available, factor in ensemble spread
    if (gefs !== undefined) {
      const gefsAgreement = 1 - Math.abs(gefs - ecmwf) / (ecmwf + 1);
      return (agreement + gefsAgreement) / 2;
    }
    
    return agreement;
  }
  
  /**
   * Calculate temperature agreement
   */
  private calculateTemperatureAgreement(
    ecmwf?: number,
    gfs?: number
  ): number {
    if (ecmwf === undefined || gfs === undefined) return 0.7;
    
    const diff = Math.abs(ecmwf - gfs);
    
    // Temperature differences
    // < 1°C = excellent agreement
    // < 2°C = good agreement
    // < 3°C = fair agreement
    // > 3°C = poor agreement
    if (diff < 1) return 1.0;
    if (diff < 2) return 0.9;
    if (diff < 3) return 0.7;
    if (diff < 5) return 0.5;
    return 0.3;
  }
  
  /**
   * Calculate freezing level agreement
   */
  private calculateFreezingLevelAgreement(
    ecmwf?: number,
    gfs?: number
  ): number {
    if (ecmwf === undefined || gfs === undefined) return 0.7;
    
    const diff = Math.abs(ecmwf - gfs);
    
    // Freezing level differences (in meters)
    // < 100m = excellent
    // < 200m = good
    // < 300m = fair
    // > 300m = poor
    if (diff < 100) return 1.0;
    if (diff < 200) return 0.9;
    if (diff < 300) return 0.7;
    if (diff < 500) return 0.5;
    return 0.3;
  }
  
  /**
   * Calculate ensemble spread penalty
   */
  private calculateSpreadPenalty(gefsData: any): number {
    // TODO: Implement when GEFS ensemble members are available
    // For now, return 0 (no penalty)
    return 0;
  }
  
  /**
   * Generate human-readable confidence reason in Spanish
   */
  private generateConfidenceReason(
    score: number,
    modelAgreement: number,
    leadTimeFactor: number,
    ensembleSpreadFactor: number,
    hoursOut: number
  ): string {
    // Determine confidence level
    if (score >= 7.5) {
      // HIGH confidence
      if (hoursOut <= 24) {
        return 'Alta confianza - Modelos coinciden, pronóstico de corto plazo';
      } else if (hoursOut <= 72) {
        return 'Alta confianza - Modelos coinciden';
      } else {
        return 'Buena confianza - Modelos coinciden, pero pronóstico lejano';
      }
    } else if (score >= 5.0) {
      // MEDIUM confidence
      if (modelAgreement < 0.7) {
        return 'Confianza moderada - Modelos difieren levemente';
      } else if (hoursOut > 120) {
        return 'Confianza moderada - Pronóstico muy lejano';
      } else {
        return 'Confianza moderada - Revisá más cerca de la fecha';
      }
    } else {
      // LOW confidence
      if (modelAgreement < 0.5) {
        return 'Baja confianza - Modelos no coinciden';
      } else if (hoursOut > 168) {
        return 'Baja confianza - Pronóstico demasiado lejano';
      } else {
        return 'Baja confianza - Mucha incertidumbre';
      }
    }
  }
  
  /**
   * Create ModelAgreement record for storage
   */
  createModelAgreement(
    resortId: string,
    validTime: Date,
    elevationBand: ElevationBand,
    ecmwf: NormalizedForecast | undefined,
    gfs: NormalizedForecast | undefined,
    gefs: NormalizedForecast | undefined,
    timeIndex: number
  ): ModelAgreement {
    const ecmwfData = ecmwf?.[elevationBand]?.[timeIndex];
    const gfsData = gfs?.[elevationBand]?.[timeIndex];
    const gefsData = gefs?.[elevationBand]?.[timeIndex];
    
    const confidence = this.calculateConfidence(ecmwf, gfs, gefs, timeIndex, elevationBand);
    
    return {
      id: '', // Will be generated by database
      resortId,
      validTime,
      elevationBand,
      
      ecmwfSnowfallCm: ecmwfData?.snowfall,
      gfsSnowfallCm: gfsData?.snowfall,
      ecmwfFreezingLevelM: ecmwfData?.freezingLevel,
      gfsFreezingLevelM: gfsData?.freezingLevel,
      
      gefsSnowfallMean: gefsData?.snowfall,
      gefsSnowfallStdDev: undefined, // TODO: Calculate from ensemble
      gefsSnowfallMin: undefined,
      gefsSnowfallMax: undefined,
      
      snowfallAgreement: this.calculateSnowfallAgreement(
        ecmwfData?.snowfall,
        gfsData?.snowfall,
        gefsData?.snowfall
      ),
      freezingLevelAgreement: this.calculateFreezingLevelAgreement(
        ecmwfData?.freezingLevel,
        gfsData?.freezingLevel
      ),
      overallAgreement: confidence.agreement,
      
      confidenceScore: confidence.score,
      confidenceReason: confidence.reason,
      
      createdAt: new Date()
    };
  }
}
