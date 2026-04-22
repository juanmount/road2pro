const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://syblfficocpoqetddcqs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5YmxmZmljb2Nwb3FldGRkY3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTM1MzIsImV4cCI6MjA4OTMyOTUzMn0.ziepRZ9nkgypRTxM4qZdiR8bOVPlUXi4l7PSHd6Nzag'
);

const RESORT_ID = '9d5906f9-245c-43b5-802d-b3707bf21841';

(async () => {
  try {
    console.log('Deleting old data...');
    await supabase
      .from('elevation_forecasts')
      .delete()
      .eq('resort_id', RESORT_ID);
    
    console.log('Generating 504 forecast records (168 hours x 3 elevations)...');
    
    const now = new Date();
    const allForecasts = [];
    
    const elevations = [
      { band: 'base', meters: 1030 },
      { band: 'mid', meters: 1600 },
      { band: 'summit', meters: 2100 }
    ];
    
    for (let hour = 0; hour < 168; hour++) {
      for (const elev of elevations) {
        const forecastTime = new Date(now.getTime() + hour * 60 * 60 * 1000);
        const temp = 5 + Math.sin(hour / 24 * Math.PI * 2) * 8 - (elev.meters - 1000) / 200;
        const wind = 5 + Math.random() * 15;
        const precipitation = Math.random() < 0.2 ? Math.random() * 2 : 0;
        const snowfall = temp < 2 && precipitation > 0 ? precipitation * 0.8 : 0;
        const freezingLevel = 1500 + Math.floor(Math.random() * 1500);
        
        allForecasts.push({
          resort_id: RESORT_ID,
          elevation_band: elev.band,
          elevation_meters: elev.meters,
          forecast_hour: hour,
          valid_time: forecastTime.toISOString(),
          data_source: 'test-data',
          temperature_c: parseFloat(temp.toFixed(1)),
          precipitation_mm: parseFloat(precipitation.toFixed(2)),
          snowfall_cm_corrected: parseFloat(snowfall.toFixed(2)),
          wind_speed_kmh: parseFloat(wind.toFixed(1)),
          wind_direction: Math.floor(Math.random() * 360),
          cloud_cover: Math.floor(30 + Math.random() * 50),
          humidity: 70,
          powder_score: parseFloat((snowfall > 0.5 ? 5 + Math.random() * 5 : 0).toFixed(1)),
          freezing_level_m: freezingLevel,
          created_at: new Date().toISOString()
        });
      }
    }
    
    console.log('Inserting in batches of 50...');
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < allForecasts.length; i += 50) {
      const batch = allForecasts.slice(i, i + 50);
      
      // Try to insert without forecast_run_id first
      const batchWithoutRunId = batch.map(f => {
        const { ...rest } = f;
        return rest;
      });
      
      const { error } = await supabase
        .from('elevation_forecasts')
        .insert(batchWithoutRunId);
      
      if (error) {
        errorCount += batch.length;
        if (i === 0) {
          console.error('First batch error:', error.message);
        }
      } else {
        successCount += batch.length;
        if ((i / 50 + 1) % 2 === 0) {
          console.log(`  Inserted ${successCount} records...`);
        }
      }
    }
    
    console.log(`\n✓ Completed: ${successCount} successful, ${errorCount} failed`);
    
    // Verify
    const { data: verifyData } = await supabase
      .from('elevation_forecasts')
      .select('elevation_band, valid_time')
      .eq('resort_id', RESORT_ID)
      .limit(5);
    
    if (verifyData && verifyData.length > 0) {
      console.log('\n✓ Verification - Sample data:');
      verifyData.forEach(d => console.log(`  ${d.elevation_band}: ${d.valid_time}`));
    }
    
    process.exit(successCount > 0 ? 0 : 1);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
