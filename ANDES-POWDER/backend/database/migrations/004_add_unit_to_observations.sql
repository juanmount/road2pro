-- Add unit column to observations table
-- Stores the unit of measurement for the observation value

ALTER TABLE observations 
ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT '°C';

-- Add comment
COMMENT ON COLUMN observations.unit IS 'Unit of measurement (°C, km/h, %, mm, etc)';
