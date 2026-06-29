import { env } from '../config/env.js';
import { ResortConfig } from '../config/resorts.js';
import { RadarObservation } from './types.js';

type RadarFetchOptions = {
  skip?: boolean;
  skipReason?: string;
};

function withTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
}

async function fetchProxyObservation(resort: ResortConfig): Promise<RadarObservation> {
  if (!resort.coordinates) {
    return {
      provider: 'radar_proxy_open_meteo',
      mode: 'unavailable',
      observedAt: new Date().toISOString(),
      precipIntensityMmH: null,
      confidence: 5,
      reason: `Missing coordinates for resort ${resort.id}`
    };
  }

  const { latitude, longitude } = resort.coordinates;
  const omDomain = env.openMeteoApiKey ? 'customer-api.open-meteo.com' : 'api.open-meteo.com';
  const apiKeyParam = env.openMeteoApiKey ? `&apikey=${encodeURIComponent(env.openMeteoApiKey)}` : '';
  const url = `https://${omDomain}/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=precipitation&forecast_days=1&timezone=auto${apiKeyParam}`;

  try {
    const response = await withTimeout(url, env.radarTimeoutMs);
    if (!response.ok) {
      return {
        provider: 'radar_proxy_open_meteo',
        mode: 'unavailable',
        observedAt: new Date().toISOString(),
        precipIntensityMmH: null,
        confidence: 10,
        reason: `Proxy HTTP ${response.status}`
      };
    }

    const data = (await response.json()) as {
      hourly?: {
        time?: string[];
        precipitation?: number[];
      };
    };

    const hourlyTimes = data.hourly?.time ?? [];
    const hourlyPrecip = data.hourly?.precipitation ?? [];
    if (!hourlyTimes.length || !hourlyPrecip.length) {
      return {
        provider: 'radar_proxy_open_meteo',
        mode: 'unavailable',
        observedAt: new Date().toISOString(),
        precipIntensityMmH: null,
        confidence: 10,
        reason: 'Proxy payload incomplete'
      };
    }

    const index = 0;
    return {
      provider: 'radar_proxy_open_meteo',
      mode: 'proxy',
      observedAt: hourlyTimes[index] ?? new Date().toISOString(),
      precipIntensityMmH: Number((hourlyPrecip[index] ?? 0).toFixed(2)),
      confidence: 35,
      reason: 'Proxy only (not weather radar product)',
      raw: {
        latitude,
        longitude,
        sampleIndex: index
      }
    };
  } catch (error) {
    return {
      provider: 'radar_proxy_open_meteo',
      mode: 'unavailable',
      observedAt: new Date().toISOString(),
      precipIntensityMmH: null,
      confidence: 5,
      reason: error instanceof Error ? error.message : 'Unknown proxy error'
    };
  }
}

export async function fetchRadarObservation(
  resort: ResortConfig,
  options?: RadarFetchOptions
): Promise<RadarObservation> {
  if (options?.skip) {
    return {
      provider: 'radar_skipped',
      mode: 'unavailable',
      observedAt: new Date().toISOString(),
      precipIntensityMmH: null,
      confidence: 0,
      reason: options.skipReason ?? 'Skipped by worker policy'
    };
  }

  if (env.radarMode === 'off') {
    return {
      provider: 'radar_disabled',
      mode: 'unavailable',
      observedAt: new Date().toISOString(),
      precipIntensityMmH: null,
      confidence: 0,
      reason: 'WORKER_RADAR_MODE=off'
    };
  }

  return fetchProxyObservation(resort);
}
