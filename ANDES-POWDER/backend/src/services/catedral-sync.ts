import pool from '../config/database';
import { CatedralWeatherFetcher } from '../providers/catedral-weather';

export class CatedralSyncService {
  private fetcher: CatedralWeatherFetcher;
  
  constructor() {
    this.fetcher = new CatedralWeatherFetcher();
  }
  
  /**
   * Sync Catedral weather data to observations table
   */
  async syncWeatherData(): Promise<void> {
    try {
      console.log('=== Catedral Weather Sync ===');
      
      // Get Cerro Catedral resort ID
      const resortResult = await pool.query(
        "SELECT id FROM resorts WHERE slug = 'cerro-catedral' LIMIT 1"
      );
      
      if (resortResult.rows.length === 0) {
        console.log('⚠️  Cerro Catedral resort not found in database');
        return;
      }
      
      const resortId = resortResult.rows[0].id;
      
      // Try scraping first (API doesn't actually exist, just redirects)
      let weatherData = await this.fetcher.fetchWeatherData();
      
      if (!weatherData) {
        weatherData = await this.fetcher.fetchWeatherDataAPI();
      }
      
      if (!weatherData) {
        console.log('⚠️  No weather data available from Catedral');
        return;
      }
      
      // Record temperature observations
      const observedAt = weatherData.lastUpdate || new Date();
      
      for (const [elevation, temp] of Object.entries(weatherData.temperature)) {
        if (temp !== undefined && temp !== null) {
          await this.recordObservation(
            resortId,
            observedAt,
            'temperature',
            temp,
            '°C',
            elevation as 'base' | 'mid' | 'summit',
            'catedral_website'
          );
          console.log(`  → Recorded ${elevation}: ${temp}°C from Catedral website`);
        }
      }
      
      // Record snow depth observations
      for (const [elevation, depth] of Object.entries(weatherData.snowDepth)) {
        if (depth !== undefined && depth !== null) {
          await this.recordObservation(
            resortId,
            observedAt,
            'snow_depth',
            depth,
            'cm',
            elevation as 'base' | 'mid' | 'summit',
            'catedral_website'
          );
          console.log(`  → Recorded ${elevation}: ${depth}cm snow depth from Catedral`);
        }
      }
      
      console.log('✓ Catedral weather data synced to observations');
      
    } catch (error) {
      console.error('Error syncing Catedral weather data:', error);
    }
  }
  
  private async recordObservation(
    resortId: string,
    observedAt: Date,
    type: string,
    value: number,
    unit: string,
    elevation: 'base' | 'mid' | 'summit',
    source: string
  ): Promise<void> {
    await pool.query(
      `INSERT INTO observations (
        resort_id, observed_at, observation_type, source,
        value_numeric, unit, elevation_band, reliability, verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [resortId, observedAt, type, source, value, unit, elevation, 'high', true]
    );
  }
}
