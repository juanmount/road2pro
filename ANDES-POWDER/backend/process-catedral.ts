import pool from './src/config/database';
import { forecastProcessor } from './src/services/forecast-processor';

(async () => {
  try {
    const result = await pool.query("SELECT * FROM resorts WHERE slug = 'cerro-catedral'");
    const resort = result.rows[0];
    
    if (resort) {
      // Map database column names to expected property names
      resort.baseElevation = resort.base_elevation;
      resort.midElevation = resort.mid_elevation;
      resort.summitElevation = resort.summit_elevation;
      
      console.log('Processing forecast for', resort.name);
      await forecastProcessor.processResortForecast(resort);
      console.log('✓ Done!');
    } else {
      console.log('Resort not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
