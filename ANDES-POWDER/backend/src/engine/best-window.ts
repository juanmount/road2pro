/**
 * Best Window Identifier
 * Finds optimal skiing windows based on conditions
 */

import { BestWindow } from '../domain/models';

export class BestWindowIdentifier {
  /**
   * Identify best skiing window for the day
   */
  identifyBestWindow(hourlyData: any[]): BestWindow | undefined {
    if (hourlyData.length === 0) return undefined;
    
    // Score each hour
    const scoredHours = hourlyData.map((hour, index) => ({
      index,
      time: hour.time,
      score: this.scoreHour(hour)
    }));
    
    // Find best consecutive 2-3 hour window
    let bestWindow = { start: 0, end: 0, score: 0 };
    
    for (let i = 0; i < scoredHours.length - 2; i++) {
      const windowScore = (
        scoredHours[i].score +
        scoredHours[i + 1].score +
        scoredHours[i + 2].score
      ) / 3;
      
      if (windowScore > bestWindow.score) {
        bestWindow = { start: i, end: i + 2, score: windowScore };
      }
    }
    
    if (bestWindow.score === 0) return undefined;
    
    const startTime = this.formatTime(scoredHours[bestWindow.start].time);
    const endTime = this.formatTime(scoredHours[bestWindow.end].time);
    const reason = this.generateReason(bestWindow.score, hourlyData[bestWindow.start]);
    
    return {
      start: startTime,
      end: endTime,
      reason,
      score: bestWindow.score
    };
  }
  
  private scoreHour(hour: any): number {
    let score = 5; // Base score
    
    // Temperature preference (not too cold, not too warm)
    if (hour.temperature >= -10 && hour.temperature <= 0) score += 2;
    else if (hour.temperature < -15 || hour.temperature > 5) score -= 2;
    
    // Wind preference
    if (hour.windSpeed < 20) score += 2;
    else if (hour.windSpeed > 40) score -= 2;
    
    // Snowfall bonus
    if (hour.snowfall && hour.snowfall > 1) score += 1;
    
    // Cloud cover (some sun is nice)
    if (hour.cloudCover >= 30 && hour.cloudCover <= 70) score += 1;
    
    return Math.max(0, score);
  }
  
  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5); // HH:mm
  }
  
  private generateReason(score: number, hour: any): string {
    const reasons: string[] = [];
    
    if (score >= 8) reasons.push('Excellent conditions');
    else if (score >= 6) reasons.push('Good conditions');
    else reasons.push('Fair conditions');
    
    if (hour.windSpeed < 20) reasons.push('light winds');
    if (hour.temperature >= -10 && hour.temperature <= 0) {
      reasons.push('comfortable temperatures');
    }
    
    return reasons.join(', ');
  }
}
