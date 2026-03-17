import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import resortsRouter from './routes/resorts';
import observationsRouter from './routes/observations';
import { getWeatherSyncScheduler } from './services/weather-sync-scheduler';
import authRouter from './routes/auth';
import favoritesRouter from './routes/favorites';
import { forecastCronService } from './services/forecast-cron';
import { initializeFirebase } from './config/firebase';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

try {
  initializeFirebase();
} catch (error) {
  console.warn('Firebase not initialized. Authentication features will be disabled.');
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/resorts', resortsRouter);
app.use('/api/observations', observationsRouter);
app.use('/api/auth', authRouter);
app.use('/api/favorites', favoritesRouter);

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

app.listen(PORT, () => {
  console.log(`🏔️  Andes Powder API running on port ${PORT}`);
  
  // Start weather sync scheduler
  const scheduler = getWeatherSyncScheduler();
  scheduler.start();
  
  // Start forecast cron service (runs every hour at :05)
  forecastCronService.start();
});

export default app;
