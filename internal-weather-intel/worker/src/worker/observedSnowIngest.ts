import { env } from '../config/env.js';
import { ResortConfig } from '../config/resorts.js';
import { ObservedSnowEstimate } from './types.js';

function withTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
}

function withTimeoutAndHeaders(
  url: string,
  timeoutMs: number,
  headers?: Record<string, string>
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { headers, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
}

async function fetchSatelliteObservedSnow(resort: ResortConfig): Promise<ObservedSnowEstimate> {
  if (!env.observedSnowSatelliteUrl) {
    return {
      provider: 'satellite_observed_api',
      mode: 'unavailable',
      observedAt: new Date().toISOString(),
      lookbackHours: env.observedSnowLookbackHours,
      estimatedSnowCm: null,
      confidence: 5,
      reason: 'WORKER_SATELLITE_OBSERVED_SNOW_API_URL not set'
    };
  }

  if (!resort.coordinates) {
    return {
      provider: 'satellite_observed_api',
      mode: 'unavailable',
      observedAt: new Date().toISOString(),
      lookbackHours: env.observedSnowLookbackHours,
      estimatedSnowCm: null,
      confidence: 5,
      reason: `Missing coordinates for resort ${resort.id}`
    };
  }

  const { latitude, longitude } = resort.coordinates;
  const url = `${env.observedSnowSatelliteUrl}?lat=${latitude}&lon=${longitude}&lookbackHours=${env.observedSnowLookbackHours}`;

  try {
    const headers = env.observedSnowSatelliteApiKey
      ? { Authorization: `Bearer ${env.observedSnowSatelliteApiKey}` }
      : undefined;

    const response = await withTimeoutAndHeaders(url, env.observedSnowTimeoutMs, headers);

    if (!response.ok) {
      return {
        provider: 'satellite_observed_api',
        mode: 'unavailable',
        observedAt: new Date().toISOString(),
        lookbackHours: env.observedSnowLookbackHours,
        estimatedSnowCm: null,
        confidence: 10,
        reason: `Satellite API HTTP ${response.status}`
      };
    }

    const data = (await response.json()) as {
      observedAt?: string;
      accumulatedSnowCm?: number;
      confidence?: number;
      provider?: string;
      raw?: Record<string, unknown>;
    };

    if (typeof data.accumulatedSnowCm !== 'number') {
      return {
        provider: data.provider ?? 'satellite_observed_api',
        mode: 'unavailable',
        observedAt: new Date().toISOString(),
        lookbackHours: env.observedSnowLookbackHours,
        estimatedSnowCm: null,
        confidence: 10,
        reason: 'Satellite payload missing accumulatedSnowCm'
      };
    }

    return {
      provider: data.provider ?? 'satellite_observed_api',
      mode: 'live',
      observedAt: data.observedAt ?? new Date().toISOString(),
      lookbackHours: env.observedSnowLookbackHours,
      estimatedSnowCm: Number(data.accumulatedSnowCm.toFixed(1)),
      confidence: typeof data.confidence === 'number' ? Math.max(5, Math.min(95, Math.round(data.confidence))) : 65,
      reason: 'Satellite observed snow API',
      raw: data.raw
    };
  } catch (error) {
    return {
      provider: 'satellite_observed_api',
      mode: 'unavailable',
      observedAt: new Date().toISOString(),
      lookbackHours: env.observedSnowLookbackHours,
      estimatedSnowCm: null,
      confidence: 5,
      reason: error instanceof Error ? error.message : 'Unknown satellite observed snow error'
    };
  }
}

export async function fetchObservedSnowEstimate(resort: ResortConfig): Promise<ObservedSnowEstimate> {
  if (env.observedSnowMode === 'off') {
    return {
      provider: 'observed_snow_disabled',
      mode: 'unavailable',
      observedAt: new Date().toISOString(),
      lookbackHours: env.observedSnowLookbackHours,
      estimatedSnowCm: null,
      confidence: 0,
      reason: 'WORKER_OBSERVED_SNOW_MODE=off'
    };
  }

  if (env.observedSnowMode === 'satellite_api') {
    const satellite = await fetchSatelliteObservedSnow(resort);
    if (satellite.mode !== 'unavailable') {
      return satellite;
    }
  }

  if (!resort.coordinates) {
    return {
      provider: 'open_meteo_observed_proxy',
      mode: 'unavailable',
      observedAt: new Date().toISOString(),
      lookbackHours: env.observedSnowLookbackHours,
      estimatedSnowCm: null,
      confidence: 5,
      reason: `Missing coordinates for resort ${resort.id}`
    };
  }

  const { latitude, longitude } = resort.coordinates;
  const omDomain = env.openMeteoApiKey ? 'customer-api.open-meteo.com' : 'api.open-meteo.com';
  const apiKeyParam = env.openMeteoApiKey ? `&apikey=${encodeURIComponent(env.openMeteoApiKey)}` : '';
  const url = `https://${omDomain}/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=snowfall&past_days=2&forecast_days=1&timezone=auto${apiKeyParam}`;

  try {
    const response = await withTimeout(url, env.requestTimeoutMs);
    if (!response.ok) {
      return {
        provider: 'open_meteo_observed_proxy',
        mode: 'unavailable',
        observedAt: new Date().toISOString(),
        lookbackHours: env.observedSnowLookbackHours,
        estimatedSnowCm: null,
        confidence: 10,
        reason: `Observed proxy HTTP ${response.status}`
      };
    }

    const data = (await response.json()) as {
      hourly?: {
        time?: string[];
        snowfall?: number[];
      };
    };

    const times = data.hourly?.time ?? [];
    const snowfall = data.hourly?.snowfall ?? [];
    if (!times.length || !snowfall.length) {
      return {
        provider: 'open_meteo_observed_proxy',
        mode: 'unavailable',
        observedAt: new Date().toISOString(),
        lookbackHours: env.observedSnowLookbackHours,
        estimatedSnowCm: null,
        confidence: 10,
        reason: 'Observed payload incomplete'
      };
    }

    const now = Date.now();
    const lookbackMs = env.observedSnowLookbackHours * 60 * 60 * 1000;

    const accumulated = times.reduce((sum, time, index) => {
      const ts = Date.parse(time);
      if (!Number.isFinite(ts)) return sum;
      if (now - ts > lookbackMs || ts > now) return sum;
      return sum + Number(snowfall[index] ?? 0);
    }, 0);

    return {
      provider: 'open_meteo_observed_proxy',
      mode: 'proxy',
      observedAt: new Date().toISOString(),
      lookbackHours: env.observedSnowLookbackHours,
      estimatedSnowCm: Number(accumulated.toFixed(1)),
      confidence: 40,
      reason: 'Proxy accumulation from hourly snowfall (not satellite SWE)',
      raw: {
        latitude,
        longitude,
        points: times.length
      }
    };
  } catch (error) {
    return {
      provider: 'open_meteo_observed_proxy',
      mode: 'unavailable',
      observedAt: new Date().toISOString(),
      lookbackHours: env.observedSnowLookbackHours,
      estimatedSnowCm: null,
      confidence: 5,
      reason: error instanceof Error ? error.message : 'Unknown observed snow error'
    };
  }
}
