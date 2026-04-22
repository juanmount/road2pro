/**
 * Storm Crossing Probability Engine
 * 
 * Estimates the probability that a Pacific storm system will successfully
 * cross the Andes and generate meaningful snowfall on the Argentine side.
 * 
 * This addresses the unique challenge of Patagonian forecasting where many
 * storms appear in models but weaken or dissipate before crossing the Andes
 * due to the rain shadow effect.
 */

import { Resort, ModelAgreement, NormalizedForecast, StormCrossingProbability, CrossingCategory } from '../domain/models';
import { chileanWeatherService, ChileanStormIndicators } from '../services/chilean-weather-service';
import { observationProvider } from '../services/observation-provider';
import { ENSOService } from '../services/enso-service';


/**
 * Configuration for scoring weights
 */
interface ScoringWeights {
  modelAgreement: number;           // Default: 0.25 (reduced)
  ensembleSpread: number;           // Default: 0.15 (reduced)
  precipitationPersistence: number; // Default: 0.10 (reduced)
  freezingLevelSuitability: number; // Default: 0.05 (reduced)
  windDirectionSuitability: number; // Default: 0.10 (same)
  chileanStormIntensity: number;    // Default: 0.20 (NEW)
  chileanPressureDiff: number;      // Default: 0.15 (NEW)
}

/**
 * Historical forecast runs for persistence analysis
 */
interface ForecastRunHistory {
  runTime: Date;
  precipitation: number;
  snowfall: number;
}

/**
 * Storm Crossing Engine
 */
export class StormCrossingEngine {
  private weights: ScoringWeights = {
    modelAgreement: 0.25,
    ensembleSpread: 0.15,
    precipitationPersistence: 0.10,
    freezingLevelSuitability: 0.05,
    windDirectionSuitability: 0.10,
    chileanStormIntensity: 0.20,
    chileanPressureDiff: 0.15,
  };
  
  private ensoService = new ENSOService();
  
  /**
   * Compute storm crossing probability for a specific time point
   */
  async computeCrossingProbability(
    resort: Resort,
    validTime: Date,
    ecmwf: NormalizedForecast | undefined,
    gfs: NormalizedForecast | undefined,
    gefs: NormalizedForecast | undefined,
    modelAgreement: ModelAgreement | undefined,
    forecastHistory?: ForecastRunHistory[]
  ): Promise<StormCrossingProbability> {
    
    // Get real observed conditions for validation
    const observed = await observationProvider.getLatestTemperatures(resort.id);
    let observedFreezingLevel: number | null = null;
    
    if (observed) {
      observedFreezingLevel = observationProvider.calculateFreezingLevel(observed, {
        base: resort.baseElevation,
        mid: resort.midElevation,
        summit: resort.summitElevation
      });
    }
    
    // Fetch Chilean storm indicators
    const chileanIndicators = await chileanWeatherService.getStormIndicators();
    
    // Calculate component scores
    const modelAgreementScore = this.calculateModelAgreementScore(modelAgreement);
    const ensembleSpreadScore = this.calculateEnsembleSpreadScore(gefs, validTime);
    const persistenceScore = this.calculatePrecipitationPersistence(forecastHistory);
    const freezingLevelScore = this.calculateFreezingLevelSuitability(resort, ecmwf, gfs, validTime, observedFreezingLevel);
    const windDirectionScore = this.calculateWindDirectionSuitability(ecmwf, gfs, validTime);
    const precipBiasScore = this.calculatePrecipitationBias(ecmwf, gfs, validTime);
    
    // Calculate Chilean-based scores
    const chileanStormScore = this.calculateChileanStormIntensity(chileanIndicators);
    const chileanPressureScore = this.calculateChileanPressureDifferential(chileanIndicators, ecmwf, gfs);
    
    // Calculate weighted total score (including Chilean data)
    const totalScore = Math.round(
      modelAgreementScore * this.weights.modelAgreement +
      ensembleSpreadScore * this.weights.ensembleSpread +
      persistenceScore * this.weights.precipitationPersistence +
      freezingLevelScore * this.weights.freezingLevelSuitability +
      windDirectionScore * this.weights.windDirectionSuitability +
      chileanStormScore * this.weights.chileanStormIntensity +
      chileanPressureScore * this.weights.chileanPressureDiff
    );
    
    // Apply precipitation bias penalty
    let finalScore = Math.max(0, Math.min(100, totalScore - (100 - precipBiasScore) * 0.2));
    
    // Apply ENSO adjustment
    try {
      const ensoData = await this.ensoService.getCurrentENSOData();
      finalScore = Math.round(finalScore * ensoData.stormMultiplier);
      finalScore = Math.max(0, Math.min(100, finalScore));
    } catch (error) {
      console.warn('Failed to apply ENSO adjustment to storm crossing:', error);
      // Continue without ENSO adjustment
    }
    
    // Determine category
    const category = this.determineCategory(finalScore);
    
    // Generate explanation
    const explanation = this.generateExplanation(
      finalScore,
      modelAgreementScore,
      ensembleSpreadScore,
      persistenceScore,
      freezingLevelScore,
      windDirectionScore,
      precipBiasScore,
      chileanStormScore,
      chileanPressureScore
    );
    
    return {
      score: finalScore,
      category,
      explanation,
      components: {
        modelAgreement: modelAgreementScore,
        ensembleSpread: ensembleSpreadScore,
        precipitationPersistence: persistenceScore,
        freezingLevelSuitability: freezingLevelScore,
        windDirectionSuitability: windDirectionScore,
        precipitationBias: precipBiasScore,
        chileanStormIntensity: chileanStormScore,
        chileanPressureDiff: chileanPressureScore,
      },
      validTime,
      computedAt: new Date(),
    };
  }
  
  /**
   * Calculate model agreement score (0-100)
   * High agreement between ECMWF and GFS increases confidence
   */
  private calculateModelAgreementScore(agreement: ModelAgreement | undefined): number {
    if (!agreement) return 50; // Neutral if no agreement data
    
    // ModelAgreement.confidenceScore is 0-10, convert to 0-100
    return agreement.confidenceScore * 10;
  }
  
  /**
   * Calculate ensemble spread score (0-100)
   * Low spread = high confidence, high spread = low confidence
   */
  private calculateEnsembleSpreadScore(
    gefs: NormalizedForecast | undefined,
    validTime: Date
  ): number {
    if (!gefs) return 50; // Neutral if no ensemble data
    
    // Find the time point in GEFS
    const timePoint = gefs.mid.find(p => p.time.getTime() === validTime.getTime());
    if (!timePoint) return 50;
    
    // GEFS provides ensemble spread in precipitation
    // Low spread (< 5mm) = high confidence (80-100)
    // Medium spread (5-15mm) = medium confidence (40-80)
    // High spread (> 15mm) = low confidence (0-40)
    
    const spread = timePoint.precipitation || 0; // Simplified - should use actual spread metric
    
    if (spread < 5) return 90;
    if (spread < 15) return 60;
    return 30;
  }
  
  /**
   * Calculate precipitation persistence score (0-100)
   * Decreasing precipitation across runs = degrading storm = lower score
   */
  private calculatePrecipitationPersistence(
    history: ForecastRunHistory[] | undefined
  ): number {
    if (!history || history.length < 2) return 70; // Neutral if no history
    
    // Analyze trend across last 3-4 runs
    const recent = history.slice(-4);
    
    // Calculate trend: increasing = positive, decreasing = negative
    let trend = 0;
    for (let i = 1; i < recent.length; i++) {
      const change = recent[i].precipitation - recent[i - 1].precipitation;
      trend += change;
    }
    
    // Normalize trend
    const avgPrecip = recent.reduce((sum, r) => sum + r.precipitation, 0) / recent.length;
    const normalizedTrend = avgPrecip > 0 ? (trend / avgPrecip) : 0;
    
    // Convert to score
    // Strong increase (+50% or more) = 100
    // Stable (±10%) = 70
    // Strong decrease (-50% or more) = 20
    
    if (normalizedTrend > 0.5) return 100;
    if (normalizedTrend > 0.1) return 85;
    if (normalizedTrend > -0.1) return 70;
    if (normalizedTrend > -0.5) return 40;
    return 20;
  }
  
  /**
   * Calculate freezing level suitability (0-100)
   * Freezing level relative to resort elevations
   * Uses observed freezing level if available for validation
   */
  private calculateFreezingLevelSuitability(
    resort: Resort,
    ecmwf: NormalizedForecast | undefined,
    gfs: NormalizedForecast | undefined,
    validTime: Date,
    observedFreezingLevel?: number | null
  ): number {
    const forecast = ecmwf || gfs;
    if (!forecast) return 50;
    
    const timePoint = forecast.mid.find(p => p.time.getTime() === validTime.getTime());
    if (!timePoint) return 50;
    
    // Use observed freezing level if available and recent, otherwise use forecast
    const freezingLevel = observedFreezingLevel || timePoint.freezingLevel || 0;
    
    if (observedFreezingLevel) {
      console.log(`    Using observed freezing level: ${observedFreezingLevel}m (forecast: ${timePoint.freezingLevel}m)`);
    }
    
    // Optimal: freezing level between base and mid elevation
    // Good: freezing level below summit
    // Poor: freezing level above summit
    
    if (freezingLevel < resort.baseElevation) return 95; // Deep cold, excellent
    if (freezingLevel < resort.midElevation) return 85;  // Cold, very good
    if (freezingLevel < resort.summitElevation) return 60; // Marginal at summit
    if (freezingLevel < resort.summitElevation + 500) return 30; // Rain at summit
    return 10; // All rain
  }
  
  /**
   * Calculate wind direction suitability (0-100)
   * W/WNW/NW flow = optimal for Pacific moisture and Andes crossing
   * Based on Patagonian meteorology: westerly winds bring moisture from Pacific
   */
  private calculateWindDirectionSuitability(
    ecmwf: NormalizedForecast | undefined,
    gfs: NormalizedForecast | undefined,
    validTime: Date
  ): number {
    const forecast = ecmwf || gfs;
    if (!forecast) return 50;
    
    const timePoint = forecast.mid.find(p => p.time.getTime() === validTime.getTime());
    if (!timePoint) return 50;
    
    const windDirection = timePoint.windDirection || 0;
    
    // Use meteorology utility for Patagonian-specific wind direction scoring
    // Returns 0.0-1.0, convert to 0-100 scale
    const { scoreWindDirectionForSnow } = require('../utils/meteorology');
    const directionScore = scoreWindDirectionForSnow(windDirection);
    
    // Convert to 0-100 scale with appropriate range
    // 1.0 (optimal W/WNW/NW) = 95
    // 0.7 (good westerly) = 75
    // 0.5 (moderate) = 50
    // 0.3 (poor easterly) = 30
    const score = 30 + (directionScore * 65);
    
    return Math.round(score);
  }
  
  /**
   * Calculate precipitation bias (0-100)
   * Detects rain shadow: heavy precip west of Andes, weak east
   */
  private calculatePrecipitationBias(
    ecmwf: NormalizedForecast | undefined,
    gfs: NormalizedForecast | undefined,
    validTime: Date
  ): number {
    // This would require Chilean side forecast data
    // For now, return neutral score
    // Future: compare precipitation at Chilean resorts vs Argentine resorts
    
    return 70; // Neutral - no bias detected
  }
  
  /**
   * Calculate Chilean storm intensity score (0-100)
   * Based on Pacific storm characteristics on Chilean side
   */
  private calculateChileanStormIntensity(
    indicators: ChileanStormIndicators | null
  ): number {
    if (!indicators) return 50; // Neutral if no Chilean data
    
    // Convert storm intensity to score
    switch (indicators.pacificStormIntensity) {
      case 'extreme': return 95;
      case 'high': return 80;
      case 'medium': return 60;
      case 'low': return 30;
      default: return 50;
    }
  }
  
  /**
   * Calculate Chilean-Argentine pressure differential score (0-100)
   * Strong pressure gradient favors storm crossing
   */
  private calculateChileanPressureDifferential(
    indicators: ChileanStormIndicators | null,
    ecmwf: NormalizedForecast | undefined,
    gfs: NormalizedForecast | undefined
  ): number {
    if (!indicators) return 50; // Neutral if no Chilean data
    
    // Falling pressure on Chilean side indicates active storm
    // This increases crossing probability
    if (indicators.pressureTrend === 'falling') {
      return 85; // High probability - active storm system
    } else if (indicators.pressureTrend === 'stable') {
      return 60; // Moderate - stable conditions
    } else {
      return 40; // Lower probability - high pressure building
    }
  }
  
  /**
   * Determine crossing category from score
   */
  private determineCategory(score: number): CrossingCategory {
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }
  
  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    totalScore: number,
    modelAgreement: number,
    ensembleSpread: number,
    persistence: number,
    freezingLevel: number,
    windDirection: number,
    precipBias: number,
    chileanStorm: number,
    chileanPressure: number
  ): string {
    const factors: string[] = [];
    
    // Positive factors
    if (modelAgreement >= 70) factors.push('strong model agreement');
    if (ensembleSpread >= 70) factors.push('low ensemble spread');
    if (persistence >= 70) factors.push('consistent forecast signal');
    if (freezingLevel >= 70) factors.push('favorable freezing level');
    if (windDirection >= 70) factors.push('westerly flow pattern');
    if (chileanStorm >= 70) factors.push('strong Pacific storm on Chilean side');
    if (chileanPressure >= 70) factors.push('favorable pressure gradient');
    
    // Negative factors
    if (modelAgreement < 40) factors.push('models disagree');
    if (ensembleSpread < 40) factors.push('high forecast uncertainty');
    if (persistence < 40) factors.push('weakening across runs');
    if (freezingLevel < 40) factors.push('freezing level too high');
    if (windDirection < 40) factors.push('unfavorable wind direction');
    if (precipBias < 50) factors.push('precipitation bias toward Chilean side');
    
    if (factors.length === 0) {
      return 'Moderate confidence in storm crossing';
    }
    
    return factors.join(', ') + '.';
  }
  
  /**
   * Batch compute crossing probabilities for multiple time points
   */
  async computeBatchCrossingProbabilities(
    resort: Resort,
    ecmwf: NormalizedForecast | undefined,
    gfs: NormalizedForecast | undefined,
    gefs: NormalizedForecast | undefined,
    modelAgreements: ModelAgreement[],
    forecastHistory?: Map<string, ForecastRunHistory[]>
  ): Promise<StormCrossingProbability[]> {
    const results: StormCrossingProbability[] = [];
    
    // Process each model agreement time point
    for (const agreement of modelAgreements) {
      const history = forecastHistory?.get(agreement.validTime.toISOString());
      
      const probability = await this.computeCrossingProbability(
        resort,
        agreement.validTime,
        ecmwf,
        gfs,
        gefs,
        agreement,
        history
      );
      
      results.push(probability);
    }
    
    return results;
  }
}
