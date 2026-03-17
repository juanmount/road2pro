/**
 * Multi-Model Fetcher for Open-Meteo
 * Fetches ECMWF, GFS, and GEFS in parallel
 */

import { OpenMeteoProvider } from './adapter';
import { Resort, NormalizedForecast } from '../../domain/models';

export interface MultiModelResult {
  ecmwf?: NormalizedForecast;
  gfs?: NormalizedForecast;
  gefs?: NormalizedForecast;
  errors: Array<{ model: string; error: string }>;
}

export class MultiModelFetcher {
  private provider: OpenMeteoProvider;
  
  constructor() {
    this.provider = new OpenMeteoProvider();
  }
  
  /**
   * Fetch all three models in parallel
   */
  async fetchAllModels(resort: Resort): Promise<MultiModelResult> {
    const timeRange = {
      start: new Date(),
      end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    };
    
    const errors: Array<{ model: string; error: string }> = [];
    
    // Fetch all models in parallel
    const [ecmwfResult, gfsResult, gefsResult] = await Promise.allSettled([
      this.fetchModel(resort, timeRange, 'ecmwf-ifs'),
      this.fetchModel(resort, timeRange, 'gfs'),
      this.fetchModel(resort, timeRange, 'gefs')
    ]);
    
    // Process results
    const result: MultiModelResult = { errors };
    
    if (ecmwfResult.status === 'fulfilled') {
      result.ecmwf = ecmwfResult.value;
    } else {
      errors.push({ model: 'ecmwf-ifs', error: ecmwfResult.reason.message });
      console.error('ECMWF fetch failed:', ecmwfResult.reason);
    }
    
    if (gfsResult.status === 'fulfilled') {
      result.gfs = gfsResult.value;
    } else {
      errors.push({ model: 'gfs', error: gfsResult.reason.message });
      console.error('GFS fetch failed:', gfsResult.reason);
    }
    
    if (gefsResult.status === 'fulfilled') {
      result.gefs = gefsResult.value;
    } else {
      errors.push({ model: 'gefs', error: gefsResult.reason.message });
      console.error('GEFS fetch failed:', gefsResult.reason);
    }
    
    return result;
  }
  
  /**
   * Fetch a single model
   */
  private async fetchModel(
    resort: Resort,
    timeRange: { start: Date; end: Date },
    model: 'ecmwf-ifs' | 'gfs' | 'gefs'
  ): Promise<NormalizedForecast> {
    const raw = await this.provider.fetchForecast(resort, timeRange, {
      models: [model]
    });
    
    return await this.provider.normalizeForecast(raw, resort);
  }
}
