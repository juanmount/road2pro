import { supabase } from '../config/supabase';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface ForecastComparison {
  forecastDate: Date;
  targetDate: Date;
  resortId: string;
  resortName: string;
  
  // Andes Powder
  apSnowfallBase?: number;
  apSnowfallMid?: number;
  apSnowfallSummit?: number;
  apWindBase?: number;
  apWindSummit?: number;
  apFreezingLevel?: number;
  apTempBase?: number;
  apTempSummit?: number;
  apStormCrossingScore?: number;
  
  // tiempodesur
  tsPrecipitation?: number;
  tsFreezingLevel?: number;
  tsSourceUrl?: string;
  
  // Mountain-Forecast
  mfSnowfallBase?: number;
  mfSnowfallSummit?: number;
  mfWind?: number;
  mfTemp?: number;
  mfSourceUrl?: string;
}

interface ValidationResult {
  actualSnowfallBase?: number;
  actualSnowfallSummit?: number;
  actualWind?: number;
  actualTemp?: number;
  actualSource: string;
  actualNotes?: string;
}

class ValidationService {
  /**
   * Fetch Andes Powder forecast for comparison
   */
  async fetchAndesPowderForecast(resortId: string, targetDate: Date): Promise<Partial<ForecastComparison>> {
    try {
      // Query daily forecasts from Supabase
      const targetDateStr = targetDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('elevation_forecasts')
        .select('elevation_band, snowfall_cm_corrected, wind_speed_kmh, temperature_c, freezing_level_m')
        .eq('resort_id', resortId)
        .gte('valid_time', `${targetDateStr}T00:00:00`)
        .lt('valid_time', `${targetDateStr}T23:59:59`);
      
      if (error || !data || data.length === 0) {
        console.log(`[VALIDATION] No Andes Powder forecast found for ${targetDateStr}`);
        return {};
      }
      
      // Aggregate by elevation band
      const aggregated: Record<string, any> = {};
      data.forEach((row: any) => {
        if (!aggregated[row.elevation_band]) {
          aggregated[row.elevation_band] = {
            snowfall: 0,
            wind: 0,
            temp: 0,
            freezing: 0,
            count: 0
          };
        }
        aggregated[row.elevation_band].snowfall += row.snowfall_cm_corrected || 0;
        aggregated[row.elevation_band].wind += row.wind_speed_kmh || 0;
        aggregated[row.elevation_band].temp += row.temperature_c || 0;
        aggregated[row.elevation_band].freezing += row.freezing_level_m || 0;
        aggregated[row.elevation_band].count++;
      });
      
      const baseData = aggregated['base'];
      const midData = aggregated['mid'];
      const summitData = aggregated['summit'];
      
      return {
        apSnowfallBase: baseData?.snowfall,
        apSnowfallMid: midData?.snowfall,
        apSnowfallSummit: summitData?.snowfall,
        apWindBase: baseData ? baseData.wind / baseData.count : undefined,
        apWindSummit: summitData ? summitData.wind / summitData.count : undefined,
        apFreezingLevel: summitData ? summitData.freezing / summitData.count : undefined,
        apTempBase: baseData ? baseData.temp / baseData.count : undefined,
        apTempSummit: summitData ? summitData.temp / summitData.count : undefined,
      };
    } catch (error) {
      console.error('[VALIDATION] Error fetching Andes Powder forecast:', error);
      return {};
    }
  }
  
  /**
   * Scrape tiempodesur.com forecast
   */
  async fetchTiempodesurForecast(resortName: string, targetDate: Date): Promise<Partial<ForecastComparison>> {
    try {
      // Map resort names to tiempodesur URLs
      const resortUrls: Record<string, string> = {
        'catedral': 'https://tiempodesur.com/nieve/cerro-catedral.html',
        'chapelco': 'https://tiempodesur.com/nieve/chapelco.html',
        'bayo': 'https://tiempodesur.com/nieve/cerro-bayo.html',
      };
      
      const resortKey = resortName.toLowerCase().includes('catedral') ? 'catedral' :
                        resortName.toLowerCase().includes('chapelco') ? 'chapelco' :
                        resortName.toLowerCase().includes('bayo') ? 'bayo' : null;
      
      if (!resortKey || !resortUrls[resortKey]) {
        console.log(`[VALIDATION] No tiempodesur URL for resort: ${resortName}`);
        return {};
      }
      
      const url = resortUrls[resortKey];
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
        },
        timeout: 15000,
        validateStatus: (status) => status < 500, // Accept 404, will handle below
      });
      
      if (response.status === 404) {
        console.log(`[VALIDATION] tiempodesur page not found: ${url}`);
        return { tsSourceUrl: url };
      }
      
      const $ = cheerio.load(response.data);
      
      // Calculate days ahead for target date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);
      const daysAhead = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysAhead < 0 || daysAhead > 7) {
        console.log(`[VALIDATION] Target date out of range for tiempodesur (${daysAhead} days ahead)`);
        return { tsSourceUrl: url };
      }
      
      // tiempodesur uses GFS model and shows precipitation bars
      // Try multiple selectors to find precipitation data
      let precipitation: number | undefined;
      let freezingLevel: number | undefined;
      
      // Look for precipitation data in various possible formats
      // This is a flexible approach that tries multiple patterns
      const precipSelectors = [
        `.day-${daysAhead} .precip`,
        `.forecast-day:nth-child(${daysAhead + 1}) .precipitation`,
        `[data-day="${daysAhead}"] .precip-value`,
      ];
      
      for (const selector of precipSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          const text = element.text().trim();
          const value = parseFloat(text.replace(/[^\d.]/g, ''));
          if (!isNaN(value)) {
            precipitation = value;
            break;
          }
        }
      }
      
      // Look for freezing level (isoterma 0°C)
      const freezingSelectors = [
        `.day-${daysAhead} .freezing-level`,
        `.forecast-day:nth-child(${daysAhead + 1}) .iso-zero`,
        `[data-day="${daysAhead}"] .isoterma`,
      ];
      
      for (const selector of freezingSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          const text = element.text().trim();
          const value = parseFloat(text.replace(/[^\d]/g, ''));
          if (!isNaN(value)) {
            freezingLevel = value;
            break;
          }
        }
      }
      
      // If we couldn't parse specific values, log for debugging
      if (!precipitation && !freezingLevel) {
        console.log(`[VALIDATION] Could not parse tiempodesur data for ${resortName}, day ${daysAhead}`);
        console.log(`[VALIDATION] HTML structure may have changed. Manual review needed.`);
      } else {
        console.log(`[VALIDATION] tiempodesur parsed: precip=${precipitation}mm, freezing=${freezingLevel}m`);
      }
      
      return {
        tsSourceUrl: url,
        tsPrecipitation: precipitation,
        tsFreezingLevel: freezingLevel,
      };
    } catch (error: any) {
      console.error('[VALIDATION] Error fetching tiempodesur forecast:', error.message);
      return {};
    }
  }
  
  /**
   * Scrape Mountain-Forecast.com forecast
   */
  async fetchMountainForecast(resortName: string, targetDate: Date): Promise<Partial<ForecastComparison>> {
    try {
      // Map resort names to Mountain-Forecast URLs
      const resortUrls: Record<string, string> = {
        'catedral': 'https://www.mountain-forecast.com/peaks/Cerro-Catedral/forecasts/2405',
        'chapelco': 'https://www.mountain-forecast.com/peaks/Cerro-Chapelco/forecasts/2394',
        'bayo': 'https://www.mountain-forecast.com/peaks/Cerro-Bayo/forecasts/2000',
      };
      
      const resortKey = resortName.toLowerCase().includes('catedral') ? 'catedral' :
                        resortName.toLowerCase().includes('chapelco') ? 'chapelco' :
                        resortName.toLowerCase().includes('bayo') ? 'bayo' : null;
      
      if (!resortKey || !resortUrls[resortKey]) {
        console.log(`[VALIDATION] No Mountain-Forecast URL for resort: ${resortName}`);
        return {};
      }
      
      const url = resortUrls[resortKey];
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 15000,
        validateStatus: (status) => status < 500,
      });
      
      if (response.status === 404) {
        console.log(`[VALIDATION] Mountain-Forecast page not found: ${url}`);
        return { mfSourceUrl: url };
      }
      
      const $ = cheerio.load(response.data);
      
      // Calculate days ahead for target date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);
      const daysAhead = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysAhead < 0 || daysAhead > 6) {
        console.log(`[VALIDATION] Target date out of range for Mountain-Forecast (${daysAhead} days ahead)`);
        return { mfSourceUrl: url };
      }
      
      // Mountain-Forecast shows forecasts in a table format
      // They typically have rows for different elevations (summit, mid, base)
      let snowfallBase: number | undefined;
      let snowfallSummit: number | undefined;
      let wind: number | undefined;
      let temp: number | undefined;
      
      // Try to find the forecast table
      // Mountain-Forecast uses a specific table structure with elevation rows
      const forecastTable = $('.forecast-table, .forecast__table, table.forecast');
      
      if (forecastTable.length > 0) {
        // Look for summit row (usually labeled "Top" or elevation in meters)
        const summitRow = forecastTable.find('tr').filter(function() {
          const text = $(this).find('td:first, th:first').text().toLowerCase();
          return text.includes('top') || text.includes('summit') || text.includes('2405') || text.includes('2394') || text.includes('2000');
        });
        
        // Look for base row
        const baseRow = forecastTable.find('tr').filter(function() {
          const text = $(this).find('td:first, th:first').text().toLowerCase();
          return text.includes('bot') || text.includes('base') || text.includes('1030');
        });
        
        // Extract data from the appropriate column (daysAhead + 1 to account for header)
        const columnIndex = daysAhead + 1;
        
        if (summitRow.length > 0) {
          // Try to find snow value
          const snowCell = summitRow.find(`td:nth-child(${columnIndex}) .snow, td:nth-child(${columnIndex}) .snowfall`);
          if (snowCell.length > 0) {
            const snowText = snowCell.text().trim();
            const snowValue = parseFloat(snowText.replace(/[^\d.]/g, ''));
            if (!isNaN(snowValue)) {
              snowfallSummit = snowValue;
            }
          }
          
          // Try to find wind value
          const windCell = summitRow.find(`td:nth-child(${columnIndex}) .wind`);
          if (windCell.length > 0) {
            const windText = windCell.text().trim();
            const windValue = parseFloat(windText.replace(/[^\d.]/g, ''));
            if (!isNaN(windValue)) {
              wind = windValue;
            }
          }
          
          // Try to find temperature
          const tempCell = summitRow.find(`td:nth-child(${columnIndex}) .temp, td:nth-child(${columnIndex}) .temperature`);
          if (tempCell.length > 0) {
            const tempText = tempCell.text().trim();
            const tempValue = parseFloat(tempText.replace(/[^\d.-]/g, ''));
            if (!isNaN(tempValue)) {
              temp = tempValue;
            }
          }
        }
        
        if (baseRow.length > 0) {
          const snowCell = baseRow.find(`td:nth-child(${columnIndex}) .snow, td:nth-child(${columnIndex}) .snowfall`);
          if (snowCell.length > 0) {
            const snowText = snowCell.text().trim();
            const snowValue = parseFloat(snowText.replace(/[^\d.]/g, ''));
            if (!isNaN(snowValue)) {
              snowfallBase = snowValue;
            }
          }
        }
      }
      
      // Alternative: Try simpler selectors if table structure is different
      if (!snowfallSummit && !snowfallBase) {
        const allSnowElements = $(`.day-${daysAhead} .snow, [data-day="${daysAhead}"] .snowfall`);
        if (allSnowElements.length > 0) {
          const snowText = allSnowElements.first().text().trim();
          const snowValue = parseFloat(snowText.replace(/[^\d.]/g, ''));
          if (!isNaN(snowValue)) {
            snowfallSummit = snowValue; // Assume summit if we can't differentiate
          }
        }
      }
      
      if (!snowfallSummit && !snowfallBase && !wind && !temp) {
        console.log(`[VALIDATION] Could not parse Mountain-Forecast data for ${resortName}, day ${daysAhead}`);
        console.log(`[VALIDATION] HTML structure may have changed. Manual review needed.`);
      } else {
        console.log(`[VALIDATION] Mountain-Forecast parsed: summit=${snowfallSummit}cm, base=${snowfallBase}cm, wind=${wind}km/h, temp=${temp}°C`);
      }
      
      return {
        mfSourceUrl: url,
        mfSnowfallBase: snowfallBase,
        mfSnowfallSummit: snowfallSummit,
        mfWind: wind,
        mfTemp: temp,
      };
    } catch (error: any) {
      console.error('[VALIDATION] Error fetching Mountain-Forecast:', error.message);
      return {};
    }
  }
  
  /**
   * Create a forecast comparison entry
   */
  async createComparison(comparison: ForecastComparison): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('forecast_validations')
        .upsert({
          forecast_date: comparison.forecastDate.toISOString().split('T')[0],
          target_date: comparison.targetDate.toISOString().split('T')[0],
          resort_id: comparison.resortId,
          resort_name: comparison.resortName,
          ap_snowfall_base: comparison.apSnowfallBase,
          ap_snowfall_mid: comparison.apSnowfallMid,
          ap_snowfall_summit: comparison.apSnowfallSummit,
          ap_wind_base: comparison.apWindBase,
          ap_wind_summit: comparison.apWindSummit,
          ap_freezing_level: comparison.apFreezingLevel,
          ap_temp_base: comparison.apTempBase,
          ap_temp_summit: comparison.apTempSummit,
          ap_storm_crossing_score: comparison.apStormCrossingScore,
          ts_precipitation: comparison.tsPrecipitation,
          ts_freezing_level: comparison.tsFreezingLevel,
          ts_source_url: comparison.tsSourceUrl,
          mf_snowfall_base: comparison.mfSnowfallBase,
          mf_snowfall_summit: comparison.mfSnowfallSummit,
          mf_wind: comparison.mfWind,
          mf_temp: comparison.mfTemp,
          mf_source_url: comparison.mfSourceUrl,
        }, {
          onConflict: 'forecast_date,target_date,resort_id'
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('[VALIDATION] Error creating comparison:', error);
        return null;
      }
      
      console.log(`[VALIDATION] Created comparison: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('[VALIDATION] Error creating comparison:', error);
      return null;
    }
  }
  
  /**
   * Validate a forecast comparison with actual results
   */
  async validateComparison(comparisonId: string, validation: ValidationResult): Promise<boolean> {
    try {
      // First, get the comparison to calculate accuracy
      const { data: comparison, error: fetchError } = await supabase
        .from('forecast_validations')
        .select('*')
        .eq('id', comparisonId)
        .single();
      
      if (fetchError || !comparison) {
        console.error('[VALIDATION] Comparison not found:', comparisonId);
        return false;
      }
      
      // Calculate accuracy for each metric
      const apSnowfallAccuracy = validation.actualSnowfallSummit && comparison.ap_snowfall_summit
        ? this.calculateAccuracy(comparison.ap_snowfall_summit, validation.actualSnowfallSummit)
        : null;
      
      const tsSnowfallAccuracy = validation.actualSnowfallSummit && comparison.ts_precipitation
        ? this.calculateAccuracy(comparison.ts_precipitation, validation.actualSnowfallSummit)
        : null;
      
      const mfSnowfallAccuracy = validation.actualSnowfallSummit && comparison.mf_snowfall_summit
        ? this.calculateAccuracy(comparison.mf_snowfall_summit, validation.actualSnowfallSummit)
        : null;
      
      const apWindAccuracy = validation.actualWind && comparison.ap_wind_summit
        ? this.calculateAccuracy(comparison.ap_wind_summit, validation.actualWind)
        : null;
      
      const apTempAccuracy = validation.actualTemp && comparison.ap_temp_summit
        ? this.calculateAccuracy(comparison.ap_temp_summit, validation.actualTemp)
        : null;
      
      // Determine winner (based on snowfall accuracy)
      let winner = null;
      if (apSnowfallAccuracy !== null || tsSnowfallAccuracy !== null || mfSnowfallAccuracy !== null) {
        const accuracies = [
          { name: 'andes_powder', value: apSnowfallAccuracy || 0 },
          { name: 'tiempodesur', value: tsSnowfallAccuracy || 0 },
          { name: 'mountain_forecast', value: mfSnowfallAccuracy || 0 },
        ];
        winner = accuracies.reduce((max, curr) => curr.value > max.value ? curr : max).name;
      }
      
      // Update the comparison with validation data
      const { error: updateError } = await supabase
        .from('forecast_validations')
        .update({
          actual_snowfall_base: validation.actualSnowfallBase,
          actual_snowfall_summit: validation.actualSnowfallSummit,
          actual_wind: validation.actualWind,
          actual_temp: validation.actualTemp,
          actual_source: validation.actualSource,
          actual_notes: validation.actualNotes,
          validated_at: new Date().toISOString(),
          ap_snowfall_accuracy: apSnowfallAccuracy,
          ts_snowfall_accuracy: tsSnowfallAccuracy,
          mf_snowfall_accuracy: mfSnowfallAccuracy,
          ap_wind_accuracy: apWindAccuracy,
          ap_temp_accuracy: apTempAccuracy,
          winner,
        })
        .eq('id', comparisonId);
      
      if (updateError) {
        console.error('[VALIDATION] Error updating validation:', updateError);
        return false;
      }
      
      console.log(`[VALIDATION] Validated comparison ${comparisonId}, winner: ${winner}`);
      
      // Update summary statistics
      await this.updateSummary(comparison.resort_id);
      
      return true;
    } catch (error) {
      console.error('[VALIDATION] Error validating comparison:', error);
      return false;
    }
  }
  
  /**
   * Calculate accuracy percentage
   */
  private calculateAccuracy(forecast: number, actual: number): number {
    if (actual === 0) {
      return forecast === 0 ? 100 : 0;
    }
    return Math.max(0, 100 - (Math.abs(forecast - actual) / actual * 100));
  }
  
  /**
   * Update validation summary for a resort
   */
  private async updateSummary(resortId: string): Promise<void> {
    try {
      // Update summary for current month
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      await supabase.rpc('update_validation_summary', {
        p_resort_id: resortId,
        p_period_start: periodStart.toISOString().split('T')[0],
        p_period_end: periodEnd.toISOString().split('T')[0],
      });
      
      console.log(`[VALIDATION] Updated summary for resort ${resortId}`);
    } catch (error) {
      console.error('[VALIDATION] Error updating summary:', error);
    }
  }
  
  /**
   * Run weekly comparison for all resorts
   */
  async runWeeklyComparison(): Promise<void> {
    try {
      console.log('[VALIDATION] Starting weekly forecast comparison...');
      
      // Get all resorts from Supabase
      const { data: resorts, error } = await supabase
        .from('resorts')
        .select('id, name');
      
      if (error || !resorts) {
        console.error('[VALIDATION] Error fetching resorts:', error);
        return;
      }
      const forecastDate = new Date();
      
      // Compare forecasts for next 3 days
      for (let daysAhead = 1; daysAhead <= 3; daysAhead++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysAhead);
        
        for (const resort of resorts) {
          console.log(`[VALIDATION] Comparing forecasts for ${resort.name}, ${daysAhead} days ahead`);
          
          // Fetch all forecasts
          const [apForecast, tsForecast, mfForecast] = await Promise.all([
            this.fetchAndesPowderForecast(resort.id, targetDate),
            this.fetchTiempodesurForecast(resort.name, targetDate),
            this.fetchMountainForecast(resort.name, targetDate),
          ]);
          
          // Create comparison
          const comparison: ForecastComparison = {
            forecastDate,
            targetDate,
            resortId: resort.id,
            resortName: resort.name,
            ...apForecast,
            ...tsForecast,
            ...mfForecast,
          };
          
          await this.createComparison(comparison);
        }
      }
      
      console.log('[VALIDATION] Weekly comparison completed');
    } catch (error) {
      console.error('[VALIDATION] Error in weekly comparison:', error);
    }
  }
  
  /**
   * Get validation statistics
   */
  async getStatistics(resortId?: string, periodStart?: Date, periodEnd?: Date) {
    try {
      let query = supabase.from('validation_summary').select('*');
      
      if (resortId) {
        query = query.eq('resort_id', resortId);
      }
      
      if (periodStart) {
        query = query.gte('period_start', periodStart.toISOString().split('T')[0]);
      }
      
      if (periodEnd) {
        query = query.lte('period_end', periodEnd.toISOString().split('T')[0]);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[VALIDATION] Error fetching statistics:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('[VALIDATION] Error getting statistics:', error);
      return null;
    }
  }
}

export const validationService = new ValidationService();
