/**
 * Snow Accumulation Calculator
 * Calculates expected snowfall from precipitation and phase
 */

export class SnowAccumulationCalculator {
  /**
   * Calculate snowfall from precipitation and snow ratio
   */
  calculateSnowfall(
    precipMm: number,
    snowRatio: number,
    temperature: number
  ): number {
    // No snow if ratio is 0 or too low (< 15% is essentially rain)
    if (snowRatio < 0.15) return 0;
    
    // Base conversion: 1mm precip = ~1cm snow (10:1 ratio)
    const baseRatio = 10;
    
    // Adjust ratio based on temperature (colder = fluffier = higher ratio)
    const tempAdjustment = this.getTemperatureAdjustment(temperature);
    const effectiveRatio = baseRatio * tempAdjustment;
    
    // Calculate snowfall
    const snowfallCm = precipMm * snowRatio * effectiveRatio / 10;
    
    return Math.max(0, snowfallCm);
  }
  
  /**
   * Temperature adjustment for snow density
   */
  private getTemperatureAdjustment(temp: number): number {
    if (temp <= -10) return 1.3;  // Very cold = powder
    if (temp <= -5) return 1.15;  // Cold = light snow
    if (temp <= 0) return 1.0;    // Standard
    if (temp <= 2) return 0.85;   // Warm = heavy snow
    return 0.7;                   // Very warm = wet snow
  }
  
  /**
   * Calculate 24h accumulation
   */
  calculate24h(hourlySnowfall: number[]): number {
    const last24 = hourlySnowfall.slice(-24);
    return last24.reduce((sum, val) => sum + val, 0);
  }
  
  /**
   * Calculate 72h accumulation
   */
  calculate72h(hourlySnowfall: number[]): number {
    const last72 = hourlySnowfall.slice(-72);
    return last72.reduce((sum, val) => sum + val, 0);
  }
  
  /**
   * Calculate 7-day accumulation
   */
  calculate7d(hourlySnowfall: number[]): number {
    const last168 = hourlySnowfall.slice(-168);
    return last168.reduce((sum, val) => sum + val, 0);
  }
}
