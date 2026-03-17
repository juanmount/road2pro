/**
 * Meteorological calculations for Andes Powder
 */

/**
 * Calculate wet bulb temperature using Stull's formula (2011)
 * More accurate for temperatures between -20°C and 50°C
 * 
 * @param tempC - Dry bulb temperature in Celsius
 * @param relativeHumidity - Relative humidity as percentage (0-100)
 * @param pressureHPa - Atmospheric pressure in hPa (optional, defaults to 1013.25)
 * @returns Wet bulb temperature in Celsius
 */
export function calculateWetBulbTemperature(
  tempC: number,
  relativeHumidity: number,
  pressureHPa: number = 1013.25
): number {
  // Stull (2011) formula - accurate approximation
  // Tw = T * atan[0.151977 * (RH% + 8.313659)^0.5] + atan(T + RH%) - atan(RH% - 1.676331) + 0.00391838 * RH%^1.5 * atan(0.023101 * RH%) - 4.686035
  
  const T = tempC;
  const RH = relativeHumidity;
  
  const wetBulb = T * Math.atan(0.151977 * Math.pow(RH + 8.313659, 0.5))
    + Math.atan(T + RH)
    - Math.atan(RH - 1.676331)
    + 0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH)
    - 4.686035;
  
  return wetBulb;
}

/**
 * Calculate dew point temperature using Magnus formula
 * 
 * @param tempC - Temperature in Celsius
 * @param relativeHumidity - Relative humidity as percentage (0-100)
 * @returns Dew point temperature in Celsius
 */
export function calculateDewPoint(tempC: number, relativeHumidity: number): number {
  const a = 17.27;
  const b = 237.7;
  
  const alpha = ((a * tempC) / (b + tempC)) + Math.log(relativeHumidity / 100);
  const dewPoint = (b * alpha) / (a - alpha);
  
  return dewPoint;
}

/**
 * Determine precipitation phase based on wet bulb temperature
 * Uses Catedral's operational threshold of -2.5°C wet bulb for technical snow
 * 
 * @param wetBulbC - Wet bulb temperature in Celsius
 * @param freezingLevelM - Freezing level in meters
 * @param elevationM - Elevation in meters
 * @returns Precipitation phase: 'snow', 'mixed', 'rain', or 'none'
 */
export function determinePrecipitationPhase(
  wetBulbC: number,
  freezingLevelM: number,
  elevationM: number
): 'snow' | 'mixed' | 'rain' | 'none' {
  // Primary criterion: wet bulb temperature
  // Catedral uses -2.5°C wet bulb for technical snow operations
  if (wetBulbC < -2.5) {
    return 'snow';
  }
  
  if (wetBulbC < 0) {
    // Mixed precipitation zone: wet bulb between -2.5°C and 0°C
    // Check freezing level as secondary criterion
    const margin = freezingLevelM - elevationM;
    if (margin < -100) return 'snow'; // Well below freezing level
    if (margin > 100) return 'rain';  // Well above freezing level
    return 'mixed';
  }
  
  if (wetBulbC < 2) {
    // Marginal rain zone: wet bulb between 0°C and 2°C
    // Could still have some snow at higher elevations
    const margin = freezingLevelM - elevationM;
    if (margin < -200) return 'snow';
    if (margin < 0) return 'mixed';
    return 'rain';
  }
  
  // Warm rain: wet bulb > 2°C
  return 'rain';
}

/**
 * Score wind direction for snow potential in Patagonian Andes
 * W/WNW/NW winds bring moisture from Pacific and are optimal for snowfall
 * 
 * @param windDirectionDegrees - Wind direction in degrees (0-360, where 0/360 = North, 90 = East, 180 = South, 270 = West)
 * @returns Score from 0.0 to 1.0, where 1.0 is optimal for snow
 */
export function scoreWindDirectionForSnow(windDirectionDegrees: number): number {
  // Normalize to 0-360
  const dir = ((windDirectionDegrees % 360) + 360) % 360;
  
  // Optimal: W (270°), WNW (292.5°), NW (315°)
  // Range: 260° - 325° gets full score
  if (dir >= 260 && dir <= 325) {
    return 1.0;
  }
  
  // Good: WSW to NNW (230° - 350°)
  // Gradual falloff
  if (dir >= 230 && dir < 260) {
    // WSW to W: linear increase from 0.7 to 1.0
    return 0.7 + (0.3 * (dir - 230) / 30);
  }
  
  if (dir > 325 && dir <= 350) {
    // NW to NNW: linear decrease from 1.0 to 0.7
    return 1.0 - (0.3 * (dir - 325) / 25);
  }
  
  // Moderate: SW and N (210° - 230° or 350° - 10°)
  if (dir >= 210 && dir < 230) {
    return 0.5;
  }
  
  if (dir > 350 || dir <= 10) {
    return 0.5;
  }
  
  // Poor: East, South, Southeast (poor for Pacific moisture)
  // 10° - 210°
  return 0.3;
}

/**
 * Calculate atmospheric pressure at elevation using barometric formula
 * 
 * @param seaLevelPressureHPa - Sea level pressure in hPa
 * @param elevationM - Elevation in meters
 * @param temperatureC - Temperature in Celsius (optional, defaults to 15°C)
 * @returns Pressure at elevation in hPa
 */
export function calculatePressureAtElevation(
  seaLevelPressureHPa: number,
  elevationM: number,
  temperatureC: number = 15
): number {
  const T0 = 273.15 + temperatureC; // Temperature in Kelvin
  const L = 0.0065; // Temperature lapse rate (K/m)
  const g = 9.80665; // Gravitational acceleration (m/s²)
  const M = 0.0289644; // Molar mass of air (kg/mol)
  const R = 8.31447; // Universal gas constant (J/(mol·K))
  
  const exponent = (g * M) / (R * L);
  const pressure = seaLevelPressureHPa * Math.pow(1 - (L * elevationM) / T0, exponent);
  
  return pressure;
}
