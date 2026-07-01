/**
 * AAO (Antarctic Oscillation / SAM) Service
 * Fetches daily index from NOAA CPC and interprets it for Patagonian ski forecasting.
 * Negative phase → fronts cross Andes more easily → better snow chances.
 * Positive phase → blocking anticyclone over Pacific → fronts blocked.
 */

import axios from 'axios';

const NOAA_AAO_URL =
  'https://www.cpc.ncep.noaa.gov/products/precip/CWlink/daily_ao_index/aao/daily_aao_index.txt';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface AAODay {
  date: string; // YYYY-MM-DD
  index: number;
}

interface AAOStatus {
  level: 'very_blocked' | 'blocked' | 'neutral_positive' | 'neutral' | 'active' | 'very_active';
  color: string;
  label: string;
  description: string;
  impactOnSnow: string;
}

export interface AAOData {
  current: number;
  date: string;
  trend: 'rising' | 'falling' | 'stable';
  trendDelta: number;
  status: AAOStatus;
  last14Days: AAODay[];
  updatedAt: string;
}

let cache: { data: AAOData; fetchedAt: number } | null = null;

function classifyAAO(index: number): AAOStatus {
  if (index >= 2.0) {
    return {
      level: 'very_blocked',
      color: '#ef4444',
      label: 'Muy bloqueado',
      description: 'La circulación atmosférica está fuertemente bloqueada. Los sistemas frontales del Pacífico tienen dificultad para cruzar los Andes.',
      impactOnSnow: 'Probabilidad de nevadas muy baja. Predominan cielos despejados y vientos del este.',
    };
  }
  if (index >= 1.0) {
    return {
      level: 'blocked',
      color: '#f97316',
      label: 'Bloqueado',
      description: 'Un anticiclón sobre el Pacífico Sur limita la llegada de frentes a la Cordillera Patagónica.',
      impactOnSnow: 'Frentes débiles o bloqueados. Nevadas posibles pero de menor intensidad.',
    };
  }
  if (index >= 0.0) {
    return {
      level: 'neutral_positive',
      color: '#eab308',
      label: 'Neutro +',
      description: 'Condiciones cercanas a lo normal con ligera tendencia bloqueante.',
      impactOnSnow: 'Condiciones normales de temporada. Frentes con posibilidad moderada de cruce.',
    };
  }
  if (index >= -1.0) {
    return {
      level: 'active',
      color: '#22c55e',
      label: 'Activo',
      description: 'El cinturón de vientos del oeste se desplaza hacia el norte, favoreciendo el cruce de frentes sobre los Andes patagónicos.',
      impactOnSnow: 'Buena probabilidad de frentes activos. Condiciones favorables para nevadas.',
    };
  }
  return {
    level: 'very_active',
    color: '#3b82f6',
    label: 'Muy activo',
    description: 'Fase muy negativa de la AAO. Alta actividad frontal con sistemas intensos cruzando los Andes.',
    impactOnSnow: 'Alta probabilidad de tormentas y nevadas significativas. Condiciones óptimas para acumulación.',
  };
}

function parseAAOText(text: string): AAODay[] {
  const lines = text.trim().split('\n');
  const days: AAODay[] = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    const index = parseFloat(parts[3]);

    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(index)) continue;

    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push({ date, index });
  }

  return days;
}

export class AAOService {
  async getCurrentAAOData(): Promise<AAOData> {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.data;
    }

    const response = await axios.get(NOAA_AAO_URL, { timeout: 10000, responseType: 'text' });
    const allDays = parseAAOText(response.data as string);

    if (allDays.length === 0) {
      throw new Error('No AAO data parsed from NOAA');
    }

    const last14Days = allDays.slice(-14);
    const latest = last14Days[last14Days.length - 1];
    const sevenDaysAgo = last14Days.slice(0, 7);
    const sevenDayAvg = sevenDaysAgo.reduce((s, d) => s + d.index, 0) / sevenDaysAgo.length;

    const delta = latest.index - sevenDayAvg;
    let trend: AAOData['trend'];
    if (delta > 0.3) trend = 'rising';
    else if (delta < -0.3) trend = 'falling';
    else trend = 'stable';

    const data: AAOData = {
      current: Math.round(latest.index * 100) / 100,
      date: latest.date,
      trend,
      trendDelta: Math.round(delta * 100) / 100,
      status: classifyAAO(latest.index),
      last14Days,
      updatedAt: new Date().toISOString(),
    };

    cache = { data, fetchedAt: Date.now() };
    return data;
  }
}

export const aaoService = new AAOService();
