-- Add ride_type column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ride_type TEXT CHECK (ride_type IN ('ski', 'snowboard'));

-- Create index for ride_type
CREATE INDEX IF NOT EXISTS idx_users_ride_type ON users(ride_type);
