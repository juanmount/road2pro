-- Forecast Validation System
-- Stores comparisons between Andes Powder and competitor forecasts

CREATE TABLE IF NOT EXISTS forecast_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Forecast metadata
  forecast_date DATE NOT NULL,
  target_date DATE NOT NULL, -- Date being forecasted
  resort_id UUID REFERENCES resorts(id),
  resort_name TEXT NOT NULL,
  
  -- Andes Powder forecast
  ap_snowfall_base DECIMAL,
  ap_snowfall_mid DECIMAL,
  ap_snowfall_summit DECIMAL,
  ap_wind_base DECIMAL,
  ap_wind_summit DECIMAL,
  ap_freezing_level DECIMAL,
  ap_temp_base DECIMAL,
  ap_temp_summit DECIMAL,
  ap_storm_crossing_score INTEGER,
  
  -- tiempodesur.com forecast
  ts_precipitation DECIMAL,
  ts_freezing_level DECIMAL,
  ts_source_url TEXT,
  
  -- Mountain-Forecast.com forecast
  mf_snowfall_base DECIMAL,
  mf_snowfall_summit DECIMAL,
  mf_wind DECIMAL,
  mf_temp DECIMAL,
  mf_source_url TEXT,
  
  -- Actual observed conditions (filled post-event)
  actual_snowfall_base DECIMAL,
  actual_snowfall_summit DECIMAL,
  actual_wind DECIMAL,
  actual_temp DECIMAL,
  actual_source TEXT, -- 'webcam', 'greenguru', 'resort_report', etc.
  actual_notes TEXT,
  validated_at TIMESTAMP WITH TIME ZONE,
  
  -- Accuracy metrics (calculated after validation)
  ap_snowfall_accuracy DECIMAL, -- % accuracy (100 = perfect)
  ts_snowfall_accuracy DECIMAL,
  mf_snowfall_accuracy DECIMAL,
  ap_wind_accuracy DECIMAL,
  ap_temp_accuracy DECIMAL,
  
  -- Winner determination
  winner TEXT, -- 'andes_powder', 'tiempodesur', 'mountain_forecast'
  
  UNIQUE(forecast_date, target_date, resort_id)
);

-- Accuracy summary by resort and time period
CREATE TABLE IF NOT EXISTS validation_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resort_id UUID REFERENCES resorts(id),
  resort_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Andes Powder stats
  ap_total_forecasts INTEGER DEFAULT 0,
  ap_avg_snowfall_accuracy DECIMAL,
  ap_avg_wind_accuracy DECIMAL,
  ap_wins INTEGER DEFAULT 0,
  
  -- tiempodesur stats
  ts_total_forecasts INTEGER DEFAULT 0,
  ts_avg_snowfall_accuracy DECIMAL,
  ts_wins INTEGER DEFAULT 0,
  
  -- Mountain-Forecast stats
  mf_total_forecasts INTEGER DEFAULT 0,
  mf_avg_snowfall_accuracy DECIMAL,
  mf_wins INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(resort_id, period_start, period_end)
);

-- Indexes for performance
CREATE INDEX idx_forecast_validations_target_date ON forecast_validations(target_date);
CREATE INDEX idx_forecast_validations_resort ON forecast_validations(resort_id);
CREATE INDEX idx_forecast_validations_validated ON forecast_validations(validated_at);
CREATE INDEX idx_validation_summary_resort ON validation_summary(resort_id);

-- Function to calculate accuracy
CREATE OR REPLACE FUNCTION calculate_forecast_accuracy(
  forecast_value DECIMAL,
  actual_value DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  IF actual_value = 0 THEN
    -- If actual is 0, perfect if forecast is also 0, otherwise 0% accuracy
    RETURN CASE WHEN forecast_value = 0 THEN 100 ELSE 0 END;
  END IF;
  
  -- Calculate percentage error and convert to accuracy
  -- accuracy = 100 - (|forecast - actual| / actual * 100)
  -- Capped at 0 minimum
  RETURN GREATEST(0, 100 - (ABS(forecast_value - actual_value) / actual_value * 100));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update validation summary
CREATE OR REPLACE FUNCTION update_validation_summary(
  p_resort_id UUID,
  p_period_start DATE,
  p_period_end DATE
) RETURNS void AS $$
DECLARE
  v_resort_name TEXT;
BEGIN
  -- Get resort name
  SELECT name INTO v_resort_name FROM resorts WHERE id = p_resort_id;
  
  -- Insert or update summary
  INSERT INTO validation_summary (
    resort_id,
    resort_name,
    period_start,
    period_end,
    ap_total_forecasts,
    ap_avg_snowfall_accuracy,
    ap_avg_wind_accuracy,
    ap_wins,
    ts_total_forecasts,
    ts_avg_snowfall_accuracy,
    ts_wins,
    mf_total_forecasts,
    mf_avg_snowfall_accuracy,
    mf_wins
  )
  SELECT
    p_resort_id,
    v_resort_name,
    p_period_start,
    p_period_end,
    COUNT(*) FILTER (WHERE ap_snowfall_summit IS NOT NULL),
    AVG(ap_snowfall_accuracy) FILTER (WHERE ap_snowfall_accuracy IS NOT NULL),
    AVG(ap_wind_accuracy) FILTER (WHERE ap_wind_accuracy IS NOT NULL),
    COUNT(*) FILTER (WHERE winner = 'andes_powder'),
    COUNT(*) FILTER (WHERE ts_precipitation IS NOT NULL),
    AVG(ts_snowfall_accuracy) FILTER (WHERE ts_snowfall_accuracy IS NOT NULL),
    COUNT(*) FILTER (WHERE winner = 'tiempodesur'),
    COUNT(*) FILTER (WHERE mf_snowfall_summit IS NOT NULL),
    AVG(mf_snowfall_accuracy) FILTER (WHERE mf_snowfall_accuracy IS NOT NULL),
    COUNT(*) FILTER (WHERE winner = 'mountain_forecast')
  FROM forecast_validations
  WHERE resort_id = p_resort_id
    AND target_date BETWEEN p_period_start AND p_period_end
    AND validated_at IS NOT NULL
  ON CONFLICT (resort_id, period_start, period_end)
  DO UPDATE SET
    ap_total_forecasts = EXCLUDED.ap_total_forecasts,
    ap_avg_snowfall_accuracy = EXCLUDED.ap_avg_snowfall_accuracy,
    ap_avg_wind_accuracy = EXCLUDED.ap_avg_wind_accuracy,
    ap_wins = EXCLUDED.ap_wins,
    ts_total_forecasts = EXCLUDED.ts_total_forecasts,
    ts_avg_snowfall_accuracy = EXCLUDED.ts_avg_snowfall_accuracy,
    ts_wins = EXCLUDED.ts_wins,
    mf_total_forecasts = EXCLUDED.mf_total_forecasts,
    mf_avg_snowfall_accuracy = EXCLUDED.mf_avg_snowfall_accuracy,
    mf_wins = EXCLUDED.mf_wins,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE forecast_validations IS 'Stores forecast comparisons between Andes Powder and competitors for validation';
COMMENT ON TABLE validation_summary IS 'Aggregated accuracy statistics by resort and time period';
