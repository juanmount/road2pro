/**
 * Score Calculator
 * Calculates powder score, skiability score, and wind impact
 */

import { WindImpact, SnowQuality } from '../domain/models';
import { powderScoreCalculator } from '../services/powder-score';

export class ScoreCalculator {
  /**
   * Calculate powder score (0-10) - Using improved algorithm
   */
  calculatePowderScore(
    snowfall24h: number,
    temperature: number,
    windSpeed: number,
    freezeQuality: string,
    options?: {
      snowfall6h?: number;
      snowfall12h?: number;
      snowfall48h?: number;
      windGust?: number;
      cloudCover?: number;
      freezingLevel?: number;
      elevation?: number;
      precipitationType?: 'snow' | 'rain' | 'mixed' | 'none';
    }
  ): number {
    return powderScoreCalculator.calculate({
      snowfall24h,
      snowfall48h: options?.snowfall48h || 0,
      snowfall6h: options?.snowfall6h,
      snowfall12h: options?.snowfall12h,
      temperature,
      overnightMinTemp: temperature - 2, // Approximate if not provided
      windSpeed,
      windGust: options?.windGust || windSpeed * 1.3,
      precipitationType: options?.precipitationType || 'snow',
      cloudCover: options?.cloudCover,
      freezingLevel: options?.freezingLevel,
      elevation: options?.elevation
    });
  }
  
  /**
   * Calculate skiability score (0-10)
   */
  calculateSkiabilityScore(
    powderScore: number,
    windImpact: WindImpact,
    visibility: number
  ): number {
    let score = powderScore;
    
    // Wind penalty
    if (windImpact === 'severe') score -= 3;
    else if (windImpact === 'high') score -= 2;
    else if (windImpact === 'moderate') score -= 1;
    
    // Visibility penalty (if available)
    if (visibility < 1000) score -= 2;
    else if (visibility < 3000) score -= 1;
    
    return Math.max(0, Math.min(10, score));
  }
  
  /**
   * Determine wind impact
   */
  determineWindImpact(windSpeed: number, windGust: number): WindImpact {
    const effectiveWind = Math.max(windSpeed, windGust * 0.7);
    
    if (effectiveWind >= 70) return 'severe';
    if (effectiveWind >= 50) return 'high';
    if (effectiveWind >= 30) return 'moderate';
    if (effectiveWind >= 15) return 'low';
    return 'none';
  }
  
  /**
   * Classify snow quality
   */
  classifySnowQuality(
    temperature: number,
    windSpeed: number,
    snowfall: number
  ): SnowQuality {
    if (temperature > 2) return 'wet';
    if (windSpeed > 50) return 'compact';
    if (temperature <= -5 && windSpeed < 30) return 'powder';
    if (snowfall > 20) return 'heavy';
    return 'compact';
  }
}
