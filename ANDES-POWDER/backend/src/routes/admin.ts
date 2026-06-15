import { Router } from 'express';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

// Force run migrations
router.post('/migrate', async (req, res) => {
  try {
    console.log('🔄 Force running database migrations...');
    
    const migrationsDir = path.join(__dirname, '../../database/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    for (const file of migrationFiles) {
      console.log(`\n📄 Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await pool.query(sql);
        console.log(`✅ Migration ${file} completed successfully`);
      } catch (error: any) {
        if (error.code === '42P07' || error.message.includes('already exists')) {
          console.log(`⚠️  Migration ${file} - objects already exist (skipping)`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n✅ All migrations completed successfully!');
    res.json({ 
      success: true, 
      message: 'Migrations completed successfully',
      filesProcessed: migrationFiles.length 
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Force forecast update
router.post('/trigger-forecast', async (req, res) => {
  try {
    const { forecastService } = await import('../services/forecast-service');

    console.log('🔄 Force running forecast update...');
    await forecastService.processAllResorts();

    console.log('✅ Forecast update completed successfully!');
    res.json({
      success: true,
      message: 'Forecast update completed successfully'
    });
  } catch (error) {
    console.error('❌ Forecast update failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/forecast-status', async (req, res) => {
  try {
    const pool = (await import('../config/database')).default;

    const result = await pool.query(`
      SELECT
        r.name,
        r.slug,
        fr.created_at as last_run,
        fr.issued_at as forecast_issued,
        fr.valid_from,
        fr.valid_to,
        COUNT(DISTINCT ef.id) as forecast_count
      FROM resorts r
      LEFT JOIN LATERAL (
        SELECT id, created_at, issued_at, valid_from, valid_to
        FROM forecast_runs
        WHERE resort_id = r.id
        ORDER BY created_at DESC
        LIMIT 1
      ) fr ON true
      LEFT JOIN elevation_forecasts ef ON ef.forecast_run_id = fr.id
      GROUP BY r.id, r.name, r.slug, fr.created_at, fr.issued_at, fr.valid_from, fr.valid_to
      ORDER BY r.name
    `);

    res.json({
      resorts: result.rows,
      summary: {
        total: result.rows.length,
        with_forecasts: result.rows.filter(r => r.last_run !== null).length,
        without_forecasts: result.rows.filter(r => r.last_run === null).length
      }
    });
  } catch (error) {
    console.error('Error fetching forecast status:', error);
    res.status(500).json({ error: 'Failed to fetch forecast status' });
  }
});

router.get('/snowfall-history', async (req, res) => {
  try {
    const { resort: resortParam, elevation, start, end } = req.query as any;
    if (!resortParam) return res.status(400).json({ error: 'Missing resort param' });

    const resortResult = await pool.query(
      'SELECT id, slug, name FROM resorts WHERE slug = $1 OR id::text = $1',
      [String(resortParam)]
    );
    if (resortResult.rows.length === 0) return res.status(404).json({ error: 'Resort not found' });

    const resort = resortResult.rows[0];
    const endDate = end ? String(end) : new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0];
    const startDate = start ? String(start) : new Date(Date.now() - 8*24*60*60*1000).toISOString().split('T')[0];

    const params: any[] = [resort.id, startDate, endDate];
    let sql = `SELECT to_char(date, 'YYYY-MM-DD') AS date, elevation_band, snowfall_cm, temperature_avg_c
               FROM snowfall_history
               WHERE resort_id = $1 AND date >= $2::date AND date <= $3::date`;
    if (elevation) {
      sql += ' AND elevation_band = $4';
      params.push(String(elevation));
    }
    sql += ' ORDER BY date ASC, elevation_band';

    const r = await pool.query(sql, params);
    res.json({ resort, startDate, endDate, count: r.rowCount, rows: r.rows });
  } catch (error) {
    console.error('Error reading snowfall_history:', error);
    res.status(500).json({ error: 'Failed to read snowfall_history' });
  }
});

router.post('/backfill-snowfall-history', async (req, res) => {
  const client = await pool.connect();
  try {
    const daysParam = (req.query.days || (req.body && req.body.days)) as any;
    const singleResort = (req.query.resort || (req.body && req.body.resort)) as any;
    const days = Math.max(1, Math.min(30, parseInt(String(daysParam || '10')) || 10));

    const resortsSql = singleResort
      ? 'SELECT id, name, slug, COALESCE(NULLIF(timezone, \'\'), \'America/Argentina/Buenos_Aires\') AS timezone FROM resorts WHERE slug = $1 OR id::text = $1'
      : 'SELECT id, name, slug, COALESCE(NULLIF(timezone, \'\'), \'America/Argentina/Buenos_Aires\') AS timezone FROM resorts ORDER BY name';
    const resortsParams = singleResort ? [String(singleResort)] : [];
    const resorts = (await client.query(resortsSql, resortsParams)).rows;
    if (resorts.length === 0) return res.status(404).json({ error: 'Resort(s) not found' });

    const elevations = ['base', 'mid', 'summit'];

    // We backfill up to yesterday to avoid partial current-day values
    const end = new Date();
    end.setDate(end.getDate() - 1);
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));

    let totalUpserts = 0;

    for (const resort of resorts) {
      // Sanitize timezone like in accumulation endpoint
      const tzCandidate = resort.timezone || 'America/Argentina/Buenos_Aires';
      const tz = typeof tzCandidate === 'string' && /^[A-Za-z_\\/+-]+$/.test(tzCandidate)
        ? tzCandidate
        : 'America/Argentina/Buenos_Aires';

      for (const elevation of elevations) {
        for (
          let d = new Date(start);
          d.getTime() <= end.getTime();
          d.setDate(d.getDate() + 1)
        ) {
          const dayKey = d.toISOString().split('T')[0];
          // Aggregate using resort-local day boundaries
          const agg = await client.query(
            `WITH run AS (
               SELECT id
               FROM forecast_runs
               WHERE resort_id = $1
                 AND created_at <= (($4::date + INTERVAL '1 day') AT TIME ZONE $3)
               ORDER BY created_at DESC
               LIMIT 1
             )
             SELECT 
               SUM(snowfall_cm_corrected) AS total_snowfall,
               AVG(temperature_c) AS avg_temp
             FROM elevation_forecasts
             WHERE resort_id = $1
               AND elevation_band = $2
               AND forecast_run_id = (SELECT id FROM run)
               AND (valid_time AT TIME ZONE $3) >= $4::date
               AND (valid_time AT TIME ZONE $3) < ($4::date + INTERVAL '1 day')`,
            [resort.id, elevation, tz, dayKey]
          );

          if (agg.rows.length > 0 && agg.rows[0].total_snowfall !== null) {
            const snowfall = parseFloat(agg.rows[0].total_snowfall) || 0;
            const avgTemp = agg.rows[0].avg_temp != null ? parseFloat(agg.rows[0].avg_temp) : null;

            await client.query(
              `INSERT INTO snowfall_history (
                 resort_id, elevation_band, date, snowfall_cm, temperature_avg_c
               ) VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (resort_id, elevation_band, date)
               DO UPDATE SET 
                 snowfall_cm = EXCLUDED.snowfall_cm,
                 temperature_avg_c = EXCLUDED.temperature_avg_c,
                 created_at = NOW()`,
              [resort.id, elevation, dayKey, snowfall, avgTemp]
            );
            totalUpserts += 1;
          }
        }
      }
    }

    res.json({
      success: true,
      resortsProcessed: resorts.length,
      daysBackfilled: days,
      rowsUpserted: totalUpserts,
      message: 'snowfall_history backfilled successfully'
    });
  } catch (error) {
    console.error('Error backfilling snowfall_history:', error);
    res.status(500).json({ error: 'Failed to backfill snowfall_history' });
  } finally {
    client.release();
  }
});

export default router;
