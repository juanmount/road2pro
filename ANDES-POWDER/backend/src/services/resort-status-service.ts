/**
 * Resort Operational Status Service
 * Scrapes lift/slope open counts from skiresort.info for all Argentine resorts.
 * Also fetches individual lift statuses from:
 *   - ws.busplus.com.ar API (Catedral CA, Chapelco CH, La Hoya LH)
 *   - cerrobayo.com.ar/montana/estado/ HTML scrape (Cerro Bayo)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import pool from '../config/database';

interface LiftStatus {
  name: string;
  status: 'open' | 'conditional' | 'closed' | 'unknown';
}

interface LiftSector {
  sector: string;
  lifts: LiftStatus[];
}

interface ResortStatus {
  liftsOpen: number | null;
  liftsTotal: number | null;
  runsOpenKm: number | null;
  runsTotalKm: number | null;
  snowDepthBaseCm: number | null;
  snowDepthSummitCm: number | null;
  resortOpen: boolean;
  liftsDetail?: LiftSector[] | null;
}

// Map our app slugs to skiresort.info URL slugs
const SRI_SLUG_MAP: Record<string, string> = {
  'cerro-catedral': 'catedral-alta-patagonia',
  'cerro-chapelco': 'chapelco',
  'las-lenas':      'las-lenas',
  'cerro-bayo':     'cerro-bayo',
  'cerro-castor':   'cerro-castor',
  'la-hoya':        'la-hoya',
  'caviahue':       'caviahue',
};

// Map our app slugs to busplus.com.ar centro codes
const BUSPLUS_CENTRO_MAP: Record<string, string> = {
  'cerro-catedral': 'CA',
  'cerro-chapelco': 'CH',
  'la-hoya':        'LH',
};

const BUSPLUS_URL    = 'https://ws.busplus.com.ar/centrosesqui/partediario/';
const BUSPLUS_KEY    = 'ij877HGyh74U&mmwsYH';
const CERRO_BAYO_URL = 'https://www.cerrobayo.com.ar/montana/estado/';

const USER_AGENT =
  'AndesPowder/1.0 (+https://andespowder.com; contact: info@andespowder.com)';

export class ResortStatusService {
  private async scrapeStatus(sriSlug: string): Promise<ResortStatus> {
    const url = `https://www.skiresort.info/ski-resort/${sriSlug}/snow-report/`;

    const { data: html } = await axios.get(url, {
      timeout: 12000,
      headers: { 'User-Agent': USER_AGENT },
    });

    const $ = cheerio.load(html);
    const text = $.text();

    // Lifts: "5 of 29 lifts"
    const liftsMatch = text.match(/(\d+)\s+of\s+(\d+)\s+lifts/i);
    const liftsOpen  = liftsMatch ? parseInt(liftsMatch[1]) : null;
    const liftsTotal = liftsMatch ? parseInt(liftsMatch[2]) : null;

    // Slopes: "1.5 of 48 km"
    const kmMatch    = text.match(/([\d.]+)\s+of\s+([\d.]+)\s+km/i);
    const runsOpenKm  = kmMatch ? parseFloat(kmMatch[1]) : null;
    const runsTotalKm = kmMatch ? parseFloat(kmMatch[2]) : null;

    // Snow depth base & summit (cm) — "30 cm base" / "2 cm top"
    const baseMatch    = text.match(/(\d+)\s*cm\s+base/i);
    const summitMatch  = text.match(/(\d+)\s*cm\s+(?:top|summit|cumbre)/i);
    const snowDepthBaseCm    = baseMatch   ? parseInt(baseMatch[1])   : null;
    const snowDepthSummitCm  = summitMatch ? parseInt(summitMatch[1]) : null;

    // Resort open status
    const resortOpen = /ski resort open/i.test(text) && !/ski resort closed/i.test(text);

    return { liftsOpen, liftsTotal, runsOpenKm, runsTotalKm,
             snowDepthBaseCm, snowDepthSummitCm, resortOpen };
  }

  private normalizeBusplusStatus(raw: string | null): LiftStatus['status'] {
    if (!raw) return 'unknown';
    const s = raw.toLowerCase();
    if (s === 'normal' || s === 'abierto' || s === 'abierta') return 'open';
    if (s === 'condicional') return 'conditional';
    if (s === 'cerrado' || s === 'cerrada') return 'closed';
    return 'unknown';
  }

  private async fetchBusplusLifts(centro: string): Promise<LiftSector[]> {
    const url = `${BUSPLUS_URL}estados?Centro=${centro}`;
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: { 'PUBLIC-KEY': BUSPLUS_KEY, 'User-Agent': USER_AGENT },
    });

    if (!Array.isArray(data)) return [];

    return data
      .filter((sector: any) => Array.isArray(sector.Medios) && sector.Medios.length > 0)
      .map((sector: any) => ({
        sector: sector.SectorNombre as string,
        lifts: (sector.Medios as any[]).map((m: any) => ({
          name: m.Nombre as string,
          status: this.normalizeBusplusStatus(m.EstadoEsquiadores),
        })),
      }));
  }

  private async scrapeCerroBayoLifts(): Promise<LiftSector[]> {
    const { data: html } = await axios.get(CERRO_BAYO_URL, {
      timeout: 10000,
      headers: { 'User-Agent': USER_AGENT },
    });
    const $ = cheerio.load(html);

    const statusMap: Record<string, LiftStatus['status']> = {
      estado1: 'open',
      estado2: 'conditional',
      estado3: 'closed',
    };

    const lifts: LiftStatus[] = [];
    $('table tr').each((_: number, row: any) => {
      const name = $(row).find('th').first().text().trim();
      if (!name) return;
      const tdClass = $(row).find('td').first().attr('class') || '';
      const key = tdClass.trim() as keyof typeof statusMap;
      const status: LiftStatus['status'] = statusMap[key] ?? 'unknown';
      lifts.push({ name, status });
    });

    if (lifts.length === 0) return [];
    return [{ sector: 'Cerro Bayo', lifts }];
  }

  async syncAll(): Promise<void> {
    console.log('[ResortStatus] Starting sync for all resorts...');

    const resortRows = await pool.query(
      `SELECT id, slug FROM resorts WHERE slug = ANY($1)`,
      [Object.keys(SRI_SLUG_MAP)]
    );

    const results = await Promise.allSettled(
      resortRows.rows.map(async ({ id, slug }: { id: string; slug: string }) => {
        const sriSlug = SRI_SLUG_MAP[slug];
        if (!sriSlug) return;

        try {
          const status = await this.scrapeStatus(sriSlug);

          let liftsDetail: LiftSector[] | null = null;
          const busplusCentro = BUSPLUS_CENTRO_MAP[slug];
          if (busplusCentro) {
            try {
              liftsDetail = await this.fetchBusplusLifts(busplusCentro);
            } catch (e: any) {
              console.warn(`[ResortStatus] ${slug}: busplus fetch failed — ${e.message}`);
            }
          } else if (slug === 'cerro-bayo') {
            try {
              liftsDetail = await this.scrapeCerroBayoLifts();
            } catch (e: any) {
              console.warn(`[ResortStatus] ${slug}: cerro bayo scrape failed — ${e.message}`);
            }
          }

          await pool.query(
            `INSERT INTO resort_operational_status
               (resort_id, lifts_open, lifts_total, runs_open_km, runs_total_km,
                snow_depth_base_cm, snow_depth_summit_cm, resort_open, lifts_detail, scraped_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
             ON CONFLICT (resort_id) DO UPDATE SET
               lifts_open           = EXCLUDED.lifts_open,
               lifts_total          = EXCLUDED.lifts_total,
               runs_open_km         = EXCLUDED.runs_open_km,
               runs_total_km        = EXCLUDED.runs_total_km,
               snow_depth_base_cm   = EXCLUDED.snow_depth_base_cm,
               snow_depth_summit_cm = EXCLUDED.snow_depth_summit_cm,
               resort_open          = EXCLUDED.resort_open,
               lifts_detail         = EXCLUDED.lifts_detail,
               scraped_at           = NOW()`,
            [id, status.liftsOpen, status.liftsTotal,
             status.runsOpenKm, status.runsTotalKm,
             status.snowDepthBaseCm, status.snowDepthSummitCm,
             status.resortOpen, liftsDetail ? JSON.stringify(liftsDetail) : null]
          );
          const liftCount = liftsDetail?.reduce((s, sec) => s + sec.lifts.length, 0) ?? 0;
          console.log(`[ResortStatus] ${slug}: lifts=${status.liftsOpen}/${status.liftsTotal} km=${status.runsOpenKm}/${status.runsTotalKm} open=${status.resortOpen} detail=${liftCount} lifts`);
        } catch (err: any) {
          console.error(`[ResortStatus] ${slug}: scrape failed — ${err.message}`);
        }
      })
    );

    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`[ResortStatus] Sync done. ${resortRows.rows.length - failed}/${resortRows.rows.length} succeeded.`);
  }

  async getStatus(resortId: string): Promise<ResortStatus & { scrapedAt: Date | null } | null> {
    const { rows } = await pool.query(
      `SELECT lifts_open, lifts_total, runs_open_km, runs_total_km,
              snow_depth_base_cm, snow_depth_summit_cm, resort_open, lifts_detail, scraped_at
       FROM resort_operational_status
       WHERE resort_id = $1`,
      [resortId]
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
      liftsOpen:          r.lifts_open,
      liftsTotal:         r.lifts_total,
      runsOpenKm:         r.runs_open_km ? parseFloat(r.runs_open_km) : null,
      runsTotalKm:        r.runs_total_km ? parseFloat(r.runs_total_km) : null,
      snowDepthBaseCm:    r.snow_depth_base_cm,
      snowDepthSummitCm:  r.snow_depth_summit_cm,
      resortOpen:         r.resort_open,
      liftsDetail:        r.lifts_detail ?? null,
      scrapedAt:          r.scraped_at,
    };
  }
}

export const resortStatusService = new ResortStatusService();
