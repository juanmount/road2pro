/**
 * Daily Snapshot Cron Job
 * Runs every day at 6:00 AM to create forecast snapshots
 */

import * as schedule from 'node-schedule';
import { snapshotService } from '../services/snapshot-service';
import pool from '../config/database';

export function startSnapshotCron() {
  // Run every day at 6:00 AM
  // Cron format: minute hour day month dayOfWeek
  const job = schedule.scheduleJob('0 6 * * *', async () => {
    console.log('[SNAPSHOT CRON] Starting daily snapshot creation...');
    
    try {
      const snapshots = await snapshotService.createDailySnapshots();
      console.log(`[SNAPSHOT CRON] Created ${snapshots.length} snapshots successfully`);
    } catch (error) {
      console.error('[SNAPSHOT CRON] Error creating snapshots:', error);
    }
  });
  
  console.log('[SNAPSHOT CRON] Scheduled to run daily at 6:00 AM');
  // Also schedule a daily cleanup at 04:30 AM to remove old forecast rows
  schedule.scheduleJob('30 4 * * *', async () => {
    console.log('[CLEANUP CRON] Starting daily cleanup for elevation_forecasts...');
    try {
      const result = await pool.query(`
        DELETE FROM elevation_forecasts 
        WHERE valid_time < NOW() - INTERVAL '7 days'
      `);
      console.log(`[CLEANUP CRON] Deleted ${result.rowCount} old rows`);
    } catch (error) {
      console.error('[CLEANUP CRON] Error cleaning old forecasts:', error);
    }
  });
  return job;
}

// Manual trigger for testing
export async function triggerSnapshotManually() {
  console.log('[SNAPSHOT] Manual trigger started...');
  
  try {
    const snapshots = await snapshotService.createDailySnapshots();
    console.log(`[SNAPSHOT] Created ${snapshots.length} snapshots successfully`);
    return snapshots;
  } catch (error) {
    console.error('[SNAPSHOT] Error:', error);
    throw error;
  }
}
