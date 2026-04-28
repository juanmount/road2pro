-- Add reliability column to observations table
ALTER TABLE observations 
ADD COLUMN IF NOT EXISTS reliability VARCHAR(10) DEFAULT 'medium';

-- Add comment
COMMENT ON COLUMN observations.reliability IS 'Reliability of the observation: high, medium, or low';
