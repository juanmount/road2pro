-- Resort Operational Status
-- Stores real-time lift & slope open counts scraped from skiresort.info
-- Run once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS resort_operational_status (
  id              SERIAL PRIMARY KEY,
  resort_id       UUID NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  lifts_open      INTEGER,
  lifts_total     INTEGER,
  runs_open_km    NUMERIC(6,1),
  runs_total_km   NUMERIC(6,1),
  snow_depth_base_cm    INTEGER,
  snow_depth_summit_cm  INTEGER,
  resort_open     BOOLEAN DEFAULT false,
  source          VARCHAR(64) DEFAULT 'skiresort.info',
  scraped_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS resort_operational_status_resort_id_idx
  ON resort_operational_status(resort_id);

CREATE INDEX IF NOT EXISTS resort_operational_status_scraped_at_idx
  ON resort_operational_status(scraped_at DESC);

COMMENT ON TABLE resort_operational_status IS
  'Real-time lift/slope status scraped from skiresort.info every 2 hours';
