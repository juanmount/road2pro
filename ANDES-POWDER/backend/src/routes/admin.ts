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

export default router;
