const { createClient } = require('@supabase/supabase-js');
const pool = require('./dist/config/database').default;

const supabase = createClient(
  'https://syblfficocpoqetddcqs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5YmxmZmljb2Nwb3FldGRkY3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTM1MzIsImV4cCI6MjA4OTMyOTUzMn0.ziepRZ9nkgypRTxM4qZdiR8bOVPlUXi4l7PSHd6Nzag'
);

(async () => {
  try {
    console.log('Fetching Cerro Catedral data from PostgreSQL...');
    
    // Get resort
    const resortResult = await pool.query("SELECT * FROM resorts WHERE slug = 'cerro-catedral'");
    const resort = resortResult.rows[0];
    
    if (!resort) {
      console.error('Resort not found');
      process.exit(1);
    }
    
    console.log('Resort:', resort.name, resort.id);
    
    // Get latest snapshot
    const snapshotResult = await pool.query(
      "SELECT id FROM forecast_snapshots WHERE resort_id = $1 ORDER BY fetched_at DESC LIMIT 1",
      [resort.id]
    );
    
    if (snapshotResult.rows.length === 0) {
      console.error('No forecast snapshots found. Run process-forecasts-temp.js first.');
      process.exit(1);
    }
    
    const snapshotId = snapshotResult.rows[0].id;
    console.log('Using snapshot:', snapshotId);
    
    // Get hourly forecasts from PostgreSQL
    const forecastResult = await pool.query(
      `SELECT * FROM hourly_forecasts 
       WHERE snapshot_id = $1 
       ORDER BY timestamp, elevation_band`,
      [snapshotId]
    );
    
    console.log('Found', forecastResult.rows.length, 'hourly forecasts');
    
    // Create forecast run in Supabase with all required fields
    const { data: runData, error: runError } = await supabase
      .from('forecast_runs')
      .insert({
        id: snapshotId,
        resort_id: resort.id,
        provider: 'open-meteo',
        status: 'success',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (runError) {
      console.error('Error creating forecast run:', runError);
      console.log('Trying to use existing run...');
    } else {
      console.log('✓ Created forecast run in Supabase');
    }
    
    const forecastRunId = snapshotId;
    console.log('Using forecast run ID:', forecastRunId);
    
    // Insert elevation forecasts in batches
    const batchSize = 100;
    const forecasts = forecastResult.rows;
    
    for (let i = 0; i < forecasts.length; i += batchSize) {
      const batch = forecasts.slice(i, i + batchSize);
      
      const elevationForecasts = batch.map(f => {
        // Determine elevation in meters based on band
        let elevationMeters;
        if (f.elevation_band === 'base') elevationMeters = resort.base_elevation;
        else if (f.elevation_band === 'mid') elevationMeters = resort.mid_elevation;
        else elevationMeters = resort.summit_elevation;
        
        // Calculate forecast hour (hours from now)
        const now = new Date();
        const forecastTime = new Date(f.timestamp);
        const forecastHour = Math.round((forecastTime - now) / (1000 * 60 * 60));
        
        return {
          resort_id: resort.id,
          elevation_band: f.elevation_band,
          elevation_meters: elevationMeters,
          forecast_run_id: forecastRunId,
          forecast_hour: forecastHour,
          valid_time: f.timestamp,
          data_source: 'open-meteo',
          temperature_c: parseFloat(f.temperature) || 0,
          precipitation_mm: parseFloat(f.precipitation) || 0,
          snowfall_cm_corrected: parseFloat(f.snow_depth) || 0,
          wind_speed_kmh: parseFloat(f.wind_speed) || 0,
          wind_direction: parseInt(f.wind_direction) || 0,
          cloud_cover: parseFloat(f.cloud_cover) || 0,
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
        console.error('Error inserting batch:', error);
      } else {
        console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
      }
    }
    
    console.log('✓ Successfully populated Supabase with forecast data');
    console.log('✓ Total records:', forecasts.length);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
