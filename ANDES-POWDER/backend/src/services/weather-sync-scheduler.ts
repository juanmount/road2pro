/**
 * Weather Sync Scheduler
 * Automatically syncs real weather data from external sources
 */

import * as schedule from 'node-schedule';
import { SMNWeatherService } from './smn-weather-service';
import { CatedralSyncService } from './catedral-sync';
import { resortStatusService } from './resort-status-service';

export class WeatherSyncScheduler {
  private smnService: SMNWeatherService;
  private catedralService: CatedralSyncService;
  private jobs: schedule.Job[] = [];
  
  constructor() {
    this.smnService = new SMNWeatherService();
    this.catedralService = new CatedralSyncService();
  }

  
  /**
   * Start all scheduled sync jobs
   */
  start(): void {
    console.log('Starting weather sync scheduler...');
    
    // Sync SMN data every hour at :02 (e.g., 10:02, 11:02, etc.)
    const smnJob = schedule.scheduleJob('2 * * * *', async () => {
      console.log('\n=== SMN Weather Sync ===');
      console.log(`Time: ${new Date().toISOString()}`);
      
      try {
        await this.smnService.syncToObservations('cerro-catedral');
        console.log('✓ SMN sync completed successfully\n');
      } catch (error) {
        console.error('✗ SMN sync failed:', error);
      }
    });
    
    this.jobs.push(smnJob);
    
    // TODO: Catedral website sync disabled - their API doesn't exist and data loads via JavaScript
    // Need to find alternative data source or implement headless browser scraping
    
    // Sync resort operational status (lifts/slopes) every 2h at :30
    const statusJob = schedule.scheduleJob('30 */2 * * *', async () => {
      console.log('\n=== Resort Operational Status Sync ===');
      try {
        await resortStatusService.syncAll();
      } catch (err) {
        console.error('✗ Resort status sync failed:', err);
      }
    });
    this.jobs.push(statusJob);

    console.log('✓ Weather sync scheduler started');
    console.log('  → SMN sync: Every hour at :02');
    console.log('  → Resort status: Every 2h at :30');
    console.log('  → Catedral sync: Disabled (no accessible data source)');

    // Run initial sync immediately
    this.runInitialSync();
  }
  
  /**
   * Run initial sync on startup
   */
  private async runInitialSync(): Promise<void> {
    console.log('\n=== Initial Weather Sync ===');
    
    try {
      await this.smnService.syncToObservations('cerro-catedral');
      await resortStatusService.syncAll();
      console.log('✓ Initial sync completed\n');
    } catch (error) {
      console.error('✗ Initial sync failed:', error);
    }
  }
  
  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    console.log('Stopping weather sync scheduler...');
    
    for (const job of this.jobs) {
      job.cancel();
    }
    
    this.jobs = [];
    console.log('✓ Weather sync scheduler stopped');
  }
  
  /**
   * Get status of scheduled jobs
   */
  getStatus(): { active: boolean; jobCount: number; nextRun: Date | null } {
    const nextRun = this.jobs.length > 0 ? this.jobs[0].nextInvocation() : null;
    
    return {
      active: this.jobs.length > 0,
      jobCount: this.jobs.length,
      nextRun
    };
  }
}

// Singleton instance
let schedulerInstance: WeatherSyncScheduler | null = null;

export function getWeatherSyncScheduler(): WeatherSyncScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new WeatherSyncScheduler();
  }
  return schedulerInstance;
}
