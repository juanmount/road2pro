import { FreezeQuality, PrecipitationType } from '../types';

interface PowderScoreInput {
  snowfall24h: number;
  snowfall48h: number;
  snowfall6h?: number;
  snowfall12h?: number;
  temperature: number;
  overnightMinTemp: number;
  windSpeed: number;
  windGust: number;
  precipitationType: PrecipitationType;
  cloudCover?: number;
  freezingLevel?: number;
  elevation?: number;
}

export class PowderScoreCalculator {
  calculate(input: PowderScoreInput): number {
    // Component scores (0-10 each)
    const freshSnowScore = this.calculateFreshSnowScore(input.snowfall6h, input.snowfall12h, input.snowfall24h, input.snowfall48h);
    const snowQualityScore = this.calculateSnowQualityScore(input.temperature);
    const windImpactScore = this.calculateWindImpactScore(input.windSpeed, input.windGust);
    const visibilityScore = this.calculateVisibilityScore(input.cloudCover);
    const freezingSafetyScore = this.calculateFreezingSafetyScore(input.freezingLevel, input.elevation);

    // Weighted average
    const score = (
      freshSnowScore * 0.40 +      // 40% weight
      snowQualityScore * 0.25 +    // 25% weight
      windImpactScore * 0.20 +     // 20% weight
      visibilityScore * 0.10 +     // 10% weight
      freezingSafetyScore * 0.05   // 5% weight
    );

    // Rain/mixed penalty
    let finalScore = score;
    if (input.precipitationType === 'rain') {
      finalScore *= 0.3;
    } else if (input.precipitationType === 'mixed') {
      finalScore *= 0.6;
    }

    return Math.max(0, Math.min(10, Number(finalScore.toFixed(1))));
  }

  // 1. Fresh Snow Score (40% weight) - Recency matters
  private calculateFreshSnowScore(snowfall6h?: number, snowfall12h?: number, snowfall24h?: number, snowfall48h?: number): number {
    // Prioritize most recent snow
    if (snowfall6h && snowfall6h > 0) {
      if (snowfall6h >= 10) return 10;
      if (snowfall6h >= 5) return 9;
      if (snowfall6h >= 3) return 8;
      return 7;
    }
    
    if (snowfall12h && snowfall12h > 0) {
      if (snowfall12h >= 15) return 9;
      if (snowfall12h >= 10) return 8;
      if (snowfall12h >= 5) return 7;
      return 6;
    }
    
    if (snowfall24h && snowfall24h > 0) {
      if (snowfall24h >= 20) return 7;
      if (snowfall24h >= 10) return 6;
      if (snowfall24h >= 5) return 5;
      return 4;
    }
    
    if (snowfall48h && snowfall48h > 0) {
      if (snowfall48h >= 30) return 4;
      if (snowfall48h >= 20) return 3;
      if (snowfall48h >= 10) return 2;
      return 1;
    }
    
    return 0;
  }

  private calculateFreezeScore(overnightMinTemp: number): number {
    if (overnightMinTemp >= -2 || overnightMinTemp <= -6) {
      return 2.0;
    }
    if (overnightMinTemp >= -6 && overnightMinTemp <= -10) {
      return 1.0;
    }
    if (overnightMinTemp >= -10 && overnightMinTemp <= -12) {
      return 0.5;
    }
    return 0;
  }

  // 2. Snow Quality Score (25% weight) - Temperature-based
  private calculateSnowQualityScore(temperature: number): number {
    if (temperature < -8) return 10;           // Perfect powder
    if (temperature >= -8 && temperature < -4) return 8;  // Good powder
    if (temperature >= -4 && temperature < 0) return 5;   // Packed
    if (temperature >= 0 && temperature < 2) return 2;    // Heavy/wet
    return 0;                                   // Too warm
  }

  // 3. Wind Impact Score (20% weight)
  private calculateWindImpactScore(windSpeed: number, windGust: number): number {
    const effectiveWind = Math.max(windSpeed, windGust * 0.7);
    
    if (effectiveWind < 15) return 10;   // Calm
    if (effectiveWind < 25) return 7;    // Moderate
    if (effectiveWind < 40) return 4;    // Strong
    if (effectiveWind < 60) return 1;    // Very strong
    return 0;                             // Extreme
  }

  // 4. Visibility Score (10% weight) - Cloud cover based
  private calculateVisibilityScore(cloudCover?: number): number {
    if (cloudCover === undefined) return 7; // Default moderate
    
    if (cloudCover < 30) return 10;   // Clear
    if (cloudCover < 60) return 7;    // Partial
    if (cloudCover < 90) return 4;    // Cloudy
    return 2;                          // Very cloudy
  }

  // 5. Freezing Level Safety Score (5% weight)
  private calculateFreezingSafetyScore(freezingLevel?: number, elevation?: number): number {
    if (freezingLevel === undefined || elevation === undefined) return 7; // Default safe
    
    const margin = freezingLevel - elevation;
    
    if (margin > 500) return 10;   // Well above - all snow
    if (margin > 200) return 7;    // Safe margin
    if (margin > 0) return 4;      // Marginal
    return 0;                       // Below elevation - rain risk
  }

  determineFreezeQuality(overnightMinTemp: number): FreezeQuality {
    if (overnightMinTemp >= -2 && overnightMinTemp <= -6) {
      return 'excellent';
    }
    if (overnightMinTemp >= -6 && overnightMinTemp <= -10) {
      return 'good';
    }
    if (overnightMinTemp >= -10 && overnightMinTemp <= -12) {
      return 'fair';
    }
    if (overnightMinTemp < -12) {
      return 'poor';
    }
    return 'none';
  }

  determinePrecipitationType(temperature: number, precipitation: number, snowfall: number): PrecipitationType {
    if (precipitation === 0 && snowfall === 0) {
      return 'none';
    }
    
    if (temperature > 2) {
      return 'rain';
    }
    
    if (temperature > 0 && temperature <= 2) {
      return 'mixed';
    }
    
    return 'snow';
  }

  calculateSnowLine(hourlyTemps: number[], elevations: number[]): number | null {
    for (let i = 0; i < hourlyTemps.length; i++) {
      if (hourlyTemps[i] <= 0) {
        return elevations[i];
      }
    }
    return null;
  }

  generateConditionsSummary(
    baseTemp: number,
    midTemp: number,
    summitTemp: number,
    baseSnow: number,
    midSnow: number,
    summitSnow: number,
    freezeQuality: FreezeQuality,
    windSpeed: number
  ): string {
    const summaries: string[] = [];

    if (baseTemp > 2) {
      summaries.push('Base rainy, better above mid-mountain');
    } else if (baseTemp > 0) {
      summaries.push('Base conditions marginal');
    }

    if (midSnow > 15) {
      summaries.push(`${midSnow}cm fresh powder mid-mountain`);
    }

    if (freezeQuality === 'excellent') {
      summaries.push('Perfect overnight freeze');
    } else if (freezeQuality === 'good') {
      summaries.push('Good overnight freeze');
    }

    if (windSpeed > 40) {
      summaries.push('Strong winds may affect upper lifts');
    } else if (windSpeed > 25) {
      summaries.push('Moderate winds on summit');
    }

    if (summaries.length === 0) {
      return 'Standard ski conditions';
    }

    return summaries.join('. ');
  }

  determineRecommendedZone(
    basePowderScore: number,
    midPowderScore: number,
    summitPowderScore: number,
    windSpeed: number
  ): string {
    if (windSpeed > 50) {
      return 'mid-mountain';
    }

    const scores = [
      { zone: 'base', score: basePowderScore },
      { zone: 'mid', score: midPowderScore },
      { zone: 'summit', score: summitPowderScore },
    ];

    scores.sort((a, b) => b.score - a.score);

    if (scores[0].score > 7) {
      return scores[0].zone;
    }

    if (scores[0].score - scores[1].score < 1) {
      return `${scores[0].zone}-${scores[1].zone}`;
    }

    return scores[0].zone;
  }

  // Best Time to Ski - Find optimal ski windows in next 72 hours
  findBestSkiWindows(hourlyForecasts: Array<{
    time: Date;
    temperature: number;
    windSpeed: number;
    precipitation: number;
    snowfall: number;
    cloudCover: number;
    powderScore: number;
  }>): Array<{
    startTime: Date;
    endTime: Date;
    duration: number;
    powderScore: number;
    reasons: string[];
    warnings: string[];
  }> {
    const windows: Array<any> = [];
    
    // Look for 3-6 hour windows
    for (let i = 0; i < hourlyForecasts.length - 3; i++) {
      const windowHours = hourlyForecasts.slice(i, i + 6);
      
      // Check mandatory criteria
      const hasNoPrecip = windowHours.every(h => h.precipitation < 1);
      const hasLowWind = windowHours.every(h => h.windSpeed < 40);
      const hasCoolTemp = windowHours.every(h => h.temperature < 5);
      const avgPowderScore = windowHours.reduce((sum, h) => sum + h.powderScore, 0) / windowHours.length;
      const hasGoodScore = avgPowderScore > 6.0;
      
      if (hasNoPrecip && hasLowWind && hasCoolTemp && hasGoodScore) {
        const reasons: string[] = [];
        const warnings: string[] = [];
        
        // Check for fresh snow in last 12 hours
        const recentSnow = hourlyForecasts.slice(Math.max(0, i - 12), i)
          .reduce((sum, h) => sum + h.snowfall, 0);
        if (recentSnow > 5) {
          reasons.push(`Nieve fresca: ${Math.round(recentSnow)}cm`);
        }
        
        // Check visibility
        const avgCloudCover = windowHours.reduce((sum, h) => sum + h.cloudCover, 0) / windowHours.length;
        if (avgCloudCover < 60) {
          reasons.push('Buena visibilidad');
        }
        
        // Check temperature
        const avgTemp = windowHours.reduce((sum, h) => sum + h.temperature, 0) / windowHours.length;
        if (avgTemp >= -8 && avgTemp <= -2) {
          reasons.push('Temperatura ideal');
        }
        
        // Check wind
        const avgWind = windowHours.reduce((sum, h) => sum + h.windSpeed, 0) / windowHours.length;
        if (avgWind < 20) {
          reasons.push('Viento calmo');
        } else if (avgWind >= 30) {
          warnings.push('Viento moderado');
        }
        
        // Check if conditions deteriorate after
        if (i + 6 < hourlyForecasts.length) {
          const nextHours = hourlyForecasts.slice(i + 6, i + 9);
          const windIncreases = nextHours.some(h => h.windSpeed > 50);
          const precipStarts = nextHours.some(h => h.precipitation > 2);
          
          if (windIncreases) {
            warnings.push('Viento fuerte después');
          }
          if (precipStarts) {
            warnings.push('Precipitación después');
          }
        }
        
        windows.push({
          startTime: windowHours[0].time,
          endTime: windowHours[windowHours.length - 1].time,
          duration: windowHours.length,
          powderScore: Number(avgPowderScore.toFixed(1)),
          reasons,
          warnings
        });
      }
    }
    
    // Sort by powder score (best first)
    windows.sort((a, b) => b.powderScore - a.powderScore);
    
    // Remove overlapping windows, keep best
    const uniqueWindows: Array<any> = [];
    for (const window of windows) {
      const overlaps = uniqueWindows.some(existing => {
        return window.startTime < existing.endTime && window.endTime > existing.startTime;
      });
      
      if (!overlaps) {
        uniqueWindows.push(window);
      }
    }
    
    return uniqueWindows.slice(0, 3); // Return top 3 windows
  }
}

export const powderScoreCalculator = new PowderScoreCalculator();
