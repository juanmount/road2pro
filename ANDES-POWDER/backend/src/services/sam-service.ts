/**
 * SAM (Southern Annular Mode) / AAO Proxy Service
 * Computes a regional SAM index from 500hPa geopotential height anomalies
 * sampled at 40°S vs 65°S using Open-Meteo — no API key needed, real-time.
 *
 * Positive anomaly (40S height above normal vs 65S) → blocked circulation
 * Negative anomaly → active fronts / more snowfall chances
 */

import axios from 'axios';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

// 2 longitudes: Pacific (relevant for Patagonia) + Indian Ocean sector
// Fewer calls = stay under Open-Meteo free tier rate limit
const LONGITUDES = [-70, 40];
const LAT_MID = -40;   // mid-latitude ring
const LAT_POLAR = -65; // polar ring

const PAST_DAYS = 14;
const FORECAST_DAYS = 7;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface SAMStatus {
  level: 'very_blocked' | 'blocked' | 'normal' | 'active' | 'very_active';
  color: string;
  label: string;
  description: string;
  impactOnSnow: string;
}

export interface SAMData {
  status: SAMStatus;
  trend: 'improving' | 'worsening' | 'stable';
  trendLabel: string;
  trendDays: number | null;
  updatedAt: string;
}

let cache: { data: SAMData; fetchedAt: number } | null = null;

function classifySAM(anomalySD: number): SAMStatus {
  if (anomalySD >= 1.0) {
    return {
      level: 'very_blocked',
      color: '#ef4444',
      label: 'Circulación bloqueada',
      description: 'El anticiclón sobre el Pacífico Sur está fortalecido. Los sistemas frontales tienen dificultad para cruzar los Andes.',
      impactOnSnow: 'Probabilidad de nevadas muy baja. Predominan cielos despejados y vientos del este.',
    };
  }
  if (anomalySD >= 0.4) {
    return {
      level: 'blocked',
      color: '#f97316',
      label: 'Frentes limitados',
      description: 'La circulación presenta tendencia bloqueante. Los sistemas frontales llegan debilitados a la Cordillera.',
      impactOnSnow: 'Frentes posibles pero de menor intensidad. Nevadas limitadas.',
    };
  }
  if (anomalySD >= -0.4) {
    return {
      level: 'normal',
      color: '#eab308',
      label: 'Condición normal',
      description: 'La circulación atmosférica se encuentra dentro de valores normales de temporada.',
      impactOnSnow: 'Condiciones típicas de invierno. Probabilidad moderada de frentes.',
    };
  }
  if (anomalySD >= -1.0) {
    return {
      level: 'active',
      color: '#22c55e',
      label: 'Frentes favorables',
      description: 'El cinturón de vientos del oeste avanza hacia el norte, facilitando el ingreso de frentes a los Andes patagónicos.',
      impactOnSnow: 'Buena probabilidad de frentes activos y nevadas.',
    };
  }
  return {
    level: 'very_active',
    color: '#3b82f6',
    label: 'Alta actividad frontal',
    description: 'Circulación muy activa. Alta frecuencia de sistemas frontales cruzando los Andes.',
    impactOnSnow: 'Alta probabilidad de tormentas y nevadas significativas. Condiciones óptimas para acumulación.',
  };
}

function stdDev(values: number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

async function fetchHeights(lat: number, lon: number): Promise<{ time: string; height: number }[]> {
  const res = await axios.get(OPEN_METEO_URL, {
    params: {
      latitude: lat,
      longitude: lon,
      hourly: 'geopotential_height_500hPa',
      past_days: PAST_DAYS,
      forecast_days: FORECAST_DAYS,
      timezone: 'UTC',
    },
    timeout: 8000,
  });
  const times: string[] = res.data.hourly.time;
  const heights: number[] = res.data.hourly.geopotential_height_500hPa;
  return times.map((t, i) => ({ time: t, height: heights[i] ?? 0 }));
}

function groupByDay(data: { time: string; height: number }[]): Record<string, number[]> {
  const byDay: Record<string, number[]> = {};
  for (const { time, height } of data) {
    const day = time.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    if (height > 0) byDay[day].push(height);
  }
  return byDay;
}

function dailyMean(byDay: Record<string, number[]>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [day, vals] of Object.entries(byDay)) {
    if (vals.length > 0) result[day] = vals.reduce((s, v) => s + v, 0) / vals.length;
  }
  return result;
}

function buildTrendLabel(
  forecastDiffs: { date: string; diff: number }[],
  todayDiff: number,
  sd: number
): { trend: SAMData['trend']; label: string; days: number | null } {
  // Find the first future day that crosses a meaningful threshold
  const threshold = sd * 0.6;

  let improveDays: number | null = null;
  let worsenDays: number | null = null;

  for (let i = 0; i < forecastDiffs.length; i++) {
    const delta = forecastDiffs[i].diff - todayDiff;
    if (delta < -threshold && improveDays === null) improveDays = i + 1;
    if (delta > threshold && worsenDays === null) worsenDays = i + 1;
  }

  // Average of forecast vs today
  const forecastMean =
    forecastDiffs.reduce((s, d) => s + d.diff, 0) / forecastDiffs.length;
  const overallDelta = forecastMean - todayDiff;

  if (overallDelta < -threshold) {
    const d = improveDays ?? forecastDiffs.length;
    return {
      trend: 'improving',
      label: d <= 2 ? 'Mejora próximos días' : `Mejora en ~${d} días`,
      days: d,
    };
  }
  if (overallDelta > threshold) {
    const d = worsenDays ?? forecastDiffs.length;
    return {
      trend: 'worsening',
      label: d <= 2 ? 'Mayor bloqueo próximo' : `Mayor bloqueo en ~${d} días`,
      days: d,
    };
  }
  return { trend: 'stable', label: 'Sin cambios esta semana', days: null };
}

export async function getSAMData(): Promise<SAMData> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data;

  // Fetch sequentially to avoid Open-Meteo free tier rate limit (429)
  const allFetches: Awaited<ReturnType<typeof fetchHeights>>[] = [];
  const points = [
    ...LONGITUDES.map((lon) => ({ lat: LAT_MID, lon })),
    ...LONGITUDES.map((lon) => ({ lat: LAT_POLAR, lon })),
  ];
  for (const { lat, lon } of points) {
    allFetches.push(await fetchHeights(lat, lon));
    await sleep(300); // 300ms between calls
  }

  const midData = allFetches.slice(0, LONGITUDES.length);
  const polarData = allFetches.slice(LONGITUDES.length);

  // Group by day and compute daily zonal means per latitude ring
  const midMeans = dailyMean(
    Object.fromEntries(
      Object.entries(
        midData.reduce((acc, pts) => {
          const byDay = groupByDay(pts);
          for (const [day, vals] of Object.entries(byDay)) {
            if (!acc[day]) acc[day] = [];
            acc[day].push(...vals);
          }
          return acc;
        }, {} as Record<string, number[]>)
      ).map(([d, v]) => [d, [v.reduce((s, x) => s + x, 0) / v.length]])
    )
  );

  const polarMeans = dailyMean(
    Object.fromEntries(
      Object.entries(
        polarData.reduce((acc, pts) => {
          const byDay = groupByDay(pts);
          for (const [day, vals] of Object.entries(byDay)) {
            if (!acc[day]) acc[day] = [];
            acc[day].push(...vals);
          }
          return acc;
        }, {} as Record<string, number[]>)
      ).map(([d, v]) => [d, [v.reduce((s, x) => s + x, 0) / v.length]])
    )
  );

  // Build daily height difference series (40S - 65S)
  const today = new Date().toISOString().slice(0, 10);
  const allDays = Object.keys(midMeans)
    .filter((d) => midMeans[d] !== undefined && polarMeans[d] !== undefined)
    .sort();

  const pastDays = allDays.filter((d) => d <= today);
  const futureDays = allDays.filter((d) => d > today);

  const pastDiffs = pastDays.map((d) => ({ date: d, diff: midMeans[d] - polarMeans[d] }));
  const futureDiffs = futureDays.map((d) => ({ date: d, diff: midMeans[d] - polarMeans[d] }));

  if (pastDiffs.length === 0) throw new Error('No SAM data computed');

  const baselineValues = pastDiffs.map((d) => d.diff);
  const baselineMean = baselineValues.reduce((s, v) => s + v, 0) / baselineValues.length;
  const sd = stdDev(baselineValues) || 1;

  const todayDiff = pastDiffs[pastDiffs.length - 1].diff;
  const anomalySD = (todayDiff - baselineMean) / sd;

  const { trend, label, days } = buildTrendLabel(futureDiffs, todayDiff, sd);

  const data: SAMData = {
    status: classifySAM(anomalySD),
    trend,
    trendLabel: label,
    trendDays: days,
    updatedAt: new Date().toISOString(),
  };

  cache = { data, fetchedAt: Date.now() };
  return data;
}
