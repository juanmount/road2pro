/**
 * Confidence Service
 * Calculates confidence scores based on model agreement and ensemble spread
 */

import { NormalizedForecast, ConfidenceScore, ModelAgreement, ElevationBand } from '../domain/models';

export class ConfidenceService {
  /**
   * Calculate confidence for a specific time point and elevation
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
        reason: 'Insufficient model data available'
      };
    }
    
    // Calculate snowfall agreement
    const snowfallAgreement = this.calculateSnowfallAgreement(
      ecmwfData?.snowfall,
      gfsData?.snowfall,
      gefsData?.snowfall
    );
    
    // Calculate temperature agreement
    const tempAgreement = this.calculateTemperatureAgreement(
      ecmwfData?.temperature,
      gfsData?.temperature
    );
    
    // Calculate freezing level agreement
    const freezingAgreement = this.calculateFreezingLevelAgreement(
      ecmwfData?.freezingLevel,
      gfsData?.freezingLevel
    );
    
    // Overall agreement (weighted average)
    const overallAgreement = (
      snowfallAgreement * 0.5 +  // Snowfall is most important
      tempAgreement * 0.3 +       // Temperature is important
      freezingAgreement * 0.2     // Freezing level matters for phase
    );
    
    // Ensemble spread penalty (if GEFS available)
    const spreadPenalty = gefsData ? this.calculateSpreadPenalty(gefsData) : 0;
    
    // Time horizon penalty (further out = less confident)
    const hoursOut = timeIndex; // Assuming hourly data
    const horizonPenalty = Math.min(hoursOut / 168, 0.3); // Max 30% penalty at 7 days
    
    // Calculate final confidence score (0-10)
    const baseConfidence = overallAgreement;
    const adjusted = baseConfidence * (1 - spreadPenalty * 0.3) * (1 - horizonPenalty);
    const score = Math.max(0, Math.min(10, adjusted * 10));
    
    // Generate reason
    const reason = this.generateConfidenceReason(
      score,
      overallAgreement,
      spreadPenalty,
      horizonPenalty
    );
    
    return {
      score,
      agreement: overallAgreement,
      spread: spreadPenalty,
      horizon: horizonPenalty,
      reason
    };
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
   * Generate human-readable confidence reason
   */
  private generateConfidenceReason(
    score: number,
    agreement: number,
    spread: number,
    horizon: number
  ): string {
    const reasons: string[] = [];
    
    // Overall confidence level
    if (score >= 8) {
      reasons.push('High confidence');
    } else if (score >= 6) {
      reasons.push('Good confidence');
    } else if (score >= 4) {
      reasons.push('Moderate confidence');
    } else {
      reasons.push('Low confidence');
    }
    
    // Model agreement
    if (agreement >= 0.9) {
      reasons.push('excellent model agreement');
    } else if (agreement >= 0.7) {
      reasons.push('good model agreement');
    } else if (agreement >= 0.5) {
      reasons.push('fair model agreement');
    } else {
      reasons.push('models disagree');
    }
    
    // Ensemble spread
    if (spread > 0.3) {
      reasons.push('high ensemble uncertainty');
    }
    
    // Time horizon
    if (horizon > 0.2) {
      reasons.push('long forecast horizon');
    }
    
    return reasons.join(', ');
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
