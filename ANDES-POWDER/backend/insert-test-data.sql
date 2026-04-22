-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Delete old data
DELETE FROM elevation_forecasts WHERE resort_id = '9d5906f9-245c-43b5-802d-b3707bf21841';

-- Insert test data for next 168 hours (7 days) for all elevations
DO $$
DECLARE
  resort_uuid UUID := '9d5906f9-245c-43b5-802d-b3707bf21841';
  run_uuid UUID := '00000000-0000-0000-0000-000000000001';
  base_time TIMESTAMP := NOW();
  hour_offset INT;
  elev_band TEXT;
  elev_meters INT;
  temp FLOAT;
  wind FLOAT;
  frz INT;
BEGIN
  FOR hour_offset IN 0..167 LOOP
    FOR elev_band, elev_meters IN 
      SELECT * FROM (VALUES ('base', 1030), ('mid', 1600), ('summit', 2100)) AS t(band, meters)
    LOOP
      -- Generate realistic weather data
      temp := 5 + SIN(hour_offset::FLOAT / 24 * PI() * 2) * 8 - (elev_meters - 1000) / 200.0;
      wind := 5 + RANDOM() * 15;
      frz := 1500 + (RANDOM() * 1500)::INT;
      
      INSERT INTO elevation_forecasts (
        resort_id,
        elevation_band,
        elevation_meters,
        forecast_run_id,
        forecast_hour,
        valid_time,
        data_source,
        temperature_c,
        precipitation_mm,
        snowfall_cm_corrected,
        wind_speed_kmh,
        wind_direction,
        cloud_cover,
        humidity,
        powder_score,
        freezing_level_m,
        created_at
      ) VALUES (
        resort_uuid,
        elev_band,
        elev_meters,
        run_uuid,
        hour_offset,
        base_time + (hour_offset || ' hours')::INTERVAL,
        'test-data',
        temp,
        CASE WHEN RANDOM() < 0.2 THEN RANDOM() * 2 ELSE 0 END,
        CASE WHEN temp < 2 AND RANDOM() < 0.2 THEN RANDOM() * 1.5 ELSE 0 END,
        wind,
        (RANDOM() * 360)::INT,
        (30 + RANDOM() * 50)::INT,
        70,
        CASE WHEN temp < 2 AND RANDOM() < 0.2 THEN 5 + RANDOM() * 5 ELSE 0 END,
        frz,
        NOW()
      );
    END LOOP;
  END LOOP;
END $$;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

SELECT COUNT(*) as total_rows FROM elevation_forecasts WHERE resort_id = '9d5906f9-245c-43b5-802d-b3707bf21841';
