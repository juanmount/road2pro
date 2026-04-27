-- Forecast Snapshots Table
-- Stores daily snapshots of forecasts to track changes over time

CREATE TABLE IF NOT EXISTS forecast_snapshots (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  resort_id VARCHAR(36) NOT NULL,
  elevation_band VARCHAR(20) NOT NULL,
  forecast_date DATE NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  snowfall_cm DECIMAL(5,2) DEFAULT 0,
  precipitation_mm DECIMAL(5,2) DEFAULT 0,
  max_temp_c DECIMAL(4,1),
  min_temp_c DECIMAL(4,1),
  max_wind_kmh INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(resort_id, elevation_band, forecast_date, snapshot_date)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_forecast_snapshots_resort ON forecast_snapshots(resort_id);
CREATE INDEX IF NOT EXISTS idx_forecast_snapshots_dates ON forecast_snapshots(forecast_date, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_forecast_snapshots_created ON forecast_snapshots(created_at);

-- Add comment
COMMENT ON TABLE forecast_snapshots IS 'Daily snapshots of forecasts to track prediction changes over time';
