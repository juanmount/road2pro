/**
 * Test SMN Integration
 * Tests the SMN weather service and observation sync
 */

import { SMNWeatherService } from '../services/smn-weather-service';

async function testSMNIntegration() {
  console.log('='.repeat(60));
  console.log('Testing SMN Argentina Weather Integration');
  console.log('='.repeat(60));
  console.log();
  
  const smnService = new SMNWeatherService();
  
  // Test 1: Fetch station data
  console.log('Test 1: Fetching Bariloche station data...');
  const data = await smnService.fetchStationData();
  
  if (data) {
    console.log('✓ Successfully fetched data:');
    console.log(`  Station: ${data.stationName}`);
    console.log(`  Temperature: ${data.temperature}°C`);
    console.log(`  Humidity: ${data.humidity}%`);
    console.log(`  Wind: ${data.windSpeed} km/h ${data.windDirection}`);
    console.log(`  Pressure: ${data.pressure} hPa`);
    console.log(`  Timestamp: ${data.timestamp.toISOString()}`);
  } else {
    console.log('✗ Failed to fetch data');
    return;
  }
  
  console.log();
  
  // Test 2: Find nearest station
  console.log('Test 2: Finding nearest station to Cerro Catedral...');
  const nearest = await smnService.findNearestStation(-41.15, -71.4);
  
  if (nearest) {
    console.log('✓ Found nearest station:');
    console.log(`  Name: ${nearest.station_name}`);
    console.log(`  Province: ${nearest.province}`);
    console.log(`  Coordinates: ${nearest.lat}, ${nearest.lon}`);
  }
  
  console.log();
  
  // Test 3: Sync to observations
  console.log('Test 3: Syncing data to observation system...');
  try {
    await smnService.syncToObservations('cerro-catedral');
    console.log('✓ Successfully synced to observations');
  } catch (error) {
    console.log('✗ Failed to sync:', error);
  }
  
  console.log();
  console.log('='.repeat(60));
  console.log('✓ SMN Integration Test Complete');
  console.log('='.repeat(60));
}

// Run test
testSMNIntegration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
