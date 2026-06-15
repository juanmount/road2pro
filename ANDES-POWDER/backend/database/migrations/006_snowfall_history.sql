CREATE TABLE IF NOT EXISTS snowfall_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resort_id UUID NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  elevation_band VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  snowfall_cm DECIMAL(7,2) NOT NULL DEFAULT 0,
  temperature_avg_c DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT snowfall_history_band_check CHECK (elevation_band IN ('base','mid','summit')),
  CONSTRAINT snowfall_history_unique UNIQUE (resort_id, elevation_band, date)
);

CREATE INDEX IF NOT EXISTS idx_snowfall_history_resort_date ON snowfall_history(resort_id, date);
CREATE INDEX IF NOT EXISTS idx_snowfall_history_band_date ON snowfall_history(elevation_band, date);
