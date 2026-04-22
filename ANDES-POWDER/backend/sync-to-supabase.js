const { createClient } = require('@supabase/supabase-js');
const pool = require('./dist/config/database').default;

const supabase = createClient(
  'https://syblfficocpoqetddcqs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5YmxmZmljb2Nwb3FldGRkY3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTM1MzIsImV4cCI6MjA4OTMyOTUzMn0.ziepRZ9nkgypRTxM4qZdiR8bOVPlUXi4l7PSHd6Nzag'
);

(async () => {
  try {
    console.log('Fetching Cerro Catedral from PostgreSQL...');
    const resortResult = await pool.query("SELECT * FROM resorts WHERE slug = 'cerro-catedral'");
    const resort = resortResult.rows[0];
    
    if (!resort) {
      console.error('Resort not found');
      process.exit(1);
    }
    
    console.log('Resort:', resort.name, resort.id);
    
    // Get latest snapshot
    const snapshotResult = await pool.query(
      `SELECT id FROM forecast_snapshots 
       WHERE resort_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [resort.id]
    );
    
    if (snapshotResult.rows.length === 0) {
      console.error('No snapshots found');
      process.exit(1);
    }
    
    const snapshotId = snapshotResult.rows[0].id;
    console.log('Using snapshot:', snapshotId);
    
    // Get hourly forecasts
    const forecastResult = await pool.query(
      `SELECT * FROM hourly_forecasts 
       WHERE snapshot_id = $1 
       ORDER BY timestamp, elevation_band`,
      [snapshotId]
    );
    
    console.log('Found', forecastResult.rows.length, 'hourly forecasts');
    
    // Delete old data from Supabase
    console.log('Cleaning old Supabase data...');
    await supabase
      .from('elevation_forecasts')
      .delete()
      .eq('resort_id', resort.id);
    
    // Map Supabase resort ID
    const supabaseResortId = '9d5906f9-245c-43b5-802d-b3707bf21841';
    
    // Insert in batches
    const batchSize = 50;
    const forecasts = forecastResult.rows;
    let successCount = 0;
    
    for (let i = 0; i < forecasts.length; i += batchSize) {
      const batch = forecasts.slice(i, i + batchSize);
      
      const elevationForecasts = batch.map(f => {
        let elevationMeters;
        if (f.elevation_band === 'base') elevationMeters = resort.base_elevation;
        else if (f.elevation_band === 'mid') elevationMeters = resort.mid_elevation;
        else elevationMeters = resort.summit_elevation;
        
        const forecastTime = new Date(f.timestamp);
        const now = new Date();
        const forecastHour = Math.round((forecastTime - now) / (1000 * 60 * 60));
        
        return {
          resort_id: supabaseResortId,
          elevation_band: f.elevation_band,
          elevation_meters: elevationMeters,
          forecast_hour: forecastHour,
          valid_time: f.timestamp,
          data_source: 'open-meteo',
          temperature_c: parseFloat(f.temperature) || 0,
          precipitation_mm: parseFloat(f.precipitation) || 0,
          snowfall_cm_corrected: parseFloat(f.snow_depth) || 0,
          wind_speed_kmh: parseFloat(f.wind_speed) || 0,
          wind_direction: parseInt(f.wind_direction) || 0,
          cloud_cover: parseInt(f.cloud_cover) || 0,
          humidity: 70,
          powder_score: parseFloat(f.powder_score) || 0,
          freezing_level_m: f.freezing_level ? parseInt(parseFloat(f.freezing_level)) : 2000,
          created_at: new Date().toISOString()
        };
      });
      
      const { error } = await supabase
        .from('elevation_forecasts')
        .insert(elevationForecasts);
      
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
      } else {
        successCount += batch.length;
        console.log(`✓ Inserted batch ${i / batchSize + 1} (${successCount} total)`);
      }
    }
    
    console.log(`\n✓ Sync complete: ${successCount}/${forecasts.length} records`);
    
    // Verify
    const { data: verifyData } = await supabase
      .from('elevation_forecasts')
      .select('elevation_band, temperature_c, freezing_level_m')
      .eq('resort_id', supabaseResortId)
      .limit(3);
    
    if (verifyData && verifyData.length > 0) {
      console.log('\n✓ Verification - Sample data:');
      verifyData.forEach(d => console.log(`  ${d.elevation_band}: ${d.temperature_c}°C, FRZ ${d.freezing_level_m}m`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
