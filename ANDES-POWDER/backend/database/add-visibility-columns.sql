-- Add visibility and cloud layer columns to elevation_forecasts table

ALTER TABLE elevation_forecasts 
ADD COLUMN IF NOT EXISTS cloud_cover_low NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS cloud_cover_mid NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS cloud_cover_high NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS visibility VARCHAR(20),
ADD COLUMN IF NOT EXISTS visibility_meters INTEGER,
ADD COLUMN IF NOT EXISTS in_cloud BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cloud_base_meters INTEGER;

-- Add comments
COMMENT ON COLUMN elevation_forecasts.cloud_cover_low IS 'Low cloud cover percentage (0-2000m)';
COMMENT ON COLUMN elevation_forecasts.cloud_cover_mid IS 'Mid cloud cover percentage (2000-6000m)';
COMMENT ON COLUMN elevation_forecasts.cloud_cover_high IS 'High cloud cover percentage (6000m+)';
COMMENT ON COLUMN elevation_forecasts.visibility IS 'Visibility level: excellent, good, moderate, poor, whiteout';
COMMENT ON COLUMN elevation_forecasts.visibility_meters IS 'Visibility distance in meters';
COMMENT ON COLUMN elevation_forecasts.in_cloud IS 'Whether this elevation is inside a cloud';
COMMENT ON COLUMN elevation_forecasts.cloud_base_meters IS 'Cloud base height in meters';
