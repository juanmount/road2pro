/**
 * Observation Provider Service
 * Centralized service to provide real observed data to all forecast engines
 */

import pool from '../config/database';

export interface ObservedConditions {
  temperature: {
    base?: number;
    mid?: number;
    summit?: number;
  };
  observedAt: Date;
  source: string;
  reliability: 'high' | 'medium' | 'low';
}

export class ObservationProvider {
  /**
   * Get latest observed temperatures for a resort
   */
  async getLatestTemperatures(resortId: string): Promise<ObservedConditions | null> {
    try {
      // Get observations from last 2 hours
      const result = await pool.query(
        `SELECT elevation_band, value_numeric, observed_at, source
         FROM observations
         WHERE resort_id = $1
         AND observation_type = 'temperature'
         AND observed_at >= NOW() - INTERVAL '2 hours'
         ORDER BY observed_at DESC`,
        [resortId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const temperatures: ObservedConditions = {
        temperature: {},
        observedAt: result.rows[0].observed_at,
        source: result.rows[0].source,
        reliability: 'high' // Default to high for now
      };

      // Group by elevation band (take most recent for each)
      const elevationMap = new Map<string, number>();
      for (const row of result.rows) {
        if (!elevationMap.has(row.elevation_band)) {
          elevationMap.set(row.elevation_band, parseFloat(row.value_numeric));
        }
      }

      temperatures.temperature.base = elevationMap.get('base');
      temperatures.temperature.mid = elevationMap.get('mid');
      temperatures.temperature.summit = elevationMap.get('summit');

      return temperatures;
    } catch (error) {
      console.error('Error fetching observed temperatures:', error);
      return null;
    }
  }

  /**
   * Calculate freezing level from observed temperatures
   * Uses temperature gradient between elevations to estimate freezing level
   */
  calculateFreezingLevel(observed: ObservedConditions, resortElevations: {
    base: number;
    mid: number;
    summit: number;
  }): number | null {
    const temps = observed.temperature;

    // Need at least 2 elevation points to calculate gradient
    const points: Array<{ elevation: number; temp: number }> = [];
    
    if (temps.base !== undefined) points.push({ elevation: resortElevations.base, temp: temps.base });
    if (temps.mid !== undefined) points.push({ elevation: resortElevations.mid, temp: temps.mid });
    if (temps.summit !== undefined) points.push({ elevation: resortElevations.summit, temp: temps.summit });

    if (points.length < 2) {
      return null;
    }

    // Calculate temperature gradient (°C per meter)
    // Using linear regression for best fit
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = points.length;

    for (const point of points) {
      sumX += point.elevation;
      sumY += point.temp;
      sumXY += point.elevation * point.temp;
      sumX2 += point.elevation * point.elevation;
    }

    const gradient = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - gradient * sumX) / n;

    // Find elevation where temperature = 0°C
    // temp = gradient * elevation + intercept
    // 0 = gradient * elevation + intercept
    // elevation = -intercept / gradient
    
    if (Math.abs(gradient) < 0.0001) {
      // Gradient too small, can't calculate
      return null;
    }

    const freezingLevel = -intercept / gradient;

    // Sanity check: freezing level should be reasonable (0-5000m)
    if (freezingLevel < 0 || freezingLevel > 5000) {
      return null;
    }

    console.log(`  Calculated freezing level from observations: ${Math.round(freezingLevel)}m`);
    console.log(`    Temperature gradient: ${(gradient * 1000).toFixed(2)}°C per 1000m`);

    return Math.round(freezingLevel);
  }

  /**
   * Calculate temperature bias between forecast and observations
   * Returns average difference (observed - forecast) for calibration
   */
  async calculateTemperatureBias(
    resortId: string,
    forecastTemps: { base?: number; mid?: number; summit?: number }
  ): Promise<{ base?: number; mid?: number; summit?: number }> {
    const observed = await this.getLatestTemperatures(resortId);
    
    if (!observed) {
      return {};
    }

    const bias: { base?: number; mid?: number; summit?: number } = {};

    if (observed.temperature.base !== undefined && forecastTemps.base !== undefined) {
      bias.base = observed.temperature.base - forecastTemps.base;
    }

    if (observed.temperature.mid !== undefined && forecastTemps.mid !== undefined) {
      bias.mid = observed.temperature.mid - forecastTemps.mid;
    }

    if (observed.temperature.summit !== undefined && forecastTemps.summit !== undefined) {
      bias.summit = observed.temperature.summit - forecastTemps.summit;
    }

    return bias;
  }

  /**
   * Get observation-adjusted forecast temperature
   * Applies recent bias to forecast values
   */
  async getAdjustedForecastTemp(
    resortId: string,
    forecastTemp: number,
    elevation: 'base' | 'mid' | 'summit'
  ): Promise<number> {
    // Get recent bias from last 24 hours
    const biasResult = await pool.query(
      `WITH recent_obs AS (
        SELECT o.value_numeric as observed, ef.temperature_c as forecast
        FROM observations o
        JOIN elevation_forecasts ef ON 
          ef.resort_id = o.resort_id 
          AND ef.elevation_band = o.elevation_band
          AND ABS(EXTRACT(EPOCH FROM (ef.valid_time - o.observed_at))) < 3600
        WHERE o.resort_id = $1
        AND o.elevation_band = $2
        AND o.observation_type = 'temperature'
        AND o.observed_at >= NOW() - INTERVAL '24 hours'
      )
      SELECT AVG(observed - forecast) as avg_bias
      FROM recent_obs`,
      [resortId, elevation]
    );

    if (biasResult.rows.length > 0 && biasResult.rows[0].avg_bias !== null) {
      const bias = parseFloat(biasResult.rows[0].avg_bias);
      console.log(`  Applying temperature bias for ${elevation}: ${bias.toFixed(2)}°C`);
      return forecastTemp + bias;
    }

    return forecastTemp;
  }
}

export const observationProvider = new ObservationProvider();
