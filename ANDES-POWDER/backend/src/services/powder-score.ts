import { FreezeQuality, PrecipitationType } from '../types';

interface PowderScoreInput {
  snowfall24h: number;
  snowfall48h: number;
  temperature: number;
  overnightMinTemp: number;
  windSpeed: number;
  windGust: number;
  precipitationType: PrecipitationType;
}

export class PowderScoreCalculator {
  calculate(input: PowderScoreInput): number {
    let score = 0;

    score += this.calculateSnowfallScore(input.snowfall24h, input.snowfall48h);
    score += this.calculateFreezeScore(input.overnightMinTemp);
    score += this.calculateTemperatureScore(input.temperature);
    score += this.calculateWindScore(input.windSpeed, input.windGust);

    if (input.precipitationType === 'rain') {
      score *= 0.3;
    } else if (input.precipitationType === 'mixed') {
      score *= 0.6;
    }

    return Math.max(0, Math.min(10, Number(score.toFixed(1))));
  }

  private calculateSnowfallScore(snowfall24h: number, snowfall48h: number): number {
    const recentSnow = snowfall24h;
    
    if (recentSnow >= 30) return 4.0;
    if (recentSnow >= 20) return 3.0;
    if (recentSnow >= 10) return 2.0;
    if (recentSnow >= 5) return 1.0;
    
    if (snowfall48h >= 20) return 0.5;
    
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

  private calculateTemperatureScore(temperature: number): number {
    if (temperature >= -2 && temperature <= -8) {
      return 2.0;
    }
    if (temperature >= -8 && temperature <= -12) {
      return 1.5;
    }
    if (temperature >= -12 && temperature <= -15) {
      return 1.0;
    }
    if (temperature > 0) {
      return 0;
    }
    return 0.5;
  }

  private calculateWindScore(windSpeed: number, windGust: number): number {
    const effectiveWind = Math.max(windSpeed, windGust * 0.7);
    
    if (effectiveWind < 15) return 2.0;
    if (effectiveWind < 25) return 1.5;
    if (effectiveWind < 40) return 1.0;
    if (effectiveWind < 60) return 0.5;
    return 0;
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
}

export const powderScoreCalculator = new PowderScoreCalculator();
