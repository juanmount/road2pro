import cron from 'node-cron';
import { forecastTrendingService } from '../services/forecast-trending-service';

/**
 * Daily cron job to save forecast snapshots
 * Runs every day at 6 AM (after forecast sync)
 */
export function startForecastSnapshotCron() {
  // Run at 6:00 AM every day (1 hour after forecast sync at 5 AM)
  cron.schedule('0 6 * * *', async () => {
    try {
      console.log('[CRON] Starting daily forecast snapshot...');
      await forecastTrendingService.saveAllResortsSnapshots();
      console.log('[CRON] ✓ Daily forecast snapshot completed');
    } catch (error) {
      console.error('[CRON] Error in forecast snapshot:', error);
    }
  });

  console.log('✓ Forecast snapshot cron job scheduled (daily at 6:00 AM)');
}
