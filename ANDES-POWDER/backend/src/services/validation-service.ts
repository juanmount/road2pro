import axios from 'axios';
import * as cheerio from 'cheerio';
import pool from '../config/database';

interface ForecastComparison {
  resort_id: string;
  resort_name: string;
  forecast_date: string;
  target_date: string;
  ap_snowfall_base?: number;
  ap_snowfall_mid?: number;
  ap_snowfall_summit?: number;
  ap_wind_base?: number;
  ap_wind_summit?: number;
  ap_temp_base?: number;
  ap_temp_summit?: number;
  ap_freezing_level?: number;
  ap_storm_crossing_score?: number;
  ts_precipitation?: number;
  ts_freezing_level?: number;
  ts_source_url?: string;
  mf_snowfall_base?: number;
  mf_snowfall_summit?: number;
  mf_wind?: number;
  mf_temp?: number;
  mf_source_url?: string;
}

interface ValidationData {
  actual_snowfall_base?: number;
  actual_snowfall_mid?: number;
  actual_snowfall_summit?: number;
  actual_wind?: number;
  actual_temp?: number;
  actual_source: string;
  actual_notes?: string;
}

export class ValidationService {
  /**
   * Fetch Andes Powder forecast from our own database
   */
  async fetchAndesPowderForecast(resortId: string, targetDate: string): Promise<any> {
    try {
      const query = `
        SELECT 
          base_snowfall_24h,
          mid_snowfall_24h,
          summit_snowfall_24h,
          wind_speed,
          temperature,
          freezing_level
        FROM hourly_forecasts
        WHERE resort_id = $1
          AND forecast_time::date = $2::date
        ORDER BY forecast_time
        LIMIT 24
      `;
      
      const result = await pool.query(query, [resortId, targetDate]);
      
      if (result.rows.length === 0) {
        return null;
      }

      // Aggregate 24h data
      const totals = result.rows.reduce((acc, row) => ({
        base: acc.base + (row.base_snowfall_24h || 0),
        mid: acc.mid + (row.mid_snowfall_24h || 0),
        summit: acc.summit + (row.summit_snowfall_24h || 0),
        wind: acc.wind + (row.wind_speed || 0),
        temp: acc.temp + (row.temperature || 0),
        freezingLevel: acc.freezingLevel + (row.freezing_level || 0),
        count: acc.count + 1
      }), { base: 0, mid: 0, summit: 0, wind: 0, temp: 0, freezingLevel: 0, count: 0 });

      return {
        snowfall_base: Math.round(totals.base),
        snowfall_mid: Math.round(totals.mid),
        snowfall_summit: Math.round(totals.summit),
        wind: Math.round(totals.wind / totals.count),
        temp: Math.round(totals.temp / totals.count),
        freezing_level: Math.round(totals.freezingLevel / totals.count)
      };
    } catch (error) {
      console.error('[VALIDATION] Error fetching Andes Powder forecast:', error);
      return null;
    }
  }

  /**
   * Scrape tiempodesur.com for forecast
   */
  async fetchTiempodesurForecast(resortSlug: string, targetDate: string): Promise<any> {
    try {
      const url = `https://tiempodesur.com/nieve/${resortSlug}.html`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Parse precipitation and temperature from forecast table
      // Note: This is a simplified parser - actual implementation depends on HTML structure
      let snowfall = 0;
      let temp = 0;
      let freezingLevel = 0;

      // Look for precipitation data (mm)
      $('.forecast-table tr').each((i, row) => {
        const dateCell = $(row).find('td').first().text();
        if (dateCell.includes(targetDate)) {
          const precipMm = parseFloat($(row).find('.precip').text()) || 0;
          const tempC = parseFloat($(row).find('.temp').text()) || 0;
          
          // Simple conversion: assume 1mm precip = 1cm snow if temp < 0
          snowfall = tempC < 0 ? precipMm * 10 : 0;
          temp = tempC;
          
          // Extract isoterma 0° if available
          const isotermaText = $(row).find('.isoterma').text();
          const isotermaMatch = isotermaText.match(/(\d+)/);
          if (isotermaMatch) {
            freezingLevel = parseInt(isotermaMatch[1]);
          }
        }
      });

      return snowfall > 0 ? {
        snowfall_summit: Math.round(snowfall),
        temp,
        freezing_level: freezingLevel
      } : null;
    } catch (error) {
      console.error('[VALIDATION] Error scraping tiempodesur:', error);
      return null;
    }
  }

  /**
   * Scrape Mountain-Forecast.com for forecast
   */
  async fetchMountainForecast(peakId: string, targetDate: string): Promise<any> {
    try {
      const url = `https://www.mountain-forecast.com/peaks/${peakId}/forecasts/2405`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Parse forecast table by elevation
      // Note: Simplified parser - actual implementation depends on HTML structure
      let baseSnow = 0;
      let midSnow = 0;
      let summitSnow = 0;
      let wind = 0;
      let temp = 0;

      // Mountain-Forecast shows 3 elevations: bottom, mid, top
      $('.forecast__table tr').each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length > 0) {
          // Extract snow, wind, temp from cells
          const snowText = $(cells[0]).find('.snow').text();
          const windText = $(cells[1]).find('.wind').text();
          const tempText = $(cells[2]).find('.temp').text();
          
          const elevation = $(row).attr('data-elevation');
          const snowCm = parseFloat(snowText) || 0;
          
          if (elevation === 'bottom') baseSnow = snowCm;
          if (elevation === 'mid') midSnow = snowCm;
          if (elevation === 'top') summitSnow = snowCm;
          
          wind = parseFloat(windText) || 0;
          temp = parseFloat(tempText) || 0;
        }
      });

      return summitSnow > 0 ? {
        snowfall_base: Math.round(baseSnow),
        snowfall_mid: Math.round(midSnow),
        snowfall_summit: Math.round(summitSnow),
        wind: Math.round(wind),
        temp
      } : null;
    } catch (error) {
      console.error('[VALIDATION] Error scraping Mountain-Forecast:', error);
      return null;
    }
  }

  /**
   * Create a new forecast comparison
   */
  async createComparison(comparison: ForecastComparison): Promise<string> {
    try {
      const query = `
        INSERT INTO forecast_validations (
          resort_id, resort_name, forecast_date, target_date,
          ap_snowfall_base, ap_snowfall_mid, ap_snowfall_summit,
          ap_wind_base, ap_wind_summit, ap_temp_base, ap_temp_summit,
          ap_freezing_level, ap_storm_crossing_score,
          ts_precipitation, ts_freezing_level, ts_source_url,
          mf_snowfall_base, mf_snowfall_summit, mf_wind, mf_temp, mf_source_url
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        RETURNING id
      `;

      const values = [
        comparison.resort_id,
        comparison.resort_name,
        comparison.forecast_date,
        comparison.target_date,
        comparison.ap_snowfall_base,
        comparison.ap_snowfall_mid,
        comparison.ap_snowfall_summit,
        comparison.ap_wind_base,
        comparison.ap_wind_summit,
        comparison.ap_temp_base,
        comparison.ap_temp_summit,
        comparison.ap_freezing_level,
        comparison.ap_storm_crossing_score,
        comparison.ts_precipitation,
        comparison.ts_freezing_level,
        comparison.ts_source_url,
        comparison.mf_snowfall_base,
        comparison.mf_snowfall_summit,
        comparison.mf_wind,
        comparison.mf_temp,
        comparison.mf_source_url
      ];

      const result = await pool.query(query, values);
      const comparisonId = result.rows[0].id;

      console.log(`[VALIDATION] Created comparison: ${comparisonId}`);
      return comparisonId;
    } catch (error) {
      console.error('[VALIDATION] Error creating comparison:', error);
      throw error;
    }
  }

  /**
   * Validate a comparison with actual conditions
   */
  async validateComparison(comparisonId: string, validation: ValidationData): Promise<void> {
    try {
      const query = `
        UPDATE forecast_validations
        SET 
          actual_snowfall_base = $1,
          actual_snowfall_mid = $2,
          actual_snowfall_summit = $3,
          actual_wind = $4,
          actual_temp = $5,
          actual_source = $6,
          actual_notes = $7,
          status = 'validated',
          validated_at = NOW()
        WHERE id = $8
      `;

      await pool.query(query, [
        validation.actual_snowfall_base,
        validation.actual_snowfall_mid,
        validation.actual_snowfall_summit,
        validation.actual_wind,
        validation.actual_temp,
        validation.actual_source,
        validation.actual_notes,
        comparisonId
      ]);

      // Calculate accuracy and determine winner
      await pool.query('SELECT calculate_forecast_accuracy($1)', [comparisonId]);
      
      // Update summary statistics
      const compResult = await pool.query('SELECT resort_id FROM forecast_validations WHERE id = $1', [comparisonId]);
      if (compResult.rows.length > 0) {
        await pool.query('SELECT update_validation_summary($1)', [compResult.rows[0].resort_id]);
      }

      console.log(`[VALIDATION] Validated comparison: ${comparisonId}`);
    } catch (error) {
      console.error('[VALIDATION] Error validating comparison:', error);
      throw error;
    }
  }

  /**
   * Run weekly forecast comparison for all resorts
   */
  async runWeeklyComparison(): Promise<void> {
    console.log('[VALIDATION] Starting weekly forecast comparison...');

    const resorts = [
      { id: 'catedral', name: 'Cerro Catedral', slug: 'cerro-catedral', peakId: 'Cerro-Catedral' },
      { id: 'chapelco', name: 'Cerro Chapelco', slug: 'cerro-chapelco', peakId: 'Cerro-Chapelco' },
      { id: 'bayo', name: 'Cerro Bayo', slug: 'cerro-bayo', peakId: 'Cerro-Bayo' },
      { id: 'castor', name: 'Cerro Castor', slug: 'cerro-castor', peakId: 'Cerro-Castor' }
    ];

    const daysAhead = [1, 3, 7]; // Compare 1-day, 3-day, 7-day forecasts
    const forecastDate = new Date().toISOString().split('T')[0];

    for (const resort of resorts) {
      for (const days of daysAhead) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        console.log(`[VALIDATION] Comparing forecasts for ${resort.id}, ${days} days ahead`);

        // Fetch all forecasts
        const [apForecast, tsForecast, mfForecast] = await Promise.all([
          this.fetchAndesPowderForecast(resort.id, targetDateStr),
          this.fetchTiempodesurForecast(resort.slug, targetDateStr),
          this.fetchMountainForecast(resort.peakId, targetDateStr)
        ]);

        // Create comparison if we have at least our own forecast
        if (apForecast) {
          const comparison: ForecastComparison = {
            resort_id: resort.id,
            resort_name: resort.name,
            forecast_date: forecastDate,
            target_date: targetDateStr,
            ap_snowfall_base: apForecast.snowfall_base,
            ap_snowfall_mid: apForecast.snowfall_mid,
            ap_snowfall_summit: apForecast.snowfall_summit,
            ap_wind_base: apForecast.wind,
            ap_wind_summit: apForecast.wind,
            ap_temp_base: apForecast.temp,
            ap_temp_summit: apForecast.temp,
            ap_freezing_level: apForecast.freezing_level,
            ts_precipitation: tsForecast?.snowfall_summit,
            ts_freezing_level: tsForecast?.freezing_level,
            mf_snowfall_base: mfForecast?.snowfall_base,
            mf_snowfall_summit: mfForecast?.snowfall_summit,
            mf_wind: mfForecast?.wind,
            mf_temp: mfForecast?.temp
          };

          await this.createComparison(comparison);
        }
      }
    }

    console.log('[VALIDATION] Weekly comparison complete');
  }

  /**
   * Get validation statistics for a resort
   */
  async getStatistics(resortId: string, periodStart?: string, periodEnd?: string): Promise<any> {
    try {
      let query = `
        SELECT * FROM validation_summary
        WHERE resort_id = $1
      `;
      const params: any[] = [resortId];

      if (periodStart && periodEnd) {
        query += ` AND period_start >= $2 AND period_end <= $3`;
        params.push(periodStart, periodEnd);
      }

      const result = await pool.query(query, params);
      return result.rows[0] || null;
    } catch (error) {
      console.error('[VALIDATION] Error fetching statistics:', error);
      throw error;
    }
  }
}

export const validationService = new ValidationService();
