/**
 * Score Calculator
 * Calculates powder score, skiability score, and wind impact
 */

import { WindImpact, SnowQuality } from '../domain/models';

export class ScoreCalculator {
  /**
   * Calculate powder score (0-10)
   */
  calculatePowderScore(
    snowfall24h: number,
    temperature: number,
    windSpeed: number,
    freezeQuality: string
  ): number {
    let score = 0;
    
    // Snowfall component (0-5 points)
    if (snowfall24h >= 30) score += 5;
    else if (snowfall24h >= 20) score += 4;
    else if (snowfall24h >= 10) score += 3;
    else if (snowfall24h >= 5) score += 2;
    else if (snowfall24h >= 2) score += 1;
    
    // Temperature component (0-2 points)
    if (temperature <= -5) score += 2;
    else if (temperature <= 0) score += 1;
    else if (temperature > 2) score -= 1;
    
    // Wind component (0-2 points)
    if (windSpeed < 15) score += 2;
    else if (windSpeed < 30) score += 1;
    else if (windSpeed > 50) score -= 1;
    
    // Freeze quality component (0-1 point)
    if (freezeQuality === 'excellent' || freezeQuality === 'good') {
      score += 1;
    }
    
    return Math.max(0, Math.min(10, score));
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
