import { ResortConfig } from '../config/resorts.js';
import { env } from '../config/env.js';
import type { WorkerSupabaseClient } from '../lib/supabaseClient.js';
import { reservePremiumCall } from './premiumBudget.js';
import {
  ForecastSnapshotInput,
  SnapshotSourceMetadata
} from './types.js';
import { parseOpenMeteoLocalTimeToIso } from '../lib/timezone.js';

type ForecastProvider = {
  name: string;
  enabled: boolean;
  fetch: (resort: ResortConfig) => Promise<ForecastSnapshotInput>;
};

type ProviderAttempt = {
  provider: string;
  status: 'success' | 'failed' | 'disabled';
  attempts: number;
  durationMs: number;
  error?: string;
};

type ProviderRunResult = {
  snapshot: ForecastSnapshotInput;
  attempts: number;
  durationMs: number;
};

class ProviderChainError extends Error {
  attempts: ProviderAttempt[];

  constructor(message: string, attempts: ProviderAttempt[]) {
    super(message);
    this.name = 'ProviderChainError';
    this.attempts = attempts;
  }
}

function randomBetween(min: number, max: number): number {
  return Number((Math.random() * (max - min) + min).toFixed(1));
}

function buildMockSnapshot(
  fallbackReason?: string,
  mode: SnapshotSourceMetadata['mode'] = 'mock'
): ForecastSnapshotInput {
  const now = new Date();
  const forecastTarget = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  return {
    model: Math.random() > 0.5 ? 'ecmwf' : 'gfs',
    timestamp: now.toISOString(),
    forecastTargetTime: forecastTarget.toISOString(),
    leadHours: 12,
    precipChileMm: randomBetween(8, 30),
    precipAndesMm: randomBetween(6, 24),
    precipArgentinaMm: randomBetween(0, 12),
    snowfallBaseCm: randomBetween(0, 4),
    snowfallMidCm: randomBetween(2, 12),
    snowfallSummitCm: randomBetween(4, 20),
    freezingLevelM: randomBetween(1300, 2400),
    wetBulbBase: randomBetween(-1, 2),
    wetBulbMid: randomBetween(-4, 0),
    wind700: randomBetween(20, 65),
    wind850: randomBetween(15, 55),
    windDirection: ['W', 'WNW', 'NW', 'SW'][Math.floor(Math.random() * 4)],
    modelAgreementScore: randomBetween(30, 90),
    sourceMetadata: {
      provider: 'worker_mock_generator',
      mode,
      degraded: mode !== 'live',
      fallbackReason,
      fetchedAt: now.toISOString()
    },
    sourcePayload: {
      generatorVersion: 'v2'
    }
  };
}

function withTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
}

function scoreOpenMeteoHour(params: {
  precip: number;
  snowfall: number;
  freezing: number;
  leadHours: number;
}): number {
  const { precip, snowfall, freezing, leadHours } = params;
  const precipScore = precip * 2.4;
  const snowfallScore = snowfall * 3.1;
  const freezingBonus = freezing <= 1900 ? 8 : freezing <= 2300 ? 3 : 0;
  const leadPresenceBonus = leadHours >= 18 && leadHours <= 48 ? 2 : 0;

  return Number((precipScore + snowfallScore + freezingBonus + leadPresenceBonus).toFixed(2));
}

function dayKeyFromIso(value: string): string {
  return value.slice(0, 10);
}

function buildSevenDayRadar(params: {
  times: string[];
  precipitation: number[];
  snowfall: number[];
  freezing: Array<number | null>;
}): {
  windowHours: number;
  firstSignal: {
    leadHours: number;
    timestamp: string;
    signalScore: number;
    snowfallMidCm: number;
    snowfallSummitCm: number;
    precipMm: number;
  } | null;
  peakSignal: {
    leadHours: number;
    timestamp: string;
    signalScore: number;
    snowfallMidCm: number;
    snowfallSummitCm: number;
    precipMm: number;
  } | null;
  drift: {
    signalDelta: number | null;
    summitSnowDeltaCm: number | null;
    midSnowDeltaCm: number | null;
  };
  cumulative: {
    precipMm: number;
    snowfallMidCm: number;
    snowfallSummitCm: number;
  };
  days: Array<{
    day: string;
    peakSignalScore: number;
    peakPrecipMm: number;
    peakSnowfallMidCm: number;
    peakSnowfallSummitCm: number;
    minFreezingLevelM: number | null;
    signalHours: number;
  }>;
} {
  const weekWindowHours = Math.min(168, params.times.length - 1);
  const dayMap = new Map<string, {
    day: string;
    peakSignalScore: number;
    peakPrecipMm: number;
    peakSnowfallMidCm: number;
    peakSnowfallSummitCm: number;
    minFreezingLevelM: number | null;
    signalHours: number;
  }>();

  let firstSignal: {
    leadHours: number;
    timestamp: string;
    signalScore: number;
    snowfallMidCm: number;
    snowfallSummitCm: number;
    precipMm: number;
  } | null = null;

  let peakSignal: {
    leadHours: number;
    timestamp: string;
    signalScore: number;
    snowfallMidCm: number;
    snowfallSummitCm: number;
    precipMm: number;
  } | null = null;

  let cumulativePrecip = 0;
  let cumulativeSnowMid = 0;
  let cumulativeSnowSummit = 0;

  for (let idx = 0; idx <= weekWindowHours; idx++) {
    const time = params.times[idx];
    if (!time) continue;

    const precip = Number(params.precipitation[idx] ?? 0);
    const snow = Number(params.snowfall[idx] ?? 0);
    const freezing = Number(params.freezing[idx] ?? 9999);
    const snowfallMidCm = Number(Math.max(0, snow * 0.8).toFixed(1));
    const snowfallSummitCm = Number(Math.max(0, snow * 1.6).toFixed(1));
    const signalScore = scoreOpenMeteoHour({
      precip,
      snowfall: snow,
      freezing,
      leadHours: idx
    });

    cumulativePrecip += precip;
    cumulativeSnowMid += snowfallMidCm;
    cumulativeSnowSummit += snowfallSummitCm;

    const hasSignal = signalScore >= 28 || snowfallSummitCm >= 2 || snowfallMidCm >= 1 || precip >= 1;
    if (hasSignal && !firstSignal) {
      firstSignal = {
        leadHours: idx,
        timestamp: new Date(time).toISOString(),
        signalScore,
        snowfallMidCm,
        snowfallSummitCm,
        precipMm: Number(precip.toFixed(1))
      };
    }

    if (!peakSignal || signalScore > peakSignal.signalScore) {
      peakSignal = {
        leadHours: idx,
        timestamp: new Date(time).toISOString(),
        signalScore,
        snowfallMidCm,
        snowfallSummitCm,
        precipMm: Number(precip.toFixed(1))
      };
    }

    const day = dayKeyFromIso(time);
    const current = dayMap.get(day);
    if (!current) {
      dayMap.set(day, {
        day,
        peakSignalScore: signalScore,
        peakPrecipMm: Number(precip.toFixed(1)),
        peakSnowfallMidCm: snowfallMidCm,
        peakSnowfallSummitCm: snowfallSummitCm,
        minFreezingLevelM: Number.isFinite(freezing) ? Number(freezing.toFixed(0)) : null,
        signalHours: hasSignal ? 1 : 0
      });
      continue;
    }

    current.peakSignalScore = Math.max(current.peakSignalScore, signalScore);
    current.peakPrecipMm = Math.max(current.peakPrecipMm, Number(precip.toFixed(1)));
    current.peakSnowfallMidCm = Math.max(current.peakSnowfallMidCm, snowfallMidCm);
    current.peakSnowfallSummitCm = Math.max(current.peakSnowfallSummitCm, snowfallSummitCm);
    if (Number.isFinite(freezing)) {
      current.minFreezingLevelM = current.minFreezingLevelM === null
        ? Number(freezing.toFixed(0))
        : Math.min(current.minFreezingLevelM, Number(freezing.toFixed(0)));
    }
    if (hasSignal) {
      current.signalHours += 1;
    }
  }

  return {
    windowHours: weekWindowHours,
    firstSignal,
    peakSignal,
    drift: {
      signalDelta: firstSignal && peakSignal ? Number((peakSignal.signalScore - firstSignal.signalScore).toFixed(1)) : null,
      summitSnowDeltaCm: firstSignal && peakSignal ? Number((peakSignal.snowfallSummitCm - firstSignal.snowfallSummitCm).toFixed(1)) : null,
      midSnowDeltaCm: firstSignal && peakSignal ? Number((peakSignal.snowfallMidCm - firstSignal.snowfallMidCm).toFixed(1)) : null
    },
    cumulative: {
      precipMm: Number(cumulativePrecip.toFixed(1)),
      snowfallMidCm: Number(cumulativeSnowMid.toFixed(1)),
      snowfallSummitCm: Number(cumulativeSnowSummit.toFixed(1))
    },
    days: Array.from(dayMap.values()).sort((a, b) => a.day.localeCompare(b.day))
  };
}

async function fetchOpenMeteoSnapshot(resort: ResortConfig): Promise<ForecastSnapshotInput> {
  if (!resort.coordinates) {
    throw new Error(`Missing coordinates for resort ${resort.id}`);
  }

  const { latitude, longitude } = resort.coordinates;
  const hourly = [
    'precipitation',
    'snowfall',
    'freezing_level_height',
    'wet_bulb_temperature_2m',
    'windspeed_10m',
    'winddirection_10m'
  ].join(',');

  const omDomain = env.openMeteoApiKey ? 'customer-api.open-meteo.com' : 'api.open-meteo.com';
  const apiKeyParam = env.openMeteoApiKey ? `&apikey=${encodeURIComponent(env.openMeteoApiKey)}` : '';
  const timezoneParam = encodeURIComponent(env.workerTimezone);
  const url = `https://${omDomain}/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=${hourly}&forecast_days=7&timezone=${timezoneParam}${apiKeyParam}`;

  const response = await withTimeout(url, env.requestTimeoutMs);
  if (!response.ok) {
    throw new Error(`Open-Meteo HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    timezone?: string;
    utc_offset_seconds?: number;
    hourly?: {
      time?: string[];
      precipitation?: number[];
      snowfall?: number[];
      freezing_level_height?: Array<number | null>;
      wet_bulb_temperature_2m?: Array<number | null>;
      windspeed_10m?: Array<number | null>;
      winddirection_10m?: Array<number | null>;
    };
  };

  const times = data.hourly?.time;
  const utcOffsetSeconds = Number.isFinite(data.utc_offset_seconds) ? Number(data.utc_offset_seconds) : 0;
  const sourceTimezone = data.timezone ?? env.workerTimezone;
  const precipitation = data.hourly?.precipitation;
  const snowfall = data.hourly?.snowfall;
  const freezing = data.hourly?.freezing_level_height;
  const wetBulb = data.hourly?.wet_bulb_temperature_2m;
  const windSpeed = data.hourly?.windspeed_10m;
  const windDirection = data.hourly?.winddirection_10m;

  if (
    !times ||
    !times.length ||
    !precipitation ||
    !snowfall ||
    !freezing ||
    !wetBulb ||
    !windSpeed ||
    !windDirection
  ) {
    throw new Error('Open-Meteo returned incomplete hourly payload');
  }

  const maxWindowHours = Math.min(48, times.length - 1);
  const sevenDayRadar = buildSevenDayRadar({
    times,
    precipitation,
    snowfall,
    freezing
  });
  let targetIndex = Math.min(12, maxWindowHours);
  let bestSignalScore = Number.NEGATIVE_INFINITY;

  for (let idx = 0; idx <= maxWindowHours; idx++) {
    const signalScore = scoreOpenMeteoHour({
      precip: precipitation[idx] ?? 0,
      snowfall: snowfall[idx] ?? 0,
      freezing: freezing[idx] ?? 9999,
      leadHours: idx
    });

    if (signalScore > bestSignalScore) {
      bestSignalScore = signalScore;
      targetIndex = idx;
    }
  }

  const nowIso = new Date().toISOString();
  const targetTime = times[targetIndex] ?? nowIso;
  const targetTimeIso = targetTime.includes('T') && !targetTime.endsWith('Z')
    ? parseOpenMeteoLocalTimeToIso(targetTime, utcOffsetSeconds)
    : new Date(targetTime).toISOString();

  const precipTarget = precipitation[targetIndex] ?? 0;
  const snowfallTarget = snowfall[targetIndex] ?? 0;
  const freezingTarget = freezing[targetIndex] ?? 1800;
  const wetBulbTarget = wetBulb[targetIndex] ?? 0;
  const windTarget = windSpeed[targetIndex] ?? 20;
  const windDirTarget = windDirection[targetIndex] ?? 270;

  const forecast: ForecastSnapshotInput = {
    model: 'gfs_open_meteo',
    timestamp: nowIso,
    forecastTargetTime: targetTimeIso,
    leadHours: targetIndex,
    precipChileMm: Number((precipTarget * 1.4).toFixed(1)),
    precipAndesMm: Number((precipTarget * 1.05).toFixed(1)),
    precipArgentinaMm: Number((precipTarget * 0.85).toFixed(1)),
    snowfallBaseCm: Number(Math.max(0, snowfallTarget * 0.4).toFixed(1)),
    snowfallMidCm: Number(Math.max(0, snowfallTarget * 0.8).toFixed(1)),
    snowfallSummitCm: Number(Math.max(0, snowfallTarget * 1.6).toFixed(1)),
    freezingLevelM: Number(freezingTarget.toFixed(1)),
    wetBulbBase: Number((wetBulbTarget + 0.8).toFixed(1)),
    wetBulbMid: Number((wetBulbTarget - 1.5).toFixed(1)),
    wind700: Number((windTarget * 1.25).toFixed(1)),
    wind850: Number((windTarget * 1.1).toFixed(1)),
    windDirection: windDirTarget >= 315 || windDirTarget < 45
      ? 'N'
      : windDirTarget < 90
        ? 'E'
        : windDirTarget < 180
          ? 'S'
          : 'W',
    modelAgreementScore: Number((60 + Math.min(35, precipTarget * 2)).toFixed(1)),
    sourceMetadata: {
      provider: 'open_meteo',
      mode: 'live',
      degraded: false,
      fetchedAt: nowIso
    },
    sourcePayload: {
      latitude,
      longitude,
      timezone: sourceTimezone,
      utcOffsetSeconds,
      targetIndex,
      targetTime,
      targetTimeIso,
      selectionWindowHours: maxWindowHours,
      selectedSignalScore: bestSignalScore,
      selectionStrategy: 'max_signal_within_48h',
      sevenDayRadar
    }
  };

  return forecast;
}

async function fetchPremiumProviderSnapshot(resort: ResortConfig): Promise<ForecastSnapshotInput> {
  if (!env.premiumProviderUrl || !env.premiumProviderApiKey) {
    throw new Error('Missing WORKER_PREMIUM_API_URL or WORKER_PREMIUM_API_KEY');
  }
  if (!resort.coordinates) {
    throw new Error(`Missing coordinates for resort ${resort.id}`);
  }

  const usage = await reservePremiumCall(env.premiumMaxCallsPerMonth);

  const { latitude, longitude } = resort.coordinates;
  const url = `${env.premiumProviderUrl}?lat=${latitude}&lon=${longitude}&resortId=${resort.id}`;

  const response = await withTimeout(url, env.requestTimeoutMs);
  if (!response.ok) {
    throw new Error(`${env.premiumProviderName} HTTP ${response.status}`);
  }

  const normalized = (await response.json()) as Partial<ForecastSnapshotInput>;

  const requiredFields: Array<keyof ForecastSnapshotInput> = [
    'model',
    'timestamp',
    'forecastTargetTime',
    'leadHours',
    'precipChileMm',
    'precipAndesMm',
    'precipArgentinaMm',
    'snowfallBaseCm',
    'snowfallMidCm',
    'snowfallSummitCm',
    'freezingLevelM',
    'wetBulbBase',
    'wetBulbMid',
    'wind700',
    'wind850',
    'windDirection',
    'modelAgreementScore'
  ];

  const missing = requiredFields.filter((field) => normalized[field] === undefined || normalized[field] === null);
  if (missing.length > 0) {
    throw new Error(`Premium payload missing fields: ${missing.join(', ')}`);
  }

  return {
    ...(normalized as ForecastSnapshotInput),
    sourceMetadata: {
      provider: env.premiumProviderName,
      mode: 'live',
      degraded: false,
      fetchedAt: new Date().toISOString()
    },
    sourcePayload: {
      ...(normalized.sourcePayload ?? {}),
      providerType: 'premium_api',
      premiumUsage: usage
    }
  };
}

function getForecastProviders(): ForecastProvider[] {
  return [
    {
      name: env.premiumProviderName,
      enabled: env.enablePaidProvider,
      fetch: fetchPremiumProviderSnapshot
    },
    {
      name: 'open_meteo',
      enabled: true,
      fetch: fetchOpenMeteoSnapshot
    }
  ];
}

async function shouldEnablePremiumProvider(
  resort: ResortConfig,
  supabase?: WorkerSupabaseClient
): Promise<boolean> {
  if (!env.enablePaidProvider) {
    return false;
  }

  if (env.premiumTriggerMode === 'always') {
    return true;
  }

  if (!supabase) {
    return false;
  }

  if (env.premiumTriggerMode === 'active_event_only') {
    const windowStart = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('storm_events')
      .select('id')
      .eq('resort_id', resort.id)
      .in('current_status', ['active', 'monitoring'])
      .gte('detected_at', windowStart)
      .order('detected_at', { ascending: false })
      .limit(1);

    if (error) {
      return false;
    }

    return (data ?? []).length > 0;
  }

  return false;
}

async function fetchLastKnownSnapshot(
  supabase: WorkerSupabaseClient,
  resort: ResortConfig,
  fallbackReason: string
): Promise<ForecastSnapshotInput | null> {
  type EventIdRow = { id: string };
  type SnapshotRow = {
    id: string;
    model: string | null;
    forecast_target_time: string;
    lead_hours: number | null;
    precip_chile_mm: number | null;
    precip_andes_mm: number | null;
    precip_argentina_mm: number | null;
    snowfall_base_cm: number | null;
    snowfall_mid_cm: number | null;
    snowfall_summit_cm: number | null;
    freezing_level_m: number | null;
    wet_bulb_base: number | null;
    wet_bulb_mid: number | null;
    wind_700: number | null;
    wind_850: number | null;
    wind_direction: string | null;
    model_agreement_score: number | null;
  };

  const { data: events, error: eventError } = await supabase
    .from('storm_events')
    .select('id')
    .eq('resort_id', resort.id)
    .order('detected_at', { ascending: false })
    .limit(1);

  const event = ((events ?? []) as EventIdRow[])[0];

  if (eventError || !event?.id) {
    return null;
  }

  const { data: snapshots, error: snapshotError } = await supabase
    .from('storm_snapshots')
    .select('*')
    .eq('storm_event_id', event.id)
    .order('timestamp', { ascending: false })
    .limit(1);

  const snapshot = ((snapshots ?? []) as SnapshotRow[])[0];

  if (snapshotError || !snapshot) {
    return null;
  }

  return {
    model: String(snapshot.model ?? 'fallback_last_known'),
    timestamp: new Date().toISOString(),
    forecastTargetTime: snapshot.forecast_target_time,
    leadHours: Number(snapshot.lead_hours ?? 12),
    precipChileMm: Number(snapshot.precip_chile_mm ?? 0),
    precipAndesMm: Number(snapshot.precip_andes_mm ?? 0),
    precipArgentinaMm: Number(snapshot.precip_argentina_mm ?? 0),
    snowfallBaseCm: Number(snapshot.snowfall_base_cm ?? 0),
    snowfallMidCm: Number(snapshot.snowfall_mid_cm ?? 0),
    snowfallSummitCm: Number(snapshot.snowfall_summit_cm ?? 0),
    freezingLevelM: Number(snapshot.freezing_level_m ?? 1800),
    wetBulbBase: Number(snapshot.wet_bulb_base ?? 0),
    wetBulbMid: Number(snapshot.wet_bulb_mid ?? -1),
    wind700: Number(snapshot.wind_700 ?? 25),
    wind850: Number(snapshot.wind_850 ?? 20),
    windDirection: String(snapshot.wind_direction ?? 'W'),
    modelAgreementScore: Number(snapshot.model_agreement_score ?? 45),
    sourceMetadata: {
      provider: 'supabase_last_known',
      mode: 'fallback_last_known',
      degraded: true,
      fallbackReason,
      fetchedAt: new Date().toISOString()
    },
    sourcePayload: {
      reusedSnapshotId: snapshot.id,
      reusedEventId: event.id
    }
  };
}

async function fetchWithRetry(provider: ForecastProvider, resort: ResortConfig): Promise<ProviderRunResult> {
  let lastError: unknown;
  const startedAt = Date.now();

  for (let attempt = 0; attempt <= env.maxRetries; attempt++) {
    try {
      const snapshot = await provider.fetch(resort);
      return {
        snapshot,
        attempts: attempt + 1,
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      lastError = error;
      if (attempt < env.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('Unknown live fetch error');
}

async function fetchFromProviders(
  resort: ResortConfig,
  supabase?: WorkerSupabaseClient
): Promise<{ snapshot: ForecastSnapshotInput; providerAttempts: ProviderAttempt[] }> {
  const premiumAllowed = await shouldEnablePremiumProvider(resort, supabase);
  const providers = getForecastProviders().map((provider, index) => {
    if (index === 0) {
      return {
        ...provider,
        enabled: premiumAllowed
      };
    }

    return provider;
  });
  const providerAttempts: ProviderAttempt[] = [];

  for (const provider of providers) {
    if (!provider.enabled) {
      providerAttempts.push({
        provider: provider.name,
        status: 'disabled',
        attempts: 0,
        durationMs: 0,
        error: 'disabled by env'
      });
      continue;
    }

    try {
      const result = await fetchWithRetry(provider, resort);
      providerAttempts.push({
        provider: provider.name,
        status: 'success',
        attempts: result.attempts,
        durationMs: result.durationMs
      });

      result.snapshot.sourcePayload = {
        ...(result.snapshot.sourcePayload ?? {}),
        providerAttempts,
        selectedProvider: provider.name
      };

      return {
        snapshot: result.snapshot,
        providerAttempts
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown provider error';
      providerAttempts.push({
        provider: provider.name,
        status: 'failed',
        attempts: env.maxRetries + 1,
        durationMs: 0,
        error: message
      });
    }
  }

  const failureReasons = providerAttempts
    .filter((attempt) => attempt.status !== 'success')
    .map((attempt) => `${attempt.provider}: ${attempt.error ?? attempt.status}`);

  throw new ProviderChainError(failureReasons.join(' | '), providerAttempts);
}

export async function fetchForecastSnapshot(
  resort: ResortConfig,
  supabase?: WorkerSupabaseClient
): Promise<ForecastSnapshotInput> {
  if (env.sourceMode === 'mock') {
    return buildMockSnapshot('WORKER_SOURCE_MODE=mock', 'mock');
  }

  try {
    const result = await fetchFromProviders(resort, supabase);
    return result.snapshot;
  } catch (liveError) {
    const reason = liveError instanceof Error ? liveError.message : 'Live source unavailable';
    const providerAttempts = liveError instanceof ProviderChainError ? liveError.attempts : undefined;

    if (supabase) {
      const lastKnown = await fetchLastKnownSnapshot(supabase, resort, reason);
      if (lastKnown) {
        lastKnown.sourcePayload = {
          ...(lastKnown.sourcePayload ?? {}),
          providerAttempts,
          selectedProvider: 'supabase_last_known'
        };
        return lastKnown;
      }
    }

    const mock = buildMockSnapshot(reason, 'fallback_last_known');
    mock.sourcePayload = {
      ...(mock.sourcePayload ?? {}),
      providerAttempts,
      selectedProvider: 'worker_mock_generator'
    };
    return mock;
  }
}
