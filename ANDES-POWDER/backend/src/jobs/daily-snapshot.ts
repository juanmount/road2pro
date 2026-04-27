/**
 * Daily Snapshot Cron Job
 * Runs every day at 6:00 AM to create forecast snapshots
 */

import * as schedule from 'node-schedule';
import { snapshotService } from '../services/snapshot-service';

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
