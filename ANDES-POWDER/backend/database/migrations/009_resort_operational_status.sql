-- Migration 009: Resort operational status (lifts/slopes open counts + detail)
CREATE TABLE IF NOT EXISTS resort_operational_status (
  resort_id          UUID PRIMARY KEY REFERENCES resorts(id) ON DELETE CASCADE,
  lifts_open         INTEGER,
  lifts_total        INTEGER,
  runs_open_km       NUMERIC(6,2),
  runs_total_km      NUMERIC(6,2),
  snow_depth_base_cm INTEGER,
  snow_depth_summit_cm INTEGER,
  resort_open        BOOLEAN NOT NULL DEFAULT false,
  lifts_detail       JSONB,
  scraped_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
