/**
 * Multi-Model Fetcher for Open-Meteo
 * Fetches ECMWF, GFS, and GEFS in parallel
 */

import axios from 'axios';
import { OpenMeteoProvider } from './adapter';
import { Resort, NormalizedForecast } from '../../domain/models';

const OPEN_METEO_API_KEY = process.env.OPEN_METEO_API_KEY || '';
const OM_DOMAIN = OPEN_METEO_API_KEY ? 'customer-api.open-meteo.com' : 'api.open-meteo.com';

export interface MultiModelResult {
  ecmwf?: NormalizedForecast;
  gfs?: NormalizedForecast;
  gefs?: NormalizedForecast;
  iconFrz?: Array<{ time: Date; heightM: number }>;
  errors: Array<{ model: string; error: string }>;
}

export class MultiModelFetcher {
  private provider: OpenMeteoProvider;
  
  constructor() {
    console.log('[MultiModelFetcher] Initializing with NEW OpenMeteoProvider v2.0');
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
    
    // Fetch all models + ICON FRZ in parallel
    const [ecmwfResult, gfsResult, gefsResult, iconFrzResult] = await Promise.allSettled([
      this.fetchModel(resort, timeRange, 'ecmwf-ifs'),
      this.fetchModel(resort, timeRange, 'gfs'),
      this.fetchModel(resort, timeRange, 'gefs'),
      this.fetchIconFrz(resort)
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

    if (iconFrzResult.status === 'fulfilled' && iconFrzResult.value) {
      result.iconFrz = iconFrzResult.value;
      console.log(`[MultiModelFetcher] ICON FRZ: ${iconFrzResult.value.length} hours fetched`);
    } else if (iconFrzResult.status === 'rejected') {
      console.warn('[MultiModelFetcher] ICON FRZ fetch failed (non-critical, ECMWF derivation will be used):', iconFrzResult.reason?.message);
    }
    
    return result;
  }

  /**
   * Lightweight fetch of ICON freezing level only.
   * ICON (DWD) provides freezinglevel_height directly from its NWP scheme
   * at 6km resolution — more accurate than ECMWF T850/T700 lapse-rate derivation
   * for complex Patagonian terrain. Used only for FRZ; all other variables
   * (temp, precip, snow, wind) remain from ECMWF.
   */
  private async fetchIconFrz(resort: Resort): Promise<Array<{ time: Date; heightM: number }> | null> {
    const response = await axios.get(`https://${OM_DOMAIN}/v1/forecast`, {
      params: {
        ...(OPEN_METEO_API_KEY ? { apikey: OPEN_METEO_API_KEY } : {}),
        latitude: resort.latitude,
        longitude: resort.longitude,
        hourly: 'freezinglevel_height',
        models: 'icon_seamless',
        timezone: 'GMT',
        forecast_days: 8
      },
      timeout: 8000
    });

    const times: string[] = response.data?.hourly?.time || [];
    const frzValues: (number | null)[] = response.data?.hourly?.freezinglevel_height || [];

    const result: Array<{ time: Date; heightM: number }> = [];
    for (let i = 0; i < times.length; i++) {
      const v = frzValues[i];
      if (v != null) result.push({ time: new Date(times[i]), heightM: v });
    }
    return result.length > 0 ? result : null;
  }
  
  /**
   * Fetch a single model
   */
  private async fetchModel(
    resort: Resort,
    timeRange: { start: Date; end: Date },
    model: 'ecmwf-ifs' | 'gfs' | 'gefs'
  ): Promise<NormalizedForecast> {  // eslint-disable-line @typescript-eslint/unified-signatures
    const raw = await this.provider.fetchForecast(resort, timeRange, {
      models: [model]
    });
    
    return await this.provider.normalizeForecast(raw, resort);
  }
}
