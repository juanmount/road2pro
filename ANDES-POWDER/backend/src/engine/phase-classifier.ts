/**
 * Phase Classifier
 * Determines if precipitation falls as snow, rain, or mixed
 * Uses wet bulb temperature for more accurate phase determination
 */

import { PhaseResult, PrecipitationPhase } from '../domain/models';
import { calculateWetBulbTemperature, determinePrecipitationPhase } from '../utils/meteorology';

export class PhaseClassifier {
  /**
   * Classify precipitation phase based on wet bulb temperature and freezing level
   * Uses Catedral's operational threshold of -2.5°C wet bulb for technical snow
   */
  classifyPrecipitation(
    temp: number,
    freezingLevel: number,
    elevation: number,
    precipMm: number,
    humidity: number = 70
  ): PhaseResult {
    // If no precipitation, return 'none'
    if (precipMm < 0.1) {
      return {
        phase: 'none',
        confidence: 'high',
        snowRatio: 0.0
      };
    }
    
    // Calculate wet bulb temperature for more accurate phase determination
    const wetBulb = calculateWetBulbTemperature(temp, humidity);
    
    // Use wet bulb temperature to determine phase
    const phase = determinePrecipitationPhase(wetBulb, freezingLevel, elevation);
    
    // Determine confidence and snow ratio based on phase and margins
    const margin = freezingLevel - elevation;
    
    if (phase === 'snow') {
      // High confidence if wet bulb well below -2.5°C or well below freezing level
      if (wetBulb < -5 || margin < -200) {
        return { phase: 'snow', confidence: 'high', snowRatio: 1.0 };
      }
      // Medium confidence if marginal
      return { phase: 'snow', confidence: 'medium', snowRatio: 0.9 };
    }
    
    if (phase === 'rain') {
      // High confidence if wet bulb well above 0°C or well above freezing level
      if (wetBulb > 2 || margin > 200) {
        return { phase: 'rain', confidence: 'high', snowRatio: 0.0 };
      }
      // Medium confidence if marginal - still rain, no snow
      return { phase: 'rain', confidence: 'medium', snowRatio: 0.0 };
    }
    
    if (phase === 'mixed') {
      // Mixed precipitation - calculate transition ratio
      const snowRatio = this.calculateWetBulbTransitionRatio(wetBulb, margin);
      return { 
        phase: 'mixed', 
        confidence: 'low', 
        snowRatio 
      };
    }
    
    // Fallback (should not reach here)
    return { phase: 'none', confidence: 'low', snowRatio: 0.0 };
  }
  
  /**
   * Calculate snow ratio in transition zone based on wet bulb temperature
   * Wet bulb between -2.5°C and 0°C is the critical mixed zone
   */
  private calculateWetBulbTransitionRatio(wetBulb: number, elevationMargin: number): number {
    // Primary factor: wet bulb temperature
    // -2.5°C to 0°C is the transition zone
    let ratio = 0.5;
    
    if (wetBulb < -2.5) {
      ratio = 1.0;
    } else if (wetBulb < -1.25) {
      // -2.5°C to -1.25°C: mostly snow
      ratio = 0.75 + (0.25 * (-1.25 - wetBulb) / 1.25);
    } else if (wetBulb < 0) {
      // -1.25°C to 0°C: transitioning to rain
      ratio = 0.5 + (0.25 * (0 - wetBulb) / 1.25);
    } else {
      // Above 0°C wet bulb: mostly rain
      ratio = Math.max(0, 0.5 - (wetBulb * 0.25));
    }
    
    // Secondary factor: elevation margin
    // Adjust ratio based on position relative to freezing level
    if (elevationMargin < -100) {
      ratio = Math.min(1.0, ratio + 0.2); // Boost snow ratio if well below freezing level
    } else if (elevationMargin > 300) {
      // Well above freezing level (>300m) = no snow
      ratio = 0.0;
    } else if (elevationMargin > 150) {
      // 150-300m above = minimal snow (max 10%)
      ratio = Math.min(0.1, ratio * 0.2);
    } else if (elevationMargin > 50) {
      // 50-150m above = reduced snow
      ratio = Math.max(0.0, ratio - 0.4);
    }
    
    return Math.max(0, Math.min(1, ratio));
  }
  
  /**
   * Calculate snow ratio in transition zone
   */
  private calculateTransitionRatio(
    freezingLevel: number,
    elevation: number,
    margin: number
  ): number {
    const diff = freezingLevel - elevation;
    const ratio = 0.5 + (diff / (margin * 2));
    return Math.max(0, Math.min(1, ratio));
  }
  
  /**
   * Estimate snow line from freezing level
   */
  estimateSnowLine(
    freezingLevel: number,
    temperature: number,
    humidity: number
  ): number {
    // Snow line typically 200-400m below freezing level
    const baseOffset = 300;
    
    // Adjust based on humidity (drier = higher snow line)
    const humidityAdjust = (humidity - 70) * 2;
    
    // Adjust based on temperature
    const tempAdjust = temperature > 0 ? temperature * 50 : 0;
    
    return freezingLevel - baseOffset + humidityAdjust + tempAdjust;
  }
  
  /**
   * Classify phase based on snow ratio
   * Note: This should only be called if there IS precipitation
   */
  classifyPhase(snowRatio: number): PrecipitationPhase {
    if (snowRatio >= 0.9) return 'snow';
    if (snowRatio >= 0.5) return 'mixed';
    if (snowRatio >= 0.1) return 'sleet';
    if (snowRatio === 0 && snowRatio !== undefined) return 'none';
    return 'rain';
  }
}
