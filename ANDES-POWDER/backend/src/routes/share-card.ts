import { Router, Request, Response } from 'express';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import pool from '../config/database';

const router = Router();

// ── Font cache ──────────────────────────────────────────────────────────────
let _fontReg: ArrayBuffer | null = null;
let _fontBold: ArrayBuffer | null = null;

async function loadFonts(): Promise<[ArrayBuffer, ArrayBuffer]> {
  if (!_fontReg || !_fontBold) {
    const base = 'https://unpkg.com/@fontsource/inter@5.0.8/files';
    [_fontReg, _fontBold] = await Promise.all([
      fetch(`${base}/inter-latin-400-normal.woff2`).then(r => r.arrayBuffer()),
      fetch(`${base}/inter-latin-700-normal.woff2`).then(r => r.arrayBuffer()),
    ]);
  }
  return [_fontReg!, _fontBold!];
}

// ── Constants ───────────────────────────────────────────────────────────────
const DAYS_ES   = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MONTHS_ES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

const BG         = '#0B1829';
const BG_ROW_ALT = '#0F2035';
const BLUE       = '#4EA8DE';
const WHITE      = '#FFFFFF';
const GRAY       = '#8B9BB4';
const SNOW_BG    = '#1A3A5C';
const SNOW_TEXT  = '#BFDBFE';
const RAIN_BG    = '#1F2937';
const RAIN_TEXT  = '#9CA3AF';
const MIX_BG     = '#1E3050';
const MIX_TEXT   = '#93C5FD';

// ── Helpers ─────────────────────────────────────────────────────────────────
interface DayRow {
  dateStr:   string;
  dayLabel:  string;
  dateNum:   number;
  tmax:      number;
  tmin:      number;
  frzAvg:    number;
  frzAm:     number | null;
  frzPm:     number | null;
  base:      ElevBand;
  mid:       ElevBand;
  summit:    ElevBand;
}

interface ElevBand {
  phase:    'nieve' | 'mixto' | 'lluvia' | 'sin prec';
  snowCm:   number;
}

function classifyPhase(frzM: number | null, elevM: number, snowCm: number, precipMm: number): ElevBand['phase'] {
  if (precipMm < 0.5) return 'sin prec';
  if (!frzM) return snowCm > 0.5 ? 'nieve' : 'lluvia';
  const diff = frzM - elevM;
  if (diff <= -200) return 'nieve';
  if (diff >= 200)  return 'lluvia';
  return 'mixto';
}

function trendArrow(am: number | null, pm: number | null): string {
  if (!am || !pm) return '→';
  const d = pm - am;
  return d > 150 ? '↑' : d < -150 ? '↓' : '→';
}

function trendColor(arrow: string): string {
  return arrow === '↑' ? '#F87171' : arrow === '↓' ? '#60A5FA' : '#6B7280';
}

function phaseBadge(band: ElevBand) {
  const { phase, snowCm } = band;
  const configs = {
    'nieve':    { bg: SNOW_BG, color: SNOW_TEXT, label: 'NIEVE' },
    'mixto':    { bg: MIX_BG,  color: MIX_TEXT,  label: 'MIXTO' },
    'lluvia':   { bg: RAIN_BG, color: RAIN_TEXT,  label: 'LLUVIA' },
    'sin prec': { bg: 'transparent', color: '#374151', label: '—' },
  };
  const c = configs[phase];
  const cmText = phase === 'nieve' && snowCm >= 1 ? `${Math.round(snowCm)}cm` : '';
  return { ...c, cmText };
}

// ── Card builder (satori element format — no React needed) ──────────────────
function el(type: string, props: Record<string, any>, ...children: any[]) {
  return { type, props: { ...props, children: children.length === 1 ? children[0] : children } };
}

function buildCard(
  resortName: string,
  baseElev: number, midElev: number, summitElev: number,
  days: DayRow[],
  startDate: string, endDate: string,
) {
  const W = 580;
  const H = 1040;
  const COL = { day: 72, temp: 78, frz: 68, trend: 28, base: 94, mid: 94, summit: 94 };
  const ROW_H = 42;
  const HEADER_H = 170;
  const TABLE_TOP = HEADER_H + 70; // after elev headers

  const tableRows = days.map((d, i) => {
    const arrow = trendArrow(d.frzAm, d.frzPm);
    const baseBadge   = phaseBadge(d.base);
    const midBadge    = phaseBadge(d.mid);
    const summitBadge = phaseBadge(d.summit);
    const rowBg = i % 2 === 0 ? BG : BG_ROW_ALT;

    const badgeEl = (badge: ReturnType<typeof phaseBadge>) =>
      el('div', {
        style: {
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 2,
          background: badge.bg, borderRadius: 6,
          width: COL.base - 8, height: ROW_H - 10,
        }
      },
        el('span', { style: { color: badge.color, fontSize: 9, fontWeight: 700, letterSpacing: 0.5 } }, badge.label),
        badge.cmText ? el('span', { style: { color: SNOW_TEXT, fontSize: 11, fontWeight: 700 } }, badge.cmText) : null,
      );

    return el('div', {
      key: d.dateStr,
      style: {
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        background: rowBg, width: W, height: ROW_H,
        borderBottom: '1px solid #132030',
      }
    },
      // Day + date
      el('div', { style: { width: COL.day, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingLeft: 8 } },
        el('span', { style: { color: BLUE, fontSize: 10, fontWeight: 700 } }, d.dayLabel),
        el('span', { style: { color: WHITE, fontSize: 16, fontWeight: 700 } }, String(d.dateNum)),
      ),
      // Temp
      el('div', { style: { width: COL.temp, display: 'flex', flexDirection: 'column', alignItems: 'center' } },
        el('span', { style: { color: WHITE, fontSize: 12, fontWeight: 600 } }, `${d.tmax > 0 ? '+' : ''}${d.tmax}°`),
        el('span', { style: { color: GRAY, fontSize: 10 } }, `${d.tmin}°`),
      ),
      // FRZ
      el('div', { style: { width: COL.frz, display: 'flex', flexDirection: 'column', alignItems: 'center' } },
        el('span', { style: { color: GRAY, fontSize: 10 } }, `${Math.round(d.frzAvg / 100) * 100}m`),
      ),
      // Trend
      el('div', { style: { width: COL.trend, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        el('span', { style: { color: trendColor(arrow), fontSize: 16, fontWeight: 700 } }, arrow),
      ),
      // Base
      el('div', { style: { width: COL.base, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        badgeEl(baseBadge),
      ),
      // Mid
      el('div', { style: { width: COL.mid, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        badgeEl(midBadge),
      ),
      // Summit
      el('div', { style: { width: COL.summit, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        badgeEl(summitBadge),
      ),
    );
  });

  const headerRow = el('div', {
    style: {
      display: 'flex', flexDirection: 'row', alignItems: 'center',
      background: '#0A1520', width: W, height: 28,
      borderBottom: '1px solid #1E3A5F', borderTop: '1px solid #1E3A5F',
    }
  },
    el('div', { style: { width: COL.day, display: 'flex', justifyContent: 'center' } },
      el('span', { style: { color: GRAY, fontSize: 8, fontWeight: 700, letterSpacing: 1 } }, 'DÍA'),
    ),
    el('div', { style: { width: COL.temp, display: 'flex', justifyContent: 'center' } },
      el('span', { style: { color: GRAY, fontSize: 8, fontWeight: 700, letterSpacing: 0.5 } }, 'TMAX/MIN'),
    ),
    el('div', { style: { width: COL.frz, display: 'flex', justifyContent: 'center' } },
      el('span', { style: { color: GRAY, fontSize: 8, fontWeight: 700, letterSpacing: 0.5 } }, 'FRZ'),
    ),
    el('div', { style: { width: COL.trend } }),
    el('div', { style: { width: COL.base, display: 'flex', justifyContent: 'center' } },
      el('span', { style: { color: GRAY, fontSize: 8, fontWeight: 700 } }, `BASE ${baseElev}m`),
    ),
    el('div', { style: { width: COL.mid, display: 'flex', justifyContent: 'center' } },
      el('span', { style: { color: GRAY, fontSize: 8, fontWeight: 700 } }, `MID ${midElev}m`),
    ),
    el('div', { style: { width: COL.summit, display: 'flex', justifyContent: 'center' } },
      el('span', { style: { color: GRAY, fontSize: 8, fontWeight: 700 } }, `CIMA ${summitElev}m`),
    ),
  );

  const elevIcons = el('div', {
    style: {
      display: 'flex', flexDirection: 'row', justifyContent: 'space-around',
      alignItems: 'center', width: W, height: 42, marginTop: 12,
    }
  },
    ...[
      { label: 'BASE', elev: baseElev },
      { label: 'MID',  elev: midElev },
      { label: 'CIMA', elev: summitElev },
    ].map(({ label, elev }) =>
      el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 } },
        el('span', { style: { color: WHITE, fontSize: 13, fontWeight: 700 } }, label),
        el('span', { style: { color: BLUE, fontSize: 11 } }, `${elev}m`),
      )
    ),
  );

  const legend = el('div', {
    style: {
      display: 'flex', flexDirection: 'row', justifyContent: 'center',
      alignItems: 'center', gap: 14, width: W, height: 32,
      background: '#0A1520', borderTop: '1px solid #1E3A5F',
    }
  },
    ...[
      { label: 'LLUVIA', bg: RAIN_BG, color: RAIN_TEXT },
      { label: 'MIXTO',  bg: MIX_BG,  color: MIX_TEXT },
      { label: 'NIEVE',  bg: SNOW_BG, color: SNOW_TEXT },
    ].map(({ label, bg, color }) =>
      el('div', { style: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 } },
        el('div', { style: { width: 8, height: 8, borderRadius: 2, background: bg } }),
        el('span', { style: { color, fontSize: 8, fontWeight: 600 } }, label),
      )
    ),
    el('span', { style: { color: '#F87171', fontSize: 9, marginLeft: 8 } }, '↑ SUBE'),
    el('span', { style: { color: '#60A5FA', fontSize: 9 } }, '↓ BAJA'),
    el('span', { style: { color: '#6B7280', fontSize: 9 } }, '→ ESTABLE'),
  );

  const footer = el('div', {
    style: {
      display: 'flex', flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', width: W, height: 36,
      paddingLeft: 16, paddingRight: 16,
      background: '#070F1A',
    }
  },
    el('span', { style: { color: GRAY, fontSize: 9, letterSpacing: 0.5 } }, 'SEGUÍ LA NIEVE ARGENTINA MINUTO A MINUTO'),
    el('div', { style: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 } },
      el('span', { style: { color: GRAY, fontSize: 9 } }, 'andes '),
      el('span', { style: { color: BLUE, fontSize: 9, fontWeight: 700 } }, 'powder'),
    ),
  );

  return el('div', {
    style: {
      display: 'flex', flexDirection: 'column', width: W, height: H,
      background: BG, fontFamily: 'Inter',
    }
  },
    // Header gradient band
    el('div', {
      style: {
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        width: W, height: HEADER_H,
        background: 'linear-gradient(180deg, #0D2A4A 0%, #0B1829 100%)',
        paddingLeft: 20, paddingBottom: 16, paddingTop: 20,
      }
    },
      el('span', { style: { color: BLUE, fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 6 } }, 'ANDES POWDER'),
      el('span', { style: { color: WHITE, fontSize: 28, fontWeight: 700, letterSpacing: 3 } }, resortName.toUpperCase()),
      el('span', { style: { color: BLUE, fontSize: 13, fontWeight: 600, marginTop: 4 } }, `${startDate} — ${endDate}`),
    ),
    // Elevation icons
    elevIcons,
    // Table header
    headerRow,
    // Data rows
    el('div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } }, ...tableRows),
    // Legend
    legend,
    // Footer
    footer,
  );
}

// ── Route ───────────────────────────────────────────────────────────────────
router.get('/:id/share-card', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const days = Math.min(parseInt(req.query.days as string) || 14, 14);

    // Resort info
    const resortRes = await pool.query(
      `SELECT id, name, slug, base_elevation, mid_elevation, summit_elevation
       FROM resorts WHERE slug = $1 OR id::text = $1 LIMIT 1`,
      [id]
    );
    if (!resortRes.rows.length) return res.status(404).json({ error: 'Resort not found' });
    const resort = resortRes.rows[0];

    // Daily aggregated forecast for all 3 elevations
    const fcRes = await pool.query(`
      SELECT
        elevation_band,
        (valid_time AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS local_date,
        ROUND(MAX(temperature_c)::numeric, 0)                                         AS tmax,
        ROUND(MIN(temperature_c)::numeric, 0)                                         AS tmin,
        ROUND(AVG(freezing_level_m)::numeric, -2)                                     AS frz_avg,
        ROUND(AVG(CASE WHEN EXTRACT(hour FROM valid_time AT TIME ZONE 'America/Argentina/Buenos_Aires') < 12
                        THEN freezing_level_m END)::numeric, -2)                       AS frz_am,
        ROUND(AVG(CASE WHEN EXTRACT(hour FROM valid_time AT TIME ZONE 'America/Argentina/Buenos_Aires') >= 12
                        THEN freezing_level_m END)::numeric, -2)                       AS frz_pm,
        ROUND(SUM(CASE WHEN phase_classification IN ('snow','sleet','mixed')
                        THEN snowfall_cm_corrected ELSE 0 END)::numeric, 1)            AS snow_cm,
        ROUND(SUM(precipitation_mm)::numeric, 1)                                       AS precip_mm
      FROM elevation_forecasts
      WHERE resort_id = $1::uuid
        AND valid_time >= CURRENT_DATE AT TIME ZONE 'America/Argentina/Buenos_Aires'
        AND valid_time < (CURRENT_DATE + INTERVAL '1 day' * $2) AT TIME ZONE 'America/Argentina/Buenos_Aires'
        AND forecast_run_id = (
          SELECT id FROM forecast_runs WHERE resort_id = $1::uuid ORDER BY created_at DESC LIMIT 1
        )
      GROUP BY elevation_band, local_date
      ORDER BY local_date, elevation_band
    `, [resort.id, days]);

    // Pivot by date
    const byDate: Record<string, Record<string, any>> = {};
    for (const row of fcRes.rows) {
      const d = row.local_date instanceof Date
        ? row.local_date.toISOString().slice(0, 10)
        : String(row.local_date);
      if (!byDate[d]) byDate[d] = {};
      byDate[d][row.elevation_band] = row;
    }

    const sortedDates = Object.keys(byDate).sort().slice(0, days);
    if (!sortedDates.length) return res.status(404).json({ error: 'No forecast data available' });

    const baseElev   = resort.base_elevation   ?? 1000;
    const midElev    = resort.mid_elevation    ?? 1700;
    const summitElev = resort.summit_elevation ?? 2100;

    const dayRows: DayRow[] = sortedDates.map(dateStr => {
      const d = new Date(dateStr + 'T12:00:00Z');
      const base   = byDate[dateStr]['base']   || {};
      const mid    = byDate[dateStr]['mid']    || {};
      const summit = byDate[dateStr]['summit'] || {};
      const frzAvg = parseFloat(mid.frz_avg ?? base.frz_avg ?? summitElev);

      return {
        dateStr,
        dayLabel: DAYS_ES[d.getUTCDay()],
        dateNum:  d.getUTCDate(),
        tmax: parseInt(mid.tmax ?? '0'),
        tmin: parseInt(mid.tmin ?? '0'),
        frzAvg,
        frzAm: mid.frz_am  ? parseFloat(mid.frz_am)  : null,
        frzPm: mid.frz_pm  ? parseFloat(mid.frz_pm)  : null,
        base:   { phase: classifyPhase(frzAvg, baseElev,   parseFloat(base.snow_cm ?? '0'),   parseFloat(base.precip_mm ?? '0')),   snowCm: parseFloat(base.snow_cm   ?? '0') },
        mid:    { phase: classifyPhase(frzAvg, midElev,    parseFloat(mid.snow_cm  ?? '0'),    parseFloat(mid.precip_mm  ?? '0')),   snowCm: parseFloat(mid.snow_cm    ?? '0') },
        summit: { phase: classifyPhase(frzAvg, summitElev, parseFloat(summit.snow_cm ?? '0'), parseFloat(summit.precip_mm ?? '0')), snowCm: parseFloat(summit.snow_cm ?? '0') },
      };
    });

    // Date range label
    const first = new Date(sortedDates[0] + 'T12:00:00Z');
    const last  = new Date(sortedDates[sortedDates.length - 1] + 'T12:00:00Z');
    const startLabel = `${first.getUTCDate()} ${MONTHS_ES[first.getUTCMonth()]}`;
    const endLabel   = `${last.getUTCDate()} ${MONTHS_ES[last.getUTCMonth()]} ${last.getUTCFullYear()}`;

    // Load fonts
    const [fontReg, fontBold] = await loadFonts();

    // Generate SVG via satori
    const cardEl = buildCard(resort.name, baseElev, midElev, summitElev, dayRows, startLabel, endLabel);
    const svg = await satori(cardEl as any, {
      width: 580,
      height: 1040,
      fonts: [
        { name: 'Inter', data: fontReg,  weight: 400, style: 'normal' },
        { name: 'Inter', data: fontBold, weight: 700, style: 'normal' },
      ],
    });

    // Convert SVG → PNG
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 580 } });
    const png = resvg.render().asPng();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Disposition', `inline; filename="forecast-${resort.slug}.png"`);
    res.send(Buffer.from(png));
  } catch (err) {
    console.error('[share-card] Error:', err);
    res.status(500).json({ error: 'Failed to generate share card' });
  }
});

export default router;
