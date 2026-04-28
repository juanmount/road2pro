import cron from 'node-cron';
import { smartNotificationService } from '../services/smart-notification-service';

/**
 * Notification Scanner Cron Job
 * Runs daily at 8:00 AM and 6:00 PM to scan forecasts and send smart notifications
 */
export function startNotificationScanner() {
  // Run at 8:00 AM every day
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running morning notification scan at 8:00 AM');
    try {
      await smartNotificationService.scanAndNotify();
    } catch (error) {
      console.error('[CRON] Error in morning notification scan:', error);
    }
  });

  // Run at 6:00 PM every day
  cron.schedule('0 18 * * *', async () => {
    console.log('[CRON] Running evening notification scan at 6:00 PM');
    try {
      await smartNotificationService.scanAndNotify();
    } catch (error) {
      console.error('[CRON] Error in evening notification scan:', error);
    }
  });

  console.log('[CRON] Notification scanner scheduled: 8:00 AM and 6:00 PM daily');
}

/**
 * Manual trigger for testing
 */
export async function triggerNotificationScan() {
  console.log('[MANUAL] Triggering notification scan...');
  try {
    await smartNotificationService.scanAndNotify();
    console.log('[MANUAL] Notification scan completed successfully');
  } catch (error) {
    console.error('[MANUAL] Error in notification scan:', error);
    throw error;
  }
}
