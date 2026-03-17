import { BestWindow, HourlyForecast } from '../types';

export class BestWindowCalculator {
  calculate(hourlyForecasts: HourlyForecast[]): BestWindow | null {
    if (hourlyForecasts.length === 0) return null;

    const dayForecasts = hourlyForecasts.filter((f) => {
      const hour = new Date(f.timestamp).getHours();
      return hour >= 8 && hour <= 17;
    });

    if (dayForecasts.length === 0) return null;

    let bestScore = 0;
    let bestStartIndex = 0;
    const windowSize = 3;

    for (let i = 0; i <= dayForecasts.length - windowSize; i++) {
      const windowScore = dayForecasts
        .slice(i, i + windowSize)
        .reduce((sum, f) => sum + f.powderScore, 0) / windowSize;

      if (windowScore > bestScore) {
        bestScore = windowScore;
        bestStartIndex = i;
      }
    }

    const startTime = new Date(dayForecasts[bestStartIndex].timestamp);
    const endTime = new Date(dayForecasts[Math.min(bestStartIndex + windowSize - 1, dayForecasts.length - 1)].timestamp);

    const reason = this.generateReason(dayForecasts, bestStartIndex, windowSize);

    return {
      start: this.formatTime(startTime),
      end: this.formatTime(endTime),
      reason,
    };
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private generateReason(forecasts: HourlyForecast[], startIndex: number, windowSize: number): string {
    const windowForecasts = forecasts.slice(startIndex, startIndex + windowSize);
    const avgTemp = windowForecasts.reduce((sum, f) => sum + f.temperature, 0) / windowForecasts.length;
    const avgWind = windowForecasts.reduce((sum, f) => sum + f.windSpeed, 0) / windowForecasts.length;
    const totalSnow = windowForecasts.reduce((sum, f) => sum + (f.precipitation || 0), 0);

    const reasons: string[] = [];

    const morningForecasts = forecasts.filter((f) => {
      const hour = new Date(f.timestamp).getHours();
      return hour >= 6 && hour <= 9;
    });
    const morningMinTemp = Math.min(...morningForecasts.map((f) => f.temperature));

    if (morningMinTemp < -2 && avgTemp > morningMinTemp + 3) {
      reasons.push('Strong overnight freeze, best skiing before snow softens');
    } else if (morningMinTemp < -5) {
      reasons.push('Good overnight freeze, optimal conditions early');
    }

    if (totalSnow > 5) {
      reasons.push('Fresh powder during this window');
    }

    if (avgWind < 20) {
      reasons.push('Calm wind conditions');
    }

    if (avgTemp >= -8 && avgTemp <= -2) {
      reasons.push('Optimal skiing temperature');
    }

    if (reasons.length === 0) {
      return 'Best conditions during this period';
    }

    return reasons.join(', ');
  }
}

export const bestWindowCalculator = new BestWindowCalculator();
