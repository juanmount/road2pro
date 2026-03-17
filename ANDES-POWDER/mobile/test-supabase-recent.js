const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://syblfficocpoqetddcqs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5YmxmZmljb2Nwb3FldGRkY3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTM1MzIsImV4cCI6MjA4OTMyOTUzMn0.ziepRZ9nkgypRTxM4qZdiR8bOVPlUXi4l7PSHd6Nzag';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRecentData() {
  console.log('Testing most recent Supabase data...\n');
  
  const resortId = 'cbe22ddb-639c-4f1a-a216-f70a5434e465';
  
  // Get most recent records by created_at
  const { data, error } = await supabase
    .from('elevation_forecasts')
    .select('*')
    .eq('resort_id', resortId)
    .eq('elevation_band', 'mid')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('ERROR:', error);
    return;
  }
  
  console.log(`Most recent 5 rows (by created_at):\n`);
  
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    console.log(`Row ${i + 1}:`);
    console.log(`  Created: ${row.created_at}`);
    console.log(`  Valid Time: ${row.valid_time}`);
    console.log(`  Temperature: ${row.temperature_c}°C`);
    console.log(`  Precipitation: ${row.precipitation_mm} mm`);
    console.log(`  Snowfall Raw: ${row.snowfall_cm_raw} cm`);
    console.log(`  Snowfall Corrected: ${row.snowfall_cm_corrected} cm`);
    console.log(`  Wind Speed: ${row.wind_speed_kmh} km/h`);
    console.log(`  Humidity: ${row.humidity}%`);
    console.log(`  Freezing Level: ${row.freezing_level_m} m`);
    console.log('');
  }
}

testRecentData().catch(console.error);
