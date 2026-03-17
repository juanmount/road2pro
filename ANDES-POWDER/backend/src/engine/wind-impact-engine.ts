/**
 * Wind Impact Engine
 * Analyzes wind conditions and their impact on skiing experience
 * - Adjusts wind speed by elevation
 * - Calculates wind chill (sensación térmica)
 * - Assesses lift closure risk
 * - Provides zone recommendations
 */

import { ElevationForecast } from '../domain/models';

export type WindCategory = 'CALM' | 'MODERATE' | 'STRONG' | 'EXTREME';
export type LiftRisk = 'OPEN' | 'CAUTION' | 'HIGH_RISK' | 'CLOSED';

export interface WindImpactAnalysis {
  windSpeedKmh: number;
  adjustedWindKmh: number;
  category: WindCategory;
  windChill: number;
  liftRisk: LiftRisk;
  skiability: number; // 0-100 score
  recommendation: string;
  warnings: string[];
}

export interface WindImpactForecast {
  validTime: string;
  elevation: 'base' | 'mid' | 'summit';
  elevationMeters: number;
  analysis: WindImpactAnalysis;
}

export class WindImpactEngine {
  /**
   * Analyze wind impact for a forecast period
   */
  analyzeWindImpact(
    forecast: ElevationForecast,
    elevation: 'base' | 'mid' | 'summit',
    elevationMeters: number
  ): WindImpactForecast {
    const baseWindSpeed = forecast.windSpeedKmh || 0;
    const temperature = forecast.temperatureC || 0;
    
    // Adjust wind speed for elevation
    const adjustedWind = this.adjustWindForElevation(baseWindSpeed, elevationMeters);
    
    // Determine wind category
    const category = this.determineWindCategory(adjustedWind);
    
    // Calculate wind chill
    const windChill = this.calculateWindChill(temperature, adjustedWind);
    
    // Assess lift closure risk
    const liftRisk = this.assessLiftRisk(adjustedWind, category);
    
    // Calculate skiability score
    const skiability = this.calculateSkiability(adjustedWind, temperature);
    
    // Generate recommendation
    const recommendation = this.generateRecommendation(category, liftRisk, elevation);
    
    // Generate warnings
    const warnings = this.generateWarnings(category, liftRisk, windChill, temperature);
    
    return {
      validTime: forecast.validTime.toISOString(),
      elevation,
      elevationMeters,
      analysis: {
        windSpeedKmh: baseWindSpeed,
        adjustedWindKmh: adjustedWind,
        category,
        windChill,
        liftRisk,
        skiability,
        recommendation,
        warnings,
      },
    };
  }

  /**
   * Adjust wind speed for elevation
   * Wind increases approximately 40% per 1000m of elevation gain
   */
  private adjustWindForElevation(baseWindSpeed: number, elevationMeters: number): number {
    const BASE_ELEVATION = 840; // SMN Bariloche airport elevation
    const WIND_INCREASE_RATE = 0.0004; // 40% per 1000m = 0.04% per meter
    
    const elevationDiff = elevationMeters - BASE_ELEVATION;
    const multiplier = 1 + (elevationDiff * WIND_INCREASE_RATE);
    
    return Math.round(baseWindSpeed * multiplier);
  }

  /**
   * Determine wind category based on speed
   */
  private determineWindCategory(windSpeedKmh: number): WindCategory {
    if (windSpeedKmh >= 50) return 'EXTREME';
    if (windSpeedKmh >= 30) return 'STRONG';
    if (windSpeedKmh >= 15) return 'MODERATE';
    return 'CALM';
  }

  /**
   * Calculate wind chill (sensación térmica)
   * Uses North American wind chill formula
   */
  private calculateWindChill(temperatureC: number, windSpeedKmh: number): number {
    if (temperatureC > 10 || windSpeedKmh < 5) {
      return temperatureC; // Wind chill not applicable
    }
    
    // Convert to formula units
    const T = temperatureC;
    const V = windSpeedKmh;
    
    // Wind chill formula (simplified for metric)
    const windChill = 13.12 + 0.6215 * T - 11.37 * Math.pow(V, 0.16) + 0.3965 * T * Math.pow(V, 0.16);
    
    return Math.round(windChill * 10) / 10;
  }

  /**
   * Assess lift closure risk based on wind conditions
   */
  private assessLiftRisk(windSpeedKmh: number, category: WindCategory): LiftRisk {
    // Typical lift closure thresholds:
    // - Chairs: 50-60 km/h
    // - Gondolas: 80-100 km/h
    // - Surface lifts: 40-50 km/h
    
    if (windSpeedKmh >= 60) return 'CLOSED';
    if (windSpeedKmh >= 45) return 'HIGH_RISK';
    if (windSpeedKmh >= 30) return 'CAUTION';
    return 'OPEN';
  }

  /**
   * Calculate skiability score (0-100)
   * Considers wind speed and temperature
   */
  private calculateSkiability(windSpeedKmh: number, temperatureC: number): number {
    let score = 100;
    
    // Wind impact (max -60 points)
    if (windSpeedKmh >= 50) score -= 60;
    else if (windSpeedKmh >= 40) score -= 45;
    else if (windSpeedKmh >= 30) score -= 30;
    else if (windSpeedKmh >= 20) score -= 15;
    else if (windSpeedKmh >= 15) score -= 5;
    
    // Temperature impact (max -20 points)
    if (temperatureC < -15) score -= 20; // Too cold
    else if (temperatureC < -10) score -= 10;
    else if (temperatureC > 5) score -= 15; // Too warm
    
    // Wind chill impact (additional -20 points)
    const windChill = this.calculateWindChill(temperatureC, windSpeedKmh);
    if (windChill < -20) score -= 20;
    else if (windChill < -15) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate recommendation based on conditions
   */
  private generateRecommendation(
    category: WindCategory,
    liftRisk: LiftRisk,
    elevation: 'base' | 'mid' | 'summit'
  ): string {
    if (category === 'EXTREME') {
      return 'Condiciones extremas. Buscar zonas protegidas o considerar no esquiar.';
    }
    
    if (category === 'STRONG') {
      if (elevation === 'summit') {
        return 'Viento fuerte en cumbre. Preferir zonas medias y bajas.';
      }
      return 'Viento fuerte. Buscar zonas protegidas del viento.';
    }
    
    if (category === 'MODERATE') {
      if (liftRisk === 'CAUTION') {
        return 'Viento moderado. Algunos lifts pueden tener demoras.';
      }
      return 'Viento moderado. Condiciones esquiables con precaución.';
    }
    
    return 'Viento calmo. Condiciones ideales.';
  }

  /**
   * Generate warnings based on conditions
   */
  private generateWarnings(
    category: WindCategory,
    liftRisk: LiftRisk,
    windChill: number,
    temperature: number
  ): string[] {
    const warnings: string[] = [];
    
    if (category === 'EXTREME') {
      warnings.push('⚠️ VIENTO EXTREMO - Condiciones peligrosas');
    }
    
    if (liftRisk === 'CLOSED') {
      warnings.push('🚡 LIFTS CERRADOS - Viento excede límites operativos');
    } else if (liftRisk === 'HIGH_RISK') {
      warnings.push('🚡 ALTO RIESGO - Lifts pueden cerrar en cualquier momento');
    } else if (liftRisk === 'CAUTION') {
      warnings.push('⚠️ PRECAUCIÓN - Posibles demoras en lifts');
    }
    
    if (windChill < -20) {
      warnings.push('🥶 SENSACIÓN TÉRMICA EXTREMA - Riesgo de congelamiento');
    } else if (windChill < -15) {
      warnings.push('❄️ SENSACIÓN TÉRMICA MUY FRÍA - Abrigarse bien');
    }
    
    if (category === 'STRONG' || category === 'EXTREME') {
      warnings.push('💨 Visibilidad reducida por nieve volando');
    }
    
    return warnings;
  }

  /**
   * Aggregate daily wind impact from hourly data
   */
  aggregateDailyWindImpact(hourlyImpact: WindImpactForecast[]): WindImpactForecast[] {
    const dailyMap = new Map<string, WindImpactForecast[]>();
    
    hourlyImpact.forEach((impact) => {
      const date = impact.validTime.substring(0, 10);
      const key = `${date}-${impact.elevation}`;
      if (!dailyMap.has(key)) {
        dailyMap.set(key, []);
      }
      dailyMap.get(key)!.push(impact);
    });
    
    const dailyImpact: WindImpactForecast[] = [];
    
    dailyMap.forEach((hourlyData, key) => {
      const parts = key.split('-');
      const date = parts.slice(0, 3).join('-');
      const elevation = parts[3] as 'base' | 'mid' | 'summit';
      
      // Find peak wind conditions (worst case)
      const peakWind = hourlyData.reduce((max, h) => 
        h.analysis.adjustedWindKmh > max.analysis.adjustedWindKmh ? h : max
      );
      
      // Average wind chill
      const avgWindChill = hourlyData.reduce((sum, h) => sum + h.analysis.windChill, 0) / hourlyData.length;
      
      // Worst lift risk
      const riskPriority = { CLOSED: 4, HIGH_RISK: 3, CAUTION: 2, OPEN: 1 };
      const worstLiftRisk = hourlyData.reduce((worst, h) => 
        riskPriority[h.analysis.liftRisk] > riskPriority[worst.analysis.liftRisk] ? h : worst
      ).analysis.liftRisk;
      
      // Average skiability
      const avgSkiability = Math.round(
        hourlyData.reduce((sum, h) => sum + h.analysis.skiability, 0) / hourlyData.length
      );
      
      // Collect all unique warnings
      const allWarnings = new Set<string>();
      hourlyData.forEach(h => h.analysis.warnings.forEach(w => allWarnings.add(w)));
      
      dailyImpact.push({
        validTime: `${date}T12:00:00.000Z`,
        elevation,
        elevationMeters: hourlyData[0].elevationMeters,
        analysis: {
          windSpeedKmh: peakWind.analysis.windSpeedKmh,
          adjustedWindKmh: peakWind.analysis.adjustedWindKmh,
          category: peakWind.analysis.category,
          windChill: Math.round(avgWindChill * 10) / 10,
          liftRisk: worstLiftRisk,
          skiability: avgSkiability,
          recommendation: peakWind.analysis.recommendation,
          warnings: Array.from(allWarnings),
        },
      });
    });
    
    return dailyImpact.sort((a, b) => a.validTime.localeCompare(b.validTime));
  }
}
