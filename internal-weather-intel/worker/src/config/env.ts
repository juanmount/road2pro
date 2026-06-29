import dotenv from 'dotenv';

dotenv.config();

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true';
}

export const env = {
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
  workerTimezone: process.env.WORKER_TIMEZONE ?? 'America/Argentina/Buenos_Aires',
  runtimeMode: process.env.WORKER_RUNTIME_MODE ?? 'manual',
  enforceProdGuards: parseBoolean(process.env.WORKER_ENFORCE_PROD_GUARDS, true),
  dryRun: process.env.WORKER_DRY_RUN === 'true',
  sourceMode: process.env.WORKER_SOURCE_MODE ?? 'auto',
  enablePaidProvider: process.env.WORKER_ENABLE_PAID_PROVIDER === 'true',
  premiumProviderName: process.env.WORKER_PREMIUM_PROVIDER_NAME ?? 'premium_provider',
  premiumProviderUrl: process.env.WORKER_PREMIUM_API_URL ?? '',
  premiumProviderApiKey: process.env.WORKER_PREMIUM_API_KEY ?? '',
  premiumTriggerMode: process.env.WORKER_PREMIUM_TRIGGER_MODE ?? 'active_event_only',
  premiumMaxCallsPerMonth: parseNumber(process.env.WORKER_PREMIUM_MAX_CALLS_PER_MONTH, 0),
  radarMode: process.env.WORKER_RADAR_MODE ?? 'off',
  radarTriggerMode: process.env.WORKER_RADAR_TRIGGER_MODE ?? 'storm_or_borderline',
  observedSnowMode: process.env.WORKER_OBSERVED_SNOW_MODE ?? 'proxy',
  observedSnowSatelliteUrl: process.env.WORKER_SATELLITE_OBSERVED_SNOW_API_URL ?? '',
  observedSnowSatelliteApiKey: process.env.WORKER_SATELLITE_OBSERVED_SNOW_API_KEY ?? '',
  observedSnowLookbackHours: parseNumber(process.env.WORKER_OBSERVED_SNOW_LOOKBACK_HOURS, 24),
  webcamMode: process.env.WORKER_WEBCAM_MODE ?? 'off',
  catedralWebcamUrl: process.env.WORKER_CATEDRAL_WEBCAM_URL ?? '',
  webcamTimeoutMs: parseNumber(process.env.WORKER_WEBCAM_TIMEOUT_MS, 10000),
  loopEnabled: parseBoolean(process.env.WORKER_LOOP_ENABLED, false),
  loopIntervalMinutes: parseNumber(process.env.WORKER_LOOP_INTERVAL_MINUTES, 15),
  morningEmailEnabled: parseBoolean(process.env.WORKER_MORNING_EMAIL_ENABLED, false),
  morningEmailHourLocal: parseNumber(process.env.WORKER_MORNING_EMAIL_HOUR_LOCAL, 8),
  morningEmailMinuteLocal: parseNumber(process.env.WORKER_MORNING_EMAIL_MINUTE_LOCAL, 0),
  morningEmailResendApiKey: process.env.WORKER_MORNING_EMAIL_RESEND_API_KEY ?? '',
  morningEmailFrom: process.env.WORKER_MORNING_EMAIL_FROM ?? '',
  morningEmailTo: process.env.WORKER_MORNING_EMAIL_TO ?? '',
  morningEmailSubjectPrefix: process.env.WORKER_MORNING_EMAIL_SUBJECT_PREFIX ?? 'Andes Powder',
  autoVerifyEnabled: parseBoolean(process.env.WORKER_AUTO_VERIFY_ENABLED, true),
  autoVerifyMinQuietSnapshots: parseNumber(process.env.WORKER_AUTO_VERIFY_MIN_QUIET_SNAPSHOTS, 3),
  autoVerifyLookbackHours: parseNumber(process.env.WORKER_AUTO_VERIFY_LOOKBACK_HOURS, 72),
  requestTimeoutMs: parseNumber(process.env.WORKER_REQUEST_TIMEOUT_MS, 8000),
  radarTimeoutMs: parseNumber(process.env.WORKER_RADAR_TIMEOUT_MS, 7000),
  observedSnowTimeoutMs: parseNumber(process.env.WORKER_OBSERVED_SNOW_TIMEOUT_MS, 9000),
  maxRetries: parseNumber(process.env.WORKER_MAX_RETRIES, 2),
  openMeteoApiKey: process.env.OPEN_METEO_API_KEY ?? '',
};

export function assertEnv(): void {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in worker environment.');
  }

  if (env.loopIntervalMinutes < 1) {
    throw new Error('WORKER_LOOP_INTERVAL_MINUTES must be >= 1.');
  }

  if (env.morningEmailHourLocal < 0 || env.morningEmailHourLocal > 23) {
    throw new Error('WORKER_MORNING_EMAIL_HOUR_LOCAL must be between 0 and 23.');
  }

  if (env.morningEmailMinuteLocal < 0 || env.morningEmailMinuteLocal > 59) {
    throw new Error('WORKER_MORNING_EMAIL_MINUTE_LOCAL must be between 0 and 59.');
  }

  if (env.morningEmailEnabled) {
    if (!env.morningEmailResendApiKey) {
      throw new Error('Missing WORKER_MORNING_EMAIL_RESEND_API_KEY in worker environment.');
    }

    if (!env.morningEmailFrom) {
      throw new Error('Missing WORKER_MORNING_EMAIL_FROM in worker environment.');
    }

    if (!env.morningEmailTo) {
      throw new Error('Missing WORKER_MORNING_EMAIL_TO in worker environment.');
    }
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: env.workerTimezone }).format(new Date());
  } catch {
    throw new Error('WORKER_TIMEZONE must be a valid IANA timezone, e.g. America/Argentina/Buenos_Aires.');
  }

  if (env.enforceProdGuards && env.runtimeMode === 'production') {
    if (env.dryRun) {
      throw new Error('WORKER_DRY_RUN cannot be true when WORKER_RUNTIME_MODE=production.');
    }

    if (env.webcamMode === 'off') {
      throw new Error('WORKER_WEBCAM_MODE cannot be off when WORKER_RUNTIME_MODE=production.');
    }
  }
}
