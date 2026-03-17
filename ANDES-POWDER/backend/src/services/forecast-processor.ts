import pool from '../config/database';
import { Resort, ElevationBand, OpenMeteoResponse } from '../types';
import { openMeteoService } from './open-meteo';
import { powderScoreCalculator } from './powder-score';
import { bestWindowCalculator } from './best-window';
import { SnowAccumulationCalculator } from '../engine/snow-accumulation';
import { SnowRealityEngine } from '../engine/snow-reality-engine';
import { WindImpactEngine } from '../engine/wind-impact-engine';

export class ForecastProcessor {
  private snowCalculator = new SnowAccumulationCalculator();
  private snowRealityEngine = new SnowRealityEngine();
  private windImpactEngine = new WindImpactEngine();

  async processResortForecast(resort: Resort): Promise<void> {
    console.log(`Processing forecast for ${resort.name}...`);

    const forecasts = await openMeteoService.getMultiElevationForecast(
      resort.latitude,
      resort.longitude,
      resort.baseElevation,
      resort.midElevation,
      resort.summitElevation
    );

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const snapshotResult = await client.query(
        `INSERT INTO forecast_snapshots (resort_id, fetched_at, source, valid_from, valid_until)
         VALUES ($1, NOW(), 'open-meteo', NOW(), NOW() + INTERVAL '3 hours')
         RETURNING id`,
        [resort.id]
      );
      const snapshotId = snapshotResult.rows[0].id;

      await this.processElevationBand(client, snapshotId, resort, 'base', forecasts.base);
      await this.processElevationBand(client, snapshotId, resort, 'mid', forecasts.mid);
      await this.processElevationBand(client, snapshotId, resort, 'summit', forecasts.summit);

      await client.query('COMMIT');
      console.log(`✓ Forecast processed for ${resort.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error processing forecast for ${resort.name}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async processElevationBand(
    client: any,
    snapshotId: string,
    resort: Resort,
    elevationBand: ElevationBand,
    forecast: OpenMeteoResponse
  ): Promise<void> {
    const hourlyData = forecast.hourly;
    
    // Debug: Check if freezing level data is available
    if (elevationBand === 'mid') {
      console.log('Hourly data keys:', Object.keys(hourlyData));
      console.log('Has freezinglevel_height:', 'freezinglevel_height' in hourlyData);
      if (hourlyData.freezinglevel_height) {
        console.log('First 3 freezing levels:', hourlyData.freezinglevel_height.slice(0, 3));
      }
    }
    
    for (let i = 0; i < hourlyData.time.length; i++) {
      const timestamp = new Date(hourlyData.time[i]);
      const temperature = hourlyData.temperature_2m[i];
      const precipitation = hourlyData.precipitation[i];
      const freezingLevel = hourlyData.freezinglevel_height?.[i] || 2000;

      // Determine precipitation type based on temperature and freezing level
      const precipitationType = powderScoreCalculator.determinePrecipitationType(
        temperature,
        precipitation,
        hourlyData.snowfall?.[i] || 0
      );

      // Calculate snow ratio based on phase
      let snowRatio = 0;
      if (precipitationType === 'snow') snowRatio = 1.0;
      else if (precipitationType === 'mixed') snowRatio = 0.5;
      else if (precipitationType === 'rain') snowRatio = 0.0;

      // Calculate raw snowfall from precipitation
      const rawSnowfall = this.snowCalculator.calculateSnowfall(
        precipitation,
        snowRatio,
        temperature
      );

      // Get elevation in meters for this band
      const elevationMeters = elevationBand === 'base' ? resort.baseElevation :
                              elevationBand === 'mid' ? resort.midElevation :
                              resort.summitElevation;

      // Apply Snow Reality adjustments manually (simplified version)
      let adjustedSnowfall = rawSnowfall;
      
      if (rawSnowfall > 0) {
        // 1. Wind loss (0-40% based on wind speed and elevation)
        const windSpeed = hourlyData.wind_speed_10m[i];
        const windGust = hourlyData.wind_gusts_10m?.[i] || windSpeed * 1.3;
        const elevationMultiplier = elevationBand === 'summit' ? 1.5 : elevationBand === 'mid' ? 1.2 : 1.0;
        const windLoss = Math.min(0.40, ((windSpeed / 50) * 0.30 + (windGust / 80) * 0.10) * elevationMultiplier);
        
        // 2. Rain contamination (based on freezing level margin)
        const margin = freezingLevel - elevationMeters;
        let rainLoss = 0;
        if (margin < 100) rainLoss = 0.30; // 30% loss if very close
        else if (margin < 300) rainLoss = 0.20; // 20% loss if close
        else if (margin < 600) rainLoss = 0.08; // 8% loss if moderate
        
        // 3. Density adjustment (temperature-based)
        let densityAdj = 0;
        if (temperature < -8) densityAdj = 0.15; // Light powder, more depth
        else if (temperature < -4) densityAdj = 0.05;
        else if (temperature > 0) densityAdj = -0.10; // Wet snow, less depth
        
        // 4. Solar melt (daytime hours only)
        const hour = new Date(hourlyData.time[i]).getHours();
        const month = new Date(hourlyData.time[i]).getMonth() + 1;
        let solarLoss = 0;
        if (hour >= 10 && hour <= 16) {
          if ((month >= 3 && month <= 5) && temperature > 0) solarLoss = 0.12; // Autumn
          else if (temperature > 0) solarLoss = 0.05; // Winter
        }
        
        // Apply all adjustments
        adjustedSnowfall = rawSnowfall * (1 - windLoss) * (1 - rainLoss) * (1 + densityAdj) * (1 - solarLoss);
        adjustedSnowfall = Math.max(0, adjustedSnowfall);
      }

      const calculatedSnowfall = adjustedSnowfall;

      const snowfall24h = this.calculateSnowfall24h(hourlyData.snowfall, i);
      const snowfall48h = this.calculateSnowfall48h(hourlyData.snowfall, i);
      const overnightMinTemp = this.calculateOvernightMinTemp(hourlyData.temperature_2m, i);

      const powderScore = powderScoreCalculator.calculate({
        snowfall24h,
        snowfall48h,
        temperature,
        overnightMinTemp,
        windSpeed: hourlyData.wind_speed_10m[i],
        windGust: hourlyData.wind_gusts_10m[i],
        precipitationType,
      });

      await client.query(
        `INSERT INTO hourly_forecasts (
          snapshot_id, resort_id, timestamp, elevation_band,
          temperature, feels_like, precipitation, precipitation_type,
          snow_depth, wind_speed, wind_gust, wind_direction,
          cloud_cover, visibility, powder_score, freezing_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (snapshot_id, timestamp, elevation_band) DO NOTHING`,
        [
          snapshotId,
          resort.id,
          timestamp,
          elevationBand,
          temperature,
          hourlyData.apparent_temperature[i],
          precipitation,
          precipitationType,
          calculatedSnowfall,
          hourlyData.wind_speed_10m[i],
          hourlyData.wind_gusts_10m[i],
          hourlyData.wind_direction_10m[i],
          hourlyData.cloud_cover[i],
          hourlyData.visibility[i],
          powderScore,
          hourlyData.freezinglevel_height?.[i] || null,
        ]
      );
    }

    await this.processDailyForecasts(client, snapshotId, resort.id, elevationBand);
  }

  private async processDailyForecasts(
    client: any,
    snapshotId: string,
    resortId: string,
    elevationBand: ElevationBand
  ): Promise<void> {
    const hourlyResult = await client.query(
      `SELECT * FROM hourly_forecasts 
       WHERE snapshot_id = $1 AND elevation_band = $2 
       ORDER BY timestamp`,
      [snapshotId, elevationBand]
    );

    const hourlyForecasts = hourlyResult.rows;
    const dailyGroups = this.groupByDate(hourlyForecasts);

    for (const [date, forecasts] of Object.entries(dailyGroups)) {
      const temps = forecasts.map((f: any) => parseFloat(f.temperature) || 0).filter((t: number) => !isNaN(t));
      const snowfalls = forecasts.map((f: any) => parseFloat(f.precipitation) || 0).filter((s: number) => !isNaN(s));
      const winds = forecasts.map((f: any) => parseFloat(f.wind_speed) || 0).filter((w: number) => !isNaN(w));
      const powderScores = forecasts.map((f: any) => parseFloat(f.powder_score) || 0).filter((p: number) => !isNaN(p));

      if (temps.length === 0 || powderScores.length === 0) continue;

      const overnightMinTemp = this.getOvernightMinTemp(forecasts);
      const freezeQuality = powderScoreCalculator.determineFreezeQuality(overnightMinTemp);

      const bestWindow = bestWindowCalculator.calculate(forecasts);

      const baseTemp = temps[0] || 0;
      const midTemp = temps[Math.floor(temps.length / 2)] || 0;
      const summitTemp = temps[temps.length - 1] || 0;
      const totalSnow = snowfalls.reduce((sum: number, s: number) => sum + s, 0);

      const conditionsSummary = powderScoreCalculator.generateConditionsSummary(
        baseTemp,
        midTemp,
        summitTemp,
        totalSnow,
        totalSnow,
        totalSnow,
        freezeQuality,
        Math.max(...winds, 0)
      );

      const tempMin = Math.min(...temps);
      const tempMax = Math.max(...temps);
      const windMax = Math.max(...winds, 0);
      const powderScoreAvg = powderScores.reduce((sum: number, s: number) => sum + s, 0) / powderScores.length;
      const powderScoreMax = Math.max(...powderScores, 0);

      await client.query(
        `INSERT INTO daily_forecasts (
          snapshot_id, resort_id, date, elevation_band,
          temp_min, temp_max, snowfall_total, precipitation_total,
          wind_max, powder_score_avg, powder_score_max,
          best_window_start, best_window_end, best_window_reason,
          freeze_quality, conditions_summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (snapshot_id, date, elevation_band) DO NOTHING`,
        [
          snapshotId,
          resortId,
          date,
          elevationBand,
          tempMin,
          tempMax,
          totalSnow,
          totalSnow,
          windMax,
          powderScoreAvg,
          powderScoreMax,
          bestWindow?.start || null,
          bestWindow?.end || null,
          bestWindow?.reason || null,
          freezeQuality,
          conditionsSummary,
        ]
      );
    }
  }

  private calculateSnowfall24h(snowfallArray: number[], currentIndex: number): number {
    const start = Math.max(0, currentIndex - 24);
    return snowfallArray.slice(start, currentIndex + 1).reduce((sum, val) => sum + val, 0);
  }

  private calculateSnowfall48h(snowfallArray: number[], currentIndex: number): number {
    const start = Math.max(0, currentIndex - 48);
    return snowfallArray.slice(start, currentIndex + 1).reduce((sum, val) => sum + val, 0);
  }

  private calculateOvernightMinTemp(tempArray: number[], currentIndex: number): number {
    const start = Math.max(0, currentIndex - 12);
    const overnightTemps = tempArray.slice(start, currentIndex + 1);
    return Math.min(...overnightTemps);
  }

  private groupByDate(forecasts: any[]): Record<string, any[]> {
    return forecasts.reduce((groups, forecast) => {
      const date = new Date(forecast.timestamp).toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(forecast);
      return groups;
    }, {} as Record<string, any[]>);
  }

  private getOvernightMinTemp(forecasts: any[]): number {
    const nightForecasts = forecasts.filter((f: any) => {
      const hour = new Date(f.timestamp).getHours();
      return hour >= 22 || hour <= 6;
    });
    
    if (nightForecasts.length === 0) return 0;
    
    return Math.min(...nightForecasts.map((f: any) => f.temperature));
  }
}

export const forecastProcessor = new ForecastProcessor();
