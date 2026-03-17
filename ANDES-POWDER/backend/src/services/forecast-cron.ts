import cron from 'node-cron';
import { forecastService } from './forecast-service';
import dotenv from 'dotenv';

dotenv.config();

export class ForecastCronService {
  private cronSchedule: string;

  constructor() {
    // Run every hour at :05 minutes to get fresh data
    this.cronSchedule = process.env.FORECAST_CRON_SCHEDULE || '5 * * * *';
  }

  start(): void {
    console.log(`Starting forecast cron service with schedule: ${this.cronSchedule}`);
    
    cron.schedule(this.cronSchedule, async () => {
      console.log('Running scheduled forecast update...');
      await this.updateAllResorts();
    });

    console.log('Forecast cron service started');
    
    // Run initial update on startup
    console.log('Running initial forecast update...');
    this.updateAllResorts().catch(err => {
      console.error('Initial forecast update failed:', err);
    });
  }

  async updateAllResorts(): Promise<void> {
    try {
      console.log('Updating forecasts for all resorts...');
      await forecastService.processAllResorts();
      console.log('All resort forecasts updated successfully');
    } catch (error) {
      console.error('Error updating resort forecasts:', error);
    }
  }
}

if (require.main === module) {
  const cronService = new ForecastCronService();
  cronService.updateAllResorts().then(() => {
    console.log('Manual forecast update completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Manual forecast update failed:', error);
    process.exit(1);
  });
}

export const forecastCronService = new ForecastCronService();
