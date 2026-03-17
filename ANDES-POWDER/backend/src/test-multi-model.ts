/**
 * Test Script for Multi-Model Architecture
 * Tests the new SnowEngine with OpenMeteo provider
 */

import { forecastService } from './services/forecast-service';
import pool from './config/database';

async function testMultiModelArchitecture() {
  console.log('='.repeat(60));
  console.log('Testing Multi-Model Architecture');
  console.log('='.repeat(60));
  
  try {
    // Get one resort for testing
    const result = await pool.query(
      "SELECT * FROM resorts WHERE slug = 'cerro-catedral' LIMIT 1"
    );
    
    if (result.rows.length === 0) {
      console.error('No resort found for testing');
      process.exit(1);
    }
    
    const resortRow = result.rows[0];
    const resort = {
      id: resortRow.id,
      slug: resortRow.slug,
      name: resortRow.name,
      country: resortRow.country,
      region: resortRow.region,
      town: resortRow.town || resortRow.region,
      baseElevation: resortRow.base_elevation,
      midElevation: resortRow.mid_elevation,
      summitElevation: resortRow.summit_elevation,
      latitude: parseFloat(resortRow.latitude),
      longitude: parseFloat(resortRow.longitude),
      timezone: resortRow.timezone || 'America/Argentina/Buenos_Aires',
      active: resortRow.active,
      createdAt: resortRow.created_at,
      updatedAt: resortRow.updated_at
    };
    
    console.log(`\nTesting with: ${resort.name}`);
    console.log(`Location: ${resort.latitude}, ${resort.longitude}`);
    console.log(`Elevations: ${resort.baseElevation}m - ${resort.summitElevation}m`);
    
    // Test forecast processing
    console.log('\n' + '-'.repeat(60));
    console.log('Processing forecast with new architecture...');
    console.log('-'.repeat(60));
    
    await forecastService.processResortForecast(resort);
    
    console.log('\n' + '='.repeat(60));
    console.log('✓ Test completed successfully!');
    console.log('='.repeat(60));
    
    // Check what was stored
    const runCount = await pool.query(
      'SELECT COUNT(*) FROM forecast_runs WHERE resort_id = $1',
      [resort.id]
    );
    console.log(`\nForecast runs in database: ${runCount.rows[0].count}`);
    
    const forecastCount = await pool.query(
      'SELECT COUNT(*) FROM elevation_forecasts WHERE resort_id = $1',
      [resort.id]
    );
    console.log(`Elevation forecasts in database: ${forecastCount.rows[0].count}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run test
testMultiModelArchitecture();
