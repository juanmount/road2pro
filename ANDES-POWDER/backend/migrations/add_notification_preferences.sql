-- Add notification preferences columns to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS snow_alerts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS storm_alerts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS wind_alerts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS min_snowfall_cm INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS require_high_confidence BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_wind_speed_kmh INTEGER DEFAULT 70,
ADD COLUMN IF NOT EXISTS favorite_resorts TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS all_resorts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS advance_notice_days INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '22:00',
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '08:00';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_notifications 
ON user_preferences(snow_alerts, storm_alerts, wind_alerts);

-- Comment on columns
COMMENT ON COLUMN user_preferences.snow_alerts IS 'Enable snow alerts';
COMMENT ON COLUMN user_preferences.storm_alerts IS 'Enable storm alerts';
COMMENT ON COLUMN user_preferences.wind_alerts IS 'Enable wind alerts';
COMMENT ON COLUMN user_preferences.min_snowfall_cm IS 'Minimum snowfall in cm to trigger alert';
COMMENT ON COLUMN user_preferences.require_high_confidence IS 'Only alert if confidence score is high';
COMMENT ON COLUMN user_preferences.min_wind_speed_kmh IS 'Minimum wind speed in km/h to trigger alert';
COMMENT ON COLUMN user_preferences.favorite_resorts IS 'Array of resort IDs for targeted alerts';
COMMENT ON COLUMN user_preferences.all_resorts IS 'If true, alert for all resorts, ignore favorites';
COMMENT ON COLUMN user_preferences.advance_notice_days IS 'How many days in advance to send alerts (1-7)';
COMMENT ON COLUMN user_preferences.quiet_hours_enabled IS 'Enable quiet hours (no notifications)';
COMMENT ON COLUMN user_preferences.quiet_hours_start IS 'Quiet hours start time';
COMMENT ON COLUMN user_preferences.quiet_hours_end IS 'Quiet hours end time';
