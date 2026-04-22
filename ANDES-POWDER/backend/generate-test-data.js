const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://syblfficocpoqetddcqs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5YmxmZmljb2Nwb3FldGRkY3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTM1MzIsImV4cCI6MjA4OTMyOTUzMn0.ziepRZ9nkgypRTxM4qZdiR8bOVPlUXi4l7PSHd6Nzag'
);

const RESORT_ID = '9d5906f9-245c-43b5-802d-b3707bf21841'; // Cerro Catedral
const PLACEHOLDER_RUN_ID = '00000000-0000-0000-0000-000000000000'; // Placeholder UUID

(async () => {
  try {
    console.log('Generating test forecast data for Cerro Catedral...');
    
    // Delete old data
    console.log('Cleaning old data...');
    await supabase
      .from('elevation_forecasts')
      .delete()
      .eq('resort_id', RESORT_ID);
    
    // Generate 168 hours of forecast data (7 days)
    const now = new Date();
    const forecasts = [];
    
    const elevations = [
      { band: 'base', meters: 1030 },
      { band: 'mid', meters: 1600 },
      { band: 'summit', meters: 2100 }
    ];
    
    for (let hour = 0; hour < 168; hour++) {
      const forecastTime = new Date(now.getTime() + hour * 60 * 60 * 1000);
      
      for (const elev of elevations) {
        // Generate realistic weather data
        const temp = 5 + Math.sin(hour / 24 * Math.PI * 2) * 8 - (elev.meters - 1000) / 200;
        const wind = 5 + Math.random() * 15;
        const cloudCover = 30 + Math.random() * 50;
        const precipitation = Math.random() < 0.2 ? Math.random() * 2 : 0;
        const snowfall = temp < 2 && precipitation > 0 ? precipitation * 0.8 : 0;
        const freezingLevel = 1500 + Math.random() * 1500;
        
        forecasts.push({
          resort_id: RESORT_ID,
          elevation_band: elev.band,
          elevation_meters: elev.meters,
          forecast_run_id: PLACEHOLDER_RUN_ID,
          forecast_hour: hour,
          valid_time: forecastTime.toISOString(),
          data_source: 'test-data',
          temperature_c: parseFloat(temp.toFixed(1)),
          precipitation_mm: parseFloat(precipitation.toFixed(2)),
          snowfall_cm_corrected: parseFloat(snowfall.toFixed(2)),
          wind_speed_kmh: parseFloat(wind.toFixed(1)),
          wind_direction: Math.floor(Math.random() * 360),
          cloud_cover: Math.floor(cloudCover),
          humidity: 70,
          powder_score: parseFloat((snowfall > 0.5 ? 5 + Math.random() * 5 : 0).toFixed(1)),
          freezing_level_m: Math.floor(freezingLevel),
          created_at: new Date().toISOString()
        });
      }
    }
    
    console.log(`Generated ${forecasts.length} forecast records`);
    
    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < forecasts.length; i += batchSize) {
      const batch = forecasts.slice(i, i + batchSize);
      const { error } = await supabase
        .from('elevation_forecasts')
        .insert(batch);
      
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      } else {
        console.log(`✓ Inserted batch ${i / batchSize + 1}/${Math.ceil(forecasts.length / batchSize)}`);
      }
    }
    
    console.log('✓ Successfully generated test forecast data!');
    console.log('✓ Data covers next 7 days (168 hours)');
    console.log('✓ All elevations: base, mid, summit');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
