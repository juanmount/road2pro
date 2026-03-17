const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://syblfficocpoqetddcqs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5YmxmZmljb2Nwb3FldGRkY3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTM1MzIsImV4cCI6MjA4OTMyOTUzMn0.ziepRZ9nkgypRTxM4qZdiR8bOVPlUXi4l7PSHd6Nzag';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTimes() {
  console.log('Checking available forecast times...\n');
  
  const resortId = 'cbe22ddb-639c-4f1a-a216-f70a5434e465';
  const now = new Date();
  
  console.log('Current time:', now.toISOString());
  console.log('');
  
  // Get most recent forecast run
  const { data, error } = await supabase
    .from('elevation_forecasts')
    .select('valid_time, temperature_c, snowfall_cm_corrected, wind_speed_kmh')
    .eq('resort_id', resortId)
    .eq('elevation_band', 'mid')
    .order('created_at', { ascending: false })
    .order('valid_time', { ascending: true })
    .limit(20);
  
  if (error) {
    console.error('ERROR:', error);
    return;
  }
  
  console.log('First 20 forecast times from most recent run:\n');
  
  data.forEach((row, i) => {
    const validTime = new Date(row.valid_time);
    const isFuture = validTime > now;
    console.log(`${i + 1}. ${row.valid_time} ${isFuture ? '(FUTURE)' : '(PAST)'} - Temp: ${row.temperature_c}°C, Snow: ${row.snowfall_cm_corrected}cm, Wind: ${row.wind_speed_kmh} km/h`);
  });
}

testTimes().catch(console.error);
