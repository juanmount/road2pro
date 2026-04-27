import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import resortsRouter from './routes/resorts';
import observationsRouter from './routes/observations';
import { getWeatherSyncScheduler } from './services/weather-sync-scheduler';
import authRouter from './routes/auth';
import favoritesRouter from './routes/favorites';
import ensoRouter from './routes/enso';
import pushRouter from './routes/push';
import validationRouter from './routes/validation';
import weatherStationRouter from './routes/weather-station';
import snapshotsRouter from './routes/snapshots';
import alertsRouter from './routes/alerts';
import { forecastCronService } from './services/forecast-cron';
import { initializeFirebase } from './config/firebase';
import { startSnapshotCron } from './jobs/daily-snapshot';
import { smnAlertsService } from './services/smn-alerts-service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

try {
  initializeFirebase();
} catch (error) {
  console.warn('Firebase not initialized. Authentication features will be disabled.');
  console.warn('Error details:', error);
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/resorts', resortsRouter);
app.use('/api/observations', observationsRouter);
app.use('/api/auth', authRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/enso', ensoRouter);
app.use('/api/push', pushRouter);
app.use('/api/validation', validationRouter);
app.use('/api/weather-station', weatherStationRouter);
app.use('/api/snapshots', snapshotsRouter);
app.use('/api/alerts', alertsRouter);

// Admin endpoint to clean old forecast data
app.post('/api/admin/clean-old-forecasts', async (req, res) => {
  try {
    console.log('Cleaning old forecast data...');
    const pool = (await import('./config/database')).default;
    const result = await pool.query(`
      DELETE FROM elevation_forecasts 
      WHERE valid_time < NOW() - INTERVAL '7 days'
    `);
    console.log(`Deleted ${result.rowCount} old forecast rows`);
    res.json({ success: true, deleted: result.rowCount });
  } catch (error: any) {
    console.error('Clean error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin endpoint to clean ALL forecast data (nuclear option)
app.post('/api/admin/clean-all-forecasts', async (req, res) => {
  try {
    console.log('NUCLEAR: Cleaning ALL forecast data...');
    const pool = (await import('./config/database')).default;
    const result = await pool.query(`DELETE FROM elevation_forecasts`);
    console.log(`Deleted ${result.rowCount} total forecast rows`);
    res.json({ success: true, deleted: result.rowCount, message: 'All forecasts deleted' });
  } catch (error: any) {
    console.error('Clean all error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin endpoint to manually trigger forecast sync
app.post('/api/admin/sync-forecasts', async (req, res) => {
  try {
    console.log('Manual sync triggered...');
    const { forecastService } = await import('./services/forecast-service');
    console.log('Forecast service imported, starting sync...');
    await forecastService.processAllResorts();
    console.log('Sync completed successfully');
    res.json({ success: true, message: 'Forecast sync completed' });
  } catch (error: any) {
    console.error('Manual sync error:', error);
    res.status(500).json({ 
      error: error.message || String(error),
      stack: error.stack 
    });
  }
});

// Debug endpoint to check forecast data
app.get('/api/admin/debug-forecasts', async (req, res) => {
  try {
    const pool = (await import('./config/database')).default;
    const result = await pool.query(`
      SELECT resort_id, elevation_band, COUNT(*) as count,
             MIN(valid_time) as first_time, MAX(valid_time) as last_time
      FROM elevation_forecasts 
      GROUP BY resort_id, elevation_band
      ORDER BY resort_id, elevation_band
    `);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint with exact Supabase query
app.get('/api/admin/test-daily/:resortId', async (req, res) => {
  try {
    const pool = (await import('./config/database')).default;
    const { resortId } = req.params;
    const { elevation = 'mid' } = req.query;
    
    const result = await pool.query(`
      SELECT 
        valid_time::date as date,
        MAX(temperature_c) as max_temp,
        MIN(temperature_c) as min_temp,
        SUM(snowfall_cm_corrected) as total_snowfall,
        SUM(precipitation_mm) as total_precipitation,
        AVG(powder_score) as avg_powder_score,
        MAX(wind_speed_kmh) as max_wind_speed,
        AVG(cloud_cover) as avg_cloud_cover
      FROM elevation_forecasts
      WHERE resort_id = $1::uuid
      AND elevation_band = $2
      GROUP BY valid_time::date
      ORDER BY date
      LIMIT 3
    `, [resortId, elevation]);
    
    res.json({ 
      params: { resortId, elevation },
      rowCount: result.rows.length,
      data: result.rows 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Test endpoint to check what resort query returns
app.get('/api/admin/test-resort/:id', async (req, res) => {
  try {
    const pool = (await import('./config/database')).default;
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM resorts WHERE slug = $1 OR id::text = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }
    
    const resort = result.rows[0];
    res.json({
      resort_id: resort.id,
      resort_id_type: typeof resort.id,
      resort_name: resort.name,
      full_resort: resort
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Debug endpoint to test exact subquery
app.get('/api/admin/test-subquery/:slug', async (req, res) => {
  try {
    const pool = (await import('./config/database')).default;
    const { slug } = req.params;
    const { elevation = 'mid' } = req.query;
    
    // First, check if resort exists
    const resortCheck = await pool.query(
      'SELECT id, name FROM resorts WHERE slug = $1',
      [slug]
    );
    
    // Then try the subquery
    const result = await pool.query(
      `SELECT 
        valid_time::date as date,
        MAX(temperature_c) as max_temp,
        MIN(temperature_c) as min_temp,
        SUM(snowfall_cm_corrected) as total_snowfall
      FROM elevation_forecasts
      WHERE resort_id IN (SELECT id FROM resorts WHERE slug = $1)
      AND elevation_band = $2
      GROUP BY valid_time::date
      ORDER BY date
      LIMIT 3`,
      [slug, elevation]
    );
    
    res.json({
      resort_found: resortCheck.rows.length > 0,
      resort: resortCheck.rows[0] || null,
      forecast_count: result.rows.length,
      forecasts: result.rows
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Test hourly endpoint query
app.get('/api/admin/test-hourly/:slug', async (req, res) => {
  try {
    const pool = (await import('./config/database')).default;
    const { slug } = req.params;
    const { elevation = 'mid', hours = '24' } = req.query;
    
    const resortResult = await pool.query(
      'SELECT * FROM resorts WHERE slug = $1',
      [slug]
    );
    
    if (resortResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }
    
    const resort = resortResult.rows[0];
    const hoursLimit = parseInt(hours as string);
    
    const result = await pool.query(
      `SELECT 
        valid_time,
        temperature_c,
        snowfall_cm_corrected,
        wind_speed_kmh
      FROM elevation_forecasts
      WHERE resort_id = $1::uuid
      AND elevation_band = $2
      ORDER BY valid_time
      LIMIT $3`,
      [resort.id, elevation, hoursLimit]
    );
    
    res.json({
      resort: { id: resort.id, name: resort.name },
      hourly_count: result.rows.length,
      sample: result.rows.slice(0, 3)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.listen(PORT, () => {
  console.log(`🏔️  Andes Powder API running on port ${PORT}`);
  
  // Start weather sync scheduler
  const scheduler = getWeatherSyncScheduler();
  scheduler.start();
  
  // Start forecast cron service (runs every hour at :05)
  forecastCronService.start();
  
  // Start snapshot cron service (runs daily at 6:00 AM)
  startSnapshotCron();
  console.log('📸 Snapshot system initialized - Daily snapshots at 6:00 AM');
  
  // Initialize SMN alerts (fetch immediately)
  smnAlertsService.refreshAlerts();
  console.log('🚨 SMN Alerts system initialized');
});

export default app;
