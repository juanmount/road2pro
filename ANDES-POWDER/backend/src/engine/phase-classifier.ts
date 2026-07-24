/**
 * Phase Classifier
 * Determines if precipitation falls as snow, rain, or mixed
 * Uses wet bulb temperature for more accurate phase determination
 */

import { PhaseResult, PrecipitationPhase } from '../domain/models';
import { calculateWetBulbTemperature, determinePrecipitationPhase } from '../utils/meteorology';
import { FEATURES } from '../config/features';

export class PhaseClassifier {
  /**
   * Classify precipitation phase based on wet bulb temperature and freezing level
   * Uses Catedral's operational threshold of -2.5°C wet bulb for technical snow
   * Optionally uses T850 (temperature at 850 hPa) for better phase determination
   */
  classifyPrecipitation(
    temp: number,
    freezingLevel: number,
    elevation: number,
    precipMm: number,
    humidity: number = 70,
    temperature850hPa?: number
  ): PhaseResult {
    // If no precipitation, return 'none'
    if (precipMm < 0.1) {
      return {
        phase: 'none',
        confidence: 'high',
        snowRatio: 0.0
      };
    }
    
    // NEW: Use T850 if feature flag is enabled and data is available
    if (FEATURES.USE_T850 && typeof temperature850hPa === 'number') {
      const result = this.classifyWithT850(temp, temperature850hPa, freezingLevel, elevation, humidity);
      return this.applySafetyOverride(result, temp);
    }
    
    // LEGACY: Calculate wet bulb temperature for more accurate phase determination
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
        return this.applySafetyOverride({ phase: 'rain', confidence: 'high', snowRatio: 0.0 }, temp);
      }
      // Medium confidence if marginal - still rain, no snow
      return this.applySafetyOverride({ phase: 'rain', confidence: 'medium', snowRatio: 0.0 }, temp);
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
   * Universal safety override: local temperature below 0°C cannot produce liquid rain.
   * Covers warm-T850 / high-FRZ cases where the model sees warm air aloft but the
   * mountain surface is below freezing (pre-frontal inversions, cold summit layers).
   */
  private applySafetyOverride(result: PhaseResult, surfaceTemp: number): PhaseResult {
    if (result.phase === 'rain' && surfaceTemp < 0) {
      if (surfaceTemp < -2) {
        return { phase: 'snow', confidence: 'medium', snowRatio: 0.9 };
      }
      return { phase: 'mixed', confidence: 'medium', snowRatio: 0.6 };
    }
    return result;
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
  
  /**
   * NEW: Classify precipitation using T850 (temperature at 850 hPa ~1500m)
   * T850 is a better indicator of cold air mass than surface temperature
   * Helps detect snow at summit even when base is warm (inversion)
   */
  private classifyWithT850(
    surfaceTemp: number,
    t850: number,
    freezingLevel: number,
    elevation: number,
    humidity: number
  ): PhaseResult {
    const margin = freezingLevel - elevation;
    
    // PRIORITY 1: Strong elevation signal (same as determinePrecipitationPhase)
    // If clearly below freezing level, it's snow regardless of T850
    if (margin < -200) {
      return { phase: 'snow', confidence: 'high', snowRatio: 1.0 };
    }
    
    // If clearly above freezing level AND local temperature is warm, it's rain.
    // If local temperature is below 0°C despite high FRZ (pre-frontal inversion),
    // precipitation cannot be liquid — classify as snow or mixed.
    if (margin > 300) {
      if (surfaceTemp >= 0) return { phase: 'rain', confidence: 'high', snowRatio: 0.0 };
      if (surfaceTemp < -2) return { phase: 'snow', confidence: 'medium', snowRatio: 0.9 };
      return { phase: 'mixed', confidence: 'medium', snowRatio: 0.6 };
    }
    
    // PRIORITY 2: T850 thresholds for marginal cases
    // Based on meteorological research for mountain precipitation
    const T850_SNOW_THRESHOLD = -8;    // Below -8°C at 850hPa = strong cold air mass
    const T850_MIXED_THRESHOLD = -3;   // -8°C to -3°C = transition zone
    const T850_RAIN_THRESHOLD = 2;     // Above 2°C = warm air mass
    
    // Strong cold air mass (T850 < -8°C) — snow regardless of margin
    if (t850 < T850_SNOW_THRESHOLD) {
      return { phase: 'snow', confidence: 'high', snowRatio: 1.0 };
    }
    
    // Warm air mass
    if (t850 > T850_RAIN_THRESHOLD) {
      if (margin > 200 || surfaceTemp > 3) {
        return { phase: 'rain', confidence: 'high', snowRatio: 0.0 };
      }
      // Marginal case - mostly rain
      return { phase: 'rain', confidence: 'medium', snowRatio: 0.0 };
    }
    
    // Transition zone: -8°C to 2°C at 850hPa
    // Use combination of T850, surface temp, and elevation margin
    if (t850 < T850_MIXED_THRESHOLD) {
      // -8°C to -3°C at 850hPa: cold air mass dominates
      // Physics: T850=-5°C at ~1500m → lapse rate implies ~-2°C at 1030m base
      // Even with FRZ slightly above the base, the cold column produces snow
      if (margin < 350) {
        const highConf = t850 < -5 || margin < 0;
        return { phase: 'snow', confidence: highConf ? 'high' : 'medium', snowRatio: 1.0 };
      }
      // Base is far below FRZ (>350m) — use transition ratio
      const snowRatio = this.calculateT850TransitionRatio(t850, surfaceTemp, margin);
      return { phase: 'mixed', confidence: 'low', snowRatio };
    } else {
      // -3°C to 2°C: Transition to rain
      // But still check elevation margin
      if (margin < -100) {
        return { phase: 'snow', confidence: 'medium', snowRatio: 0.9 };
      }
      if (margin > 200) {
        return { phase: 'rain', confidence: 'high', snowRatio: 0.0 };
      }
      if (margin > 50) {
        return { phase: 'rain', confidence: 'medium', snowRatio: 0.1 };
      }
      // Mixed conditions
      const snowRatio = this.calculateT850TransitionRatio(t850, surfaceTemp, margin);
      return { phase: 'mixed', confidence: 'low', snowRatio };
    }
  }
  
  /**
   * Calculate snow ratio in T850 transition zone
   * Combines T850, surface temperature, and elevation margin
   */
  private calculateT850TransitionRatio(
    t850: number,
    surfaceTemp: number,
    elevationMargin: number
  ): number {
    // Base ratio from T850 (-8°C to 2°C range)
    let ratio = 0.5;
    
    if (t850 < -5) {
      ratio = 0.8; // Cold air mass, favor snow
    } else if (t850 < -1) {
      ratio = 0.6; // Moderate, slight snow favor
    } else if (t850 < 1) {
      ratio = 0.4; // Warming, favor rain
    } else {
      ratio = 0.2; // Warm, mostly rain
    }
    
    // Adjust based on surface temperature
    if (surfaceTemp < -2) {
      ratio += 0.2; // Cold surface boosts snow
    } else if (surfaceTemp > 2) {
      ratio -= 0.3; // Warm surface reduces snow
    }
    
    // Adjust based on elevation margin
    if (elevationMargin < -200) {
      ratio = Math.min(1.0, ratio + 0.3); // Well below freezing level
    } else if (elevationMargin > 200) {
      ratio = Math.max(0.0, ratio - 0.5); // Well above freezing level
    }
    
    return Math.max(0, Math.min(1, ratio));
  }
}
