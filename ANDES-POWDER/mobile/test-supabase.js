const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://syblfficocpoqetddcqs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5YmxmZmljb2Nwb3FldGRkY3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTM1MzIsImV4cCI6MjA4OTMyOTUzMn0.ziepRZ9nkgypRTxM4qZdiR8bOVPlUXi4l7PSHd6Nzag';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseData() {
  console.log('Testing Supabase connection...\n');
  
  // Get Cerro Catedral UUID
  const resortId = 'cbe22ddb-639c-4f1a-a216-f70a5434e465';
  
  // Query elevation_forecasts
  const { data, error, count } = await supabase
    .from('elevation_forecasts')
    .select('*', { count: 'exact' })
    .eq('resort_id', resortId)
    .eq('elevation_band', 'mid')
    .order('valid_time', { ascending: true })
    .limit(5);
  
  if (error) {
    console.error('ERROR:', error);
    return;
  }
  
  console.log(`Total rows for Cerro Catedral (mid): ${count}`);
  console.log('\nFirst 5 rows:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data && data.length > 0) {
    const firstRow = data[0];
    console.log('\nFirst row details:');
    console.log(`- Time: ${firstRow.valid_time}`);
    console.log(`- Temperature: ${firstRow.temperature_c}°C`);
    console.log(`- Snowfall: ${firstRow.snowfall_cm_corrected} cm`);
    console.log(`- Wind: ${firstRow.wind_speed_kmh} km/h`);
    console.log(`- Freezing Level: ${firstRow.freezing_level_m} m`);
  }
}

testSupabaseData().catch(console.error);
