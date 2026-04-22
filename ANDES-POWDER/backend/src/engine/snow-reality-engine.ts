import { ElevationForecast } from '../domain/models';
import { ENSOService } from '../services/enso-service';

export interface SnowRealityAdjustments {
  windLoss: number;
  rainContamination: number;
  densityAdjustment: number;
  solarMelt: number;
  sublimation: number;
}

export interface SnowRealityForecast {
  validTime: string;
  elevation: 'base' | 'mid' | 'summit';
  elevationMeters: number;
  forecastSnowfall: number;
  realAccumulation: number;
  adjustments: SnowRealityAdjustments;
  snowQuality: 'POWDER' | 'PACKED' | 'DENSE' | 'WET';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
}

export class SnowRealityEngine {
  private ensoService = new ENSOService();
  
  /**
   * Compute real snow accumulation adjustments for a forecast period
   */
  async computeRealityAdjustments(
    forecast: ElevationForecast,
    elevation: 'base' | 'mid' | 'summit',
    elevationMeters: number,
    forecastSnowfall: number
  ): Promise<SnowRealityForecast> {
    if (forecastSnowfall <= 0) {
      return this.createNoSnowResult(forecast, elevation, elevationMeters);
    }

    const adjustments = await this.calculateAdjustments(
      forecast,
      elevation,
      elevationMeters,
      forecastSnowfall
    );

    const realAccumulation = this.applyAdjustments(forecastSnowfall, adjustments);
    const snowQuality = this.determineSnowQuality(forecast, adjustments);
    const confidence = this.determineConfidence(forecast, adjustments);
    const explanation = this.generateExplanation(adjustments, snowQuality, forecast);

    return {
      validTime: forecast.validTime.toISOString(),
      elevation,
      elevationMeters,
      forecastSnowfall,
      realAccumulation: Math.max(0, realAccumulation),
      adjustments,
      snowQuality,
      confidence,
      explanation,
    };
  }

  private async calculateAdjustments(
    forecast: ElevationForecast,
    elevation: 'base' | 'mid' | 'summit',
    elevationMeters: number,
    forecastSnowfall: number
  ): Promise<SnowRealityAdjustments> {
    const windLoss = this.calculateWindLoss(forecast, elevation);
    const rainContamination = await this.calculateRainContamination(forecast, elevationMeters);
    const densityAdjustment = this.calculateDensityAdjustment(forecast, elevationMeters);
    const solarMelt = this.calculateSolarMelt(forecast);
    const sublimation = this.calculateSublimation(forecast);

    return {
      windLoss,
      rainContamination,
      densityAdjustment,
      solarMelt,
      sublimation,
    };
  }

  /**
   * Calculate wind redistribution loss (0-40%)
   * Wind removes snow from exposed areas
   */
  private calculateWindLoss(forecast: ElevationForecast, elevation: 'base' | 'mid' | 'summit'): number {
    const avgWind = forecast.windSpeedKmh || 0;
    const gustWind = forecast.windGustKmh || avgWind * 1.3;

    let windLossFactor = Math.min(40, (avgWind / 50) * 30 + (gustWind / 80) * 10);

    const elevationMultiplier = {
      summit: 1.5,
      mid: 1.2,
      base: 1.0,
    }[elevation];

    windLossFactor *= elevationMultiplier;

    return Math.min(40, Math.round(windLossFactor));
  }

  /**
   * Calculate rain contamination loss (0-50%)
   * Rain mixed with snow reduces accumulation quality
   */
  private async calculateRainContamination(forecast: ElevationForecast, elevationMeters: number): Promise<number> {
    let freezingLevel = forecast.freezingLevelM || 3000;
    
    // Apply ENSO freezing level adjustment
    try {
      const ensoData = await this.ensoService.getCurrentENSOData();
      freezingLevel += ensoData.freezingLevelAdjustment;
    } catch (error) {
      console.warn('Failed to apply ENSO freezing level adjustment:', error);
    }
    
    const temp = forecast.temperatureC || 0;
    const elevationMargin = freezingLevel - elevationMeters;

    let contaminationLoss = 0;

    // Less aggressive losses - allow for more realistic accumulation
    if (elevationMargin < 100) {
      contaminationLoss = 25 + Math.random() * 10;  // Reduced from 40-50%
    } else if (elevationMargin < 300) {
      contaminationLoss = 15 + Math.random() * 8;   // Reduced from 20-30%
    } else if (elevationMargin < 600) {
      contaminationLoss = 5 + Math.random() * 5;    // Reduced from 8-15%
    } else {
      contaminationLoss = 0 + Math.random() * 3;
    }

    if (temp > -1) {
      contaminationLoss += 8;  // Reduced from 10%
    }

    return Math.min(40, Math.round(contaminationLoss));  // Max 40% instead of 50%
  }

  /**
   * Calculate snow density adjustment (-10% to +15%)
   * Light powder vs heavy wet snow affects depth
   */
  private calculateDensityAdjustment(forecast: ElevationForecast, elevationMeters: number): number {
    const temp = forecast.temperatureC || 0;
    const humidity = forecast.humidity || 70;

    let densityAdjustment = 0;

    if (temp < -8) {
      densityAdjustment = 15;
    } else if (temp < -4) {
      densityAdjustment = 5;
    } else if (temp < 0) {
      densityAdjustment = 0;
    } else if (temp < 2) {
      densityAdjustment = -10;
    } else {
      densityAdjustment = -15;
    }

    if (humidity > 80 && temp > -5) {
      densityAdjustment -= 5;
    }

    return Math.round(densityAdjustment);
  }

  /**
   * Calculate solar melt loss (0-25%)
   * Daytime solar radiation melts surface snow
   */
  private calculateSolarMelt(forecast: ElevationForecast): number {
    const cloudCover = forecast.cloudCover || 50;
    const hour = forecast.validTime.getHours();

    let solarFactor = 0;

    if (cloudCover < 50) {
      if (hour >= 10 && hour <= 16) {
        solarFactor = 15;
      } else if ((hour >= 8 && hour < 10) || (hour > 16 && hour <= 18)) {
        solarFactor = 8;
      }

      const cloudReduction = (50 - cloudCover) / 50;
      solarFactor *= cloudReduction;
    }

    return Math.round(solarFactor);
  }

  /**
   * Calculate sublimation loss (0-15%)
   * Very cold, dry conditions cause snow to sublimate
   */
  private calculateSublimation(forecast: ElevationForecast): number {
    const temp = forecast.temperatureC || 0;
    const humidity = forecast.humidity || 70;
    const wind = forecast.windSpeedKmh || 0;

    let sublimationLoss = 0;

    if (temp < -10 && humidity < 40 && wind > 30) {
      sublimationLoss = 12 + Math.random() * 3;
    } else if (temp < -5 && humidity < 50) {
      sublimationLoss = 7 + Math.random() * 3;
    } else {
      sublimationLoss = 0 + Math.random() * 5;
    }

    return Math.round(sublimationLoss);
  }

  /**
   * Apply all adjustments to forecast snowfall
   */
  private applyAdjustments(forecastSnowfall: number, adjustments: SnowRealityAdjustments): number {
    let real = forecastSnowfall;

    real *= 1 - adjustments.windLoss / 100;
    real *= 1 - adjustments.rainContamination / 100;
    real *= 1 + adjustments.densityAdjustment / 100;
    real *= 1 - adjustments.solarMelt / 100;
    real *= 1 - adjustments.sublimation / 100;

    return Math.round(real * 10) / 10;
  }

  /**
   * Determine snow quality category
   */
  private determineSnowQuality(
    forecast: ElevationForecast,
    adjustments: SnowRealityAdjustments
  ): 'POWDER' | 'PACKED' | 'DENSE' | 'WET' {
    const temp = forecast.temperatureC || 0;
    const wind = forecast.windSpeedKmh || 0;
    const rainContamination = adjustments.rainContamination;

    // POWDER: Cold, dry, light snow
    if (temp < -5 && wind < 20 && rainContamination < 5 && adjustments.densityAdjustment > 5) {
      return 'POWDER';
    }
    // PACKED: Cold enough, some wind compression
    else if (temp < 0 && wind < 30 && rainContamination < 15) {
      return 'PACKED';
    }
    // DENSE: Warmer temps, heavier snow
    else if (temp < 2 && wind < 40 && rainContamination < 30) {
      return 'DENSE';
    }
    // WET: Warm, rain mixing, heavy and wet
    else {
      return 'WET';
    }
  }

  /**
   * Determine confidence level
   */
  private determineConfidence(
    forecast: ElevationForecast,
    adjustments: SnowRealityAdjustments
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    const totalLoss =
      adjustments.windLoss +
      adjustments.rainContamination +
      adjustments.solarMelt +
      adjustments.sublimation;

    const temp = forecast.temperatureC || 0;
    const freezingMargin = Math.abs(temp);

    if (totalLoss < 20 && freezingMargin > 5) {
      return 'HIGH';
    } else if (totalLoss < 40 && freezingMargin > 2) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    adjustments: SnowRealityAdjustments,
    snowQuality: string,
    forecast: ElevationForecast
  ): string {
    const parts: string[] = [];

    if (snowQuality === 'POWDER') {
      parts.push('Dry powder conditions.');
    } else if (snowQuality === 'PACKED') {
      parts.push('Packed snow conditions.');
    } else if (snowQuality === 'DENSE') {
      parts.push('Dense, heavy snow.');
    } else {
      parts.push('Wet, heavy snow.');
    }

    if (adjustments.windLoss > 20) {
      parts.push('Significant wind redistribution.');
    } else if (adjustments.windLoss > 10) {
      parts.push('Moderate wind effects.');
    }

    if (adjustments.rainContamination > 20) {
      parts.push('High rain contamination risk.');
    } else if (adjustments.rainContamination > 10) {
      parts.push('Some rain mixing possible.');
    } else if (adjustments.rainContamination < 5) {
      parts.push('Minimal rain risk.');
    }

    if (adjustments.densityAdjustment > 10) {
      parts.push('Light, fluffy snow expected.');
    } else if (adjustments.densityAdjustment < -5) {
      parts.push('Heavy, wet snow likely.');
    }

    if (adjustments.solarMelt > 10) {
      parts.push('Daytime solar melt expected.');
    }

    return parts.join(' ');
  }

  private createNoSnowResult(
    forecast: ElevationForecast,
    elevation: 'base' | 'mid' | 'summit',
    elevationMeters: number
  ): SnowRealityForecast {
    return {
      validTime: forecast.validTime.toISOString(),
      elevation,
      elevationMeters,
      forecastSnowfall: 0,
      realAccumulation: 0,
      adjustments: {
        windLoss: 0,
        rainContamination: 0,
        densityAdjustment: 0,
        solarMelt: 0,
        sublimation: 0,
      },
      snowQuality: 'WET',
      confidence: 'HIGH',
      explanation: 'No snowfall expected.'
    };
  }

  /**
   * Aggregate daily reality forecasts from hourly data
   */
  aggregateDailyReality(hourlyReality: SnowRealityForecast[]): SnowRealityForecast[] {
    const dailyMap = new Map<string, SnowRealityForecast[]>();

    hourlyReality.forEach((reality) => {
      // Extract date from ISO string (YYYY-MM-DDTHH:mm:ss.sssZ -> YYYY-MM-DD)
      const date = reality.validTime.substring(0, 10);
      const key = `${date}-${reality.elevation}`;
      if (!dailyMap.has(key)) {
        dailyMap.set(key, []);
      }
      dailyMap.get(key)!.push(reality);
    });

    const dailyReality: SnowRealityForecast[] = [];

    dailyMap.forEach((hourlyData, key) => {
      const parts = key.split('-');
      const date = parts.slice(0, 3).join('-'); // YYYY-MM-DD
      const elevation = parts[3]; // base, mid, or summit
      const elevationTyped = elevation as 'base' | 'mid' | 'summit';

      const totalForecast = hourlyData.reduce((sum, h) => sum + h.forecastSnowfall, 0);
      const totalReal = hourlyData.reduce((sum, h) => sum + h.realAccumulation, 0);

      const avgAdjustments: SnowRealityAdjustments = {
        windLoss: Math.round(
          hourlyData.reduce((sum, h) => sum + h.adjustments.windLoss, 0) / hourlyData.length
        ),
        rainContamination: Math.round(
          hourlyData.reduce((sum, h) => sum + h.adjustments.rainContamination, 0) /
            hourlyData.length
        ),
        densityAdjustment: Math.round(
          hourlyData.reduce((sum, h) => sum + h.adjustments.densityAdjustment, 0) /
            hourlyData.length
        ),
        solarMelt: Math.round(
          hourlyData.reduce((sum, h) => sum + h.adjustments.solarMelt, 0) / hourlyData.length
        ),
        sublimation: Math.round(
          hourlyData.reduce((sum, h) => sum + h.adjustments.sublimation, 0) / hourlyData.length
        ),
      };

      const qualityCounts = hourlyData.reduce(
        (acc, h) => {
          acc[h.snowQuality]++;
          return acc;
        },
        { POWDER: 0, PACKED: 0, DENSE: 0, WET: 0 }
      );

      const dominantQuality = (Object.keys(qualityCounts) as Array<keyof typeof qualityCounts>)
        .sort((a, b) => qualityCounts[b] - qualityCounts[a])[0];

      const confidenceCounts = hourlyData.reduce(
        (acc, h) => {
          acc[h.confidence]++;
          return acc;
        },
        { HIGH: 0, MEDIUM: 0, LOW: 0 }
      );

      const dominantConfidence = (
        Object.keys(confidenceCounts) as Array<keyof typeof confidenceCounts>
      ).sort((a, b) => confidenceCounts[b] - confidenceCounts[a])[0];

      dailyReality.push({
        validTime: `${date}T12:00:00.000Z`,
        elevation: elevationTyped,
        elevationMeters: hourlyData[0].elevationMeters,
        forecastSnowfall: Math.round(totalForecast * 10) / 10,
        realAccumulation: Math.round(totalReal * 10) / 10,
        adjustments: avgAdjustments,
        snowQuality: dominantQuality,
        confidence: dominantConfidence,
        explanation: this.generateExplanation(avgAdjustments, dominantQuality, {
          validTime: new Date(`${date}T12:00:00.000Z`),
          temperatureC: 0,
          windSpeedKmh: 0,
        } as ElevationForecast),
      });
    });

    return dailyReality.sort((a, b) => a.validTime.localeCompare(b.validTime));
  }
}
