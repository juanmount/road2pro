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

app.listen(PORT, () => {
  console.log(`🏔️  Andes Powder API running on port ${PORT}`);
  
  // Start weather sync scheduler
  const scheduler = getWeatherSyncScheduler();
  scheduler.start();
  
  // Start forecast cron service (runs every hour at :05)
  forecastCronService.start();
});

export default app;
