/**
 * Debug script to verify Open-Meteo data parsing
 */

import { OpenMeteoProvider } from './providers/open-meteo/adapter';

async function debugForecastData() {
  const provider = new OpenMeteoProvider();
  
  const resort = {
    id: '9d5906f9-245c-43b5-802d-b3707bf21841',
    name: 'Cerro Catedral',
    slug: 'cerro-catedral',
    latitude: -41.15,
    longitude: -71.4,
    baseElevation: 1030,
    midElevation: 1600,
    summitElevation: 2100
  };
  
  console.log('Fetching ECMWF data...');
  const forecast = await provider.fetch(resort, { model: 'ecmwf-ifs' });
  
  console.log('\n=== March 11 Data ===\n');
  
  // Find March 11 data
  const march11Data = forecast.mid.filter(point => {
    const date = new Date(point.time);
    return date.getDate() === 11 && date.getMonth() === 2; // March is month 2 (0-indexed)
  });
  
  console.log(`Found ${march11Data.length} data points for March 11`);
  
  // Show key hours
  const keyHours = [0, 6, 12, 18, 20, 23];
  
  for (const hour of keyHours) {
    const point = march11Data.find(p => new Date(p.time).getHours() === hour);
    if (point) {
      console.log(`\n${hour}:00 -`);
      console.log(`  Temperature: ${point.temperature.toFixed(1)}°C`);
      console.log(`  Precipitation: ${point.precipitation.toFixed(2)}mm`);
      console.log(`  Freezing level: ${point.freezingLevel || 'null'}m`);
      console.log(`  Wind: ${point.windSpeed.toFixed(1)} km/h`);
    }
  }
  
  // Check if all temperatures are the same
  const temps = march11Data.map(p => p.temperature);
  const uniqueTemps = [...new Set(temps)];
  
  console.log(`\n=== Temperature Analysis ===`);
  console.log(`Total data points: ${temps.length}`);
  console.log(`Unique temperatures: ${uniqueTemps.length}`);
  console.log(`Min temp: ${Math.min(...temps).toFixed(1)}°C`);
  console.log(`Max temp: ${Math.max(...temps).toFixed(1)}°C`);
  
  if (uniqueTemps.length === 1) {
    console.log('\n⚠️  WARNING: All temperatures are the same! Data is static.');
  } else {
    console.log('\n✓ Temperatures vary correctly');
  }
  
  // Check base elevation data
  console.log(`\n=== Base Elevation Data ===`);
  const baseMarch11 = forecast.base.filter(point => {
    const date = new Date(point.time);
    return date.getDate() === 11 && date.getMonth() === 2;
  });
  
  const baseTemps = baseMarch11.map(p => p.temperature);
  console.log(`Base unique temps: ${[...new Set(baseTemps)].length}`);
  console.log(`Base min: ${Math.min(...baseTemps).toFixed(1)}°C`);
  console.log(`Base max: ${Math.max(...baseTemps).toFixed(1)}°C`);
  
  // Show first 3 base points
  console.log('\nFirst 3 base points:');
  baseMarch11.slice(0, 3).forEach((p, i) => {
    console.log(`  ${i}: ${new Date(p.time).toISOString()} - ${p.temperature.toFixed(1)}°C`);
  });
}

debugForecastData().catch(console.error);
