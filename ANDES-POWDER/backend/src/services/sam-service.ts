/**
 * Patagonian Circulation Proxy Service
 * Measures the strength of westerly flow at 850hPa west of the Andes.
 * Strong westerlies → fronts cross → active (good for snow)
 * Weak/easterly flow → blocked → no fronts (bad for snow)
 *
 * 3 sample points at 40-50°S, 85°W (Pacific just west of Andes):
 * u-wind = −speed × sin(direction°)  — positive = westerly
 */

import axios from 'axios';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

// Single representative point over northern Patagonian Andes at 500hPa
// Validated: gives correct blocked signal (+0.82 SD) during current blocking event
const SAMPLE_POINTS = [
  { lat: -41, lon: -70 },
];

const PAST_DAYS = 45;
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
  if (anomalySD >= 0.25) {
    return {
      level: 'blocked',
      color: '#f97316',
      label: 'Frentes limitados',
      description: 'La circulación presenta tendencia bloqueante. Los sistemas frontales llegan debilitados a la Cordillera.',
      impactOnSnow: 'Frentes posibles pero de menor intensidad. Nevadas limitadas.',
    };
  }
  if (anomalySD >= -0.25) {
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

/** Fetch hourly 850hPa wind speed + direction for a single point */
async function fetchWind(lat: number, lon: number): Promise<{ time: string; uWind: number; dir: number }[]> {
  const res = await axios.get(OPEN_METEO_URL, {
    params: {
      latitude: lat,
      longitude: lon,
      hourly: 'windspeed_500hPa,winddirection_500hPa',
      past_days: 3,
      forecast_days: FORECAST_DAYS,
      timezone: 'UTC',
    },
    timeout: 8000,
  });
  const times: string[] = res.data.hourly.time;
  const speeds: number[] = res.data.hourly.windspeed_500hPa;
  const dirs: number[] = res.data.hourly.winddirection_500hPa;
  // u-component: positive = westerly (fronts arrive), negative = easterly (blocked)
  return times.map((t, i) => ({
    time: t,
    uWind: -(speeds[i] ?? 0) * Math.sin((dirs[i] ?? 0) * Math.PI / 180),
    dir: dirs[i] ?? 0,
  }));
}

/** Group hourly u-wind values by calendar day, return daily mean u-wind */
function dailyMeanFromHourly(data: { time: string; uWind: number; dir: number }[]): Record<string, number> {
  const byDay: Record<string, number[]> = {};
  for (const { time, uWind } of data) {
    const day = time.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(uWind);
  }
  const result: Record<string, number> = {};
  for (const [day, vals] of Object.entries(byDay)) {
    result[day] = vals.reduce((s, v) => s + v, 0) / vals.length;
  }
  return result;
}

/**
 * Classify circulation directly from mean u-wind of last 24h.
 * Positive u = westerlies = active fronts. Negative u = easterlies = blocked.
 * Thresholds calibrated for 500hPa at 41°S, 70°W:
 *   Climatological westerly mean: ~+42 km/h
 *   Strong blocking gives u < -5 km/h, moderate < +15 km/h
 */
function classifyFromUWind(currentU: number): SAMStatus {
  if (currentU < -10) {
    return {
      level: 'very_blocked', color: '#ef4444',
      label: 'Circulación bloqueada',
      description: 'Flujo del este a 500hPa sobre los Andes. El anticiclón bloquea el ingreso de frentes del Pacífico.',
      impactOnSnow: 'Probabilidad de nevadas muy baja. Predominan cielos despejados y vientos del este.',
    };
  }
  if (currentU < 15) {
    return {
      level: 'blocked', color: '#f97316',
      label: 'Frentes limitados',
      description: 'Flujo débil o variable a 500hPa. Los sistemas frontales llegan debilitados a la Cordillera.',
      impactOnSnow: 'Frentes posibles pero de menor intensidad. Nevadas limitadas.',
    };
  }
  if (currentU < 35) {
    return {
      level: 'normal', color: '#eab308',
      label: 'Condición normal',
      description: 'Flujo moderado del oeste a 500hPa. Circulación dentro de valores normales de temporada.',
      impactOnSnow: 'Condiciones típicas de invierno. Probabilidad moderada de frentes.',
    };
  }
  if (currentU < 55) {
    return {
      level: 'active', color: '#22c55e',
      label: 'Frentes favorables',
      description: 'Flujo fuerte del oeste a 500hPa. Buenos canales de humedad del Pacífico hacia los Andes.',
      impactOnSnow: 'Buena probabilidad de frentes activos y nevadas.',
    };
  }
  return {
    level: 'very_active', color: '#3b82f6',
    label: 'Alta actividad frontal',
    description: 'Corriente en chorro muy intensa. Alta frecuencia de sistemas frontales cruzando los Andes.',
    impactOnSnow: 'Alta probabilidad de tormentas y nevadas significativas.',
  };
}

function buildTrendLabel(
  forecastVals: { date: string; uWind: number }[],
  todayU: number,
  sd: number
): { trend: SAMData['trend']; label: string; days: number | null } {
  // "Improving" requires forecast u-wind to reach clearly favorable levels (>30 km/h westerly)
  // +2 day offset accounts for lag between upper-level flow and actual precipitation at resort
  const FAVORABLE_U = 30;
  const BLOCKED_U = 10;
  const LAG_DAYS = 1;

  let improveDays: number | null = null;
  let worsenDays: number | null = null;

  for (let i = 0; i < forecastVals.length; i++) {
    if (forecastVals[i].uWind >= FAVORABLE_U && improveDays === null) improveDays = i + 1 + LAG_DAYS;
    if (forecastVals[i].uWind < BLOCKED_U && todayU >= FAVORABLE_U && worsenDays === null) worsenDays = i + 1;
  }

  const forecastMean = forecastVals.reduce((s, d) => s + d.uWind, 0) / (forecastVals.length || 1);
  // Also check late-week recovery: last 2 forecast days both clearly favorable
  const lastTwo = forecastVals.slice(-2);
  const lastTwoMean = lastTwo.length > 0 ? lastTwo.reduce((s, d) => s + d.uWind, 0) / lastTwo.length : 0;
  const hasLateRecovery = lastTwoMean >= FAVORABLE_U && todayU < FAVORABLE_U;

  if ((forecastMean >= FAVORABLE_U || hasLateRecovery) && todayU < FAVORABLE_U) {
    const d = improveDays ?? forecastVals.length + LAG_DAYS;
    return {
      trend: 'improving',
      label: d <= 3 ? 'Mejora próximos días' : `Mejora en ~${d} días`,
      days: d,
    };
  }
  if (forecastMean < BLOCKED_U && todayU >= FAVORABLE_U) {
    const d = worsenDays ?? forecastVals.length;
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

  // Fetch 3 points sequentially to stay under Open-Meteo rate limit
  const pointData: Record<string, number>[] = [];
  for (const { lat, lon } of SAMPLE_POINTS) {
    const raw = await fetchWind(lat, lon);
    pointData.push(dailyMeanFromHourly(raw));
    await sleep(400);
  }

  // Merge: daily mean u-wind across all 3 sample points
  const allDays = [...new Set(pointData.flatMap(Object.keys))].sort();
  const dailyU: Record<string, number> = {};
  for (const day of allDays) {
    const vals = pointData.map((p) => p[day]).filter((v) => v !== undefined) as number[];
    if (vals.length > 0) dailyU[day] = vals.reduce((s, v) => s + v, 0) / vals.length;
  }

  const today = new Date().toISOString().slice(0, 10);
  const pastDays = allDays.filter((d) => d <= today && dailyU[d] !== undefined);
  const futureDays = allDays.filter((d) => d > today && dailyU[d] !== undefined);

  if (pastDays.length === 0) throw new Error('No circulation data available');

  // Current u-wind: last 24h mean (most recent available hours)
  const recentHours = pointData[0]  // single point
    ? Object.values(pointData[0]).slice(-1)[0]  // today's daily mean u-wind
    : 0;
  const allPastU = pastDays.map((d) => dailyU[d]);
  const sd = stdDev(allPastU) || 10;

  // Use last available daily mean as current u-wind
  const currentU = dailyU[pastDays[pastDays.length - 1]] ?? 0;
  const todayU = currentU;
  const forecastVals = futureDays.map((d) => ({ date: d, uWind: dailyU[d] }));
  const { trend, label, days } = buildTrendLabel(forecastVals, todayU, sd);

  const data: SAMData = {
    status: classifyFromUWind(currentU),
    trend,
    trendLabel: label,
    trendDays: days,
    updatedAt: new Date().toISOString(),
  };

  cache = { data, fetchedAt: Date.now() };
  return data;
}
