-- Forecast Snapshots Table
-- Stores daily snapshots of forecasts for validation

CREATE TABLE IF NOT EXISTS forecast_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id TEXT NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  forecast_date DATE NOT NULL,
  
  -- Base elevation data
  base_elevation INTEGER NOT NULL,
  base_temperature REAL,
  base_snowfall REAL,
  base_precipitation REAL,
  base_wind_speed REAL,
  base_wind_gust REAL,
  base_wind_direction INTEGER,
  base_freezing_level INTEGER,
  base_humidity INTEGER,
  base_cloud_cover INTEGER,
  
  -- Mid elevation data
  mid_elevation INTEGER NOT NULL,
  mid_temperature REAL,
  mid_snowfall REAL,
  mid_precipitation REAL,
  mid_wind_speed REAL,
  mid_wind_gust REAL,
  mid_wind_direction INTEGER,
  mid_freezing_level INTEGER,
  mid_humidity INTEGER,
  mid_cloud_cover INTEGER,
  
  -- Summit elevation data
  summit_elevation INTEGER NOT NULL,
  summit_temperature REAL,
  summit_snowfall REAL,
  summit_precipitation REAL,
  summit_wind_speed REAL,
  summit_wind_gust REAL,
  summit_wind_direction INTEGER,
  summit_freezing_level INTEGER,
  summit_humidity INTEGER,
  summit_cloud_cover INTEGER,
  
  -- Storm crossing
  storm_crossing_score REAL,
  storm_crossing_category TEXT,
  storm_crossing_explanation TEXT,
  
  -- Confidence
  confidence_score REAL,
  confidence_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT unique_snapshot UNIQUE (resort_id, snapshot_date, forecast_date)
);

CREATE INDEX idx_snapshots_resort_date ON forecast_snapshots(resort_id, forecast_date);
CREATE INDEX idx_snapshots_created ON forecast_snapshots(created_at DESC);

-- Validation Events Table
-- Stores actual observations to compare against forecasts

CREATE TABLE IF NOT EXISTS validation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id TEXT NOT NULL,
  event_date DATE NOT NULL,
  snapshot_id UUID REFERENCES forecast_snapshots(id),
  
  -- Forecasted values
  forecasted_base_snow REAL,
  forecasted_mid_snow REAL,
  forecasted_summit_snow REAL,
  
  -- Observed values
  observed_base_snow REAL,
  observed_mid_snow REAL,
  observed_summit_snow REAL,
  
  -- Observation metadata
  observation_type TEXT NOT NULL, -- 'webcam', 'weather-station', 'user-report', 'resort-report'
  observation_source TEXT NOT NULL,
  observation_notes TEXT,
  observation_photos TEXT[], -- Array of photo URLs
  
  -- Accuracy metrics
  base_error REAL,
  mid_error REAL,
  summit_error REAL,
  overall_mae REAL,
  
  -- Validation metadata
  validated_by TEXT,
  validated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_validation UNIQUE (resort_id, event_date, snapshot_id)
);

CREATE INDEX idx_validations_resort_date ON validation_events(resort_id, event_date);
CREATE INDEX idx_validations_snapshot ON validation_events(snapshot_id);
CREATE INDEX idx_validations_created ON validation_events(created_at DESC);

-- Accuracy Metrics Table (Materialized view / cache)
-- Pre-calculated accuracy metrics for different periods

CREATE TABLE IF NOT EXISTS accuracy_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id TEXT NOT NULL,
  period TEXT NOT NULL, -- 'week', 'month', 'season', 'all-time'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Overall metrics
  total_forecasts INTEGER NOT NULL,
  validated_forecasts INTEGER NOT NULL,
  
  -- Snowfall accuracy
  snowfall_mae REAL,
  snowfall_rmse REAL,
  snowfall_bias REAL,
  
  -- By elevation
  base_accuracy REAL,
  mid_accuracy REAL,
  summit_accuracy REAL,
  
  -- Storm crossing accuracy
  storm_crossing_accuracy REAL,
  
  -- Confidence calibration
  confidence_calibration REAL,
  
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_metric UNIQUE (resort_id, period, start_date, end_date)
);

CREATE INDEX idx_metrics_resort_period ON accuracy_metrics(resort_id, period);
CREATE INDEX idx_metrics_calculated ON accuracy_metrics(calculated_at DESC);

-- Comments
COMMENT ON TABLE forecast_snapshots IS 'Daily snapshots of forecasts for validation and ML training';
COMMENT ON TABLE validation_events IS 'Actual observations compared against forecast snapshots';
COMMENT ON TABLE accuracy_metrics IS 'Pre-calculated accuracy metrics for performance';

COMMENT ON COLUMN forecast_snapshots.snapshot_date IS 'When the snapshot was taken (usually 6am daily)';
COMMENT ON COLUMN forecast_snapshots.forecast_date IS 'The date being forecasted';
COMMENT ON COLUMN validation_events.observation_type IS 'Source type: webcam, weather-station, user-report, resort-report';
COMMENT ON COLUMN accuracy_metrics.snowfall_mae IS 'Mean Absolute Error in cm';
COMMENT ON COLUMN accuracy_metrics.snowfall_bias IS 'Positive = over-forecast, Negative = under-forecast';
