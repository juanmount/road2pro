-- Add unit column to observations table
-- Stores the unit of measurement for the observation value

ALTER TABLE observations 
ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT '°C';

-- Add comment
ALTER TABLE observations MODIFY COLUMN unit VARCHAR(20) DEFAULT '°C' COMMENT 'Unit of measurement (°C, km/h, %, mm, etc)';
