-- Add lifts_detail JSONB column to store individual lift statuses per resort
-- Run once in Supabase SQL Editor

ALTER TABLE resort_operational_status
  ADD COLUMN IF NOT EXISTS lifts_detail JSONB DEFAULT NULL;

COMMENT ON COLUMN resort_operational_status.lifts_detail IS
  'Individual lift statuses grouped by sector: [{sector, lifts: [{name, status}]}]
   status values: open | conditional | closed | unknown
   Sources: ws.busplus.com.ar API (CA/CH/LH) and cerrobayo.com.ar scrape (CB)';
