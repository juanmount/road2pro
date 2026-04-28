-- Complete Migration for Push Notifications
-- This updates existing tables without losing data

-- ============================================
-- PART 1: Migrate push_tokens table
-- ============================================

-- Add missing columns to push_tokens
DO $$ 
BEGIN
  -- Add active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'push_tokens' AND column_name = 'active'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN active BOOLEAN DEFAULT true;
  END IF;

  -- Add updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'push_tokens' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- Create indexes for push_tokens
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(active);
CREATE INDEX IF NOT EXISTS idx_push_tokens_updated_at ON push_tokens(updated_at);

-- ============================================
-- PART 2: Migrate user_preferences table
-- ============================================

-- Add all missing columns to user_preferences
DO $$ 
BEGIN
  -- Alert toggles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'snow_alerts') THEN
    ALTER TABLE user_preferences ADD COLUMN snow_alerts BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'storm_alerts') THEN
    ALTER TABLE user_preferences ADD COLUMN storm_alerts BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'wind_alerts') THEN
    ALTER TABLE user_preferences ADD COLUMN wind_alerts BOOLEAN DEFAULT true;
  END IF;

  -- Snow alert settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'min_snowfall_cm') THEN
    ALTER TABLE user_preferences ADD COLUMN min_snowfall_cm INTEGER DEFAULT 10;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'require_high_confidence') THEN
    ALTER TABLE user_preferences ADD COLUMN require_high_confidence BOOLEAN DEFAULT false;
  END IF;

  -- Wind alert settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'min_wind_speed_kmh') THEN
    ALTER TABLE user_preferences ADD COLUMN min_wind_speed_kmh INTEGER DEFAULT 70;
  END IF;

  -- Resort filters
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'favorite_resorts') THEN
    ALTER TABLE user_preferences ADD COLUMN favorite_resorts TEXT[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'all_resorts') THEN
    ALTER TABLE user_preferences ADD COLUMN all_resorts BOOLEAN DEFAULT true;
  END IF;

  -- Timing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'advance_notice_days') THEN
    ALTER TABLE user_preferences ADD COLUMN advance_notice_days INTEGER DEFAULT 3;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'quiet_hours_enabled') THEN
    ALTER TABLE user_preferences ADD COLUMN quiet_hours_enabled BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'quiet_hours_start') THEN
    ALTER TABLE user_preferences ADD COLUMN quiet_hours_start TIME DEFAULT '22:00';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'quiet_hours_end') THEN
    ALTER TABLE user_preferences ADD COLUMN quiet_hours_end TIME DEFAULT '08:00';
  END IF;

  -- Timestamps
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'updated_at') THEN
    ALTER TABLE user_preferences ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- Create index for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================
-- PART 3: Create/Update Triggers
-- ============================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for push_tokens
DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for user_preferences
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 4: Create users table if not exists
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  firebase_uid VARCHAR(255) UNIQUE,
  email VARCHAR(255),
  display_name VARCHAR(255),
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- PART 5: Set default values for existing rows
-- ============================================

-- Update existing push_tokens
UPDATE push_tokens SET active = true WHERE active IS NULL;
UPDATE push_tokens SET updated_at = created_at WHERE updated_at IS NULL;

-- Update existing user_preferences with defaults
UPDATE user_preferences SET 
  snow_alerts = COALESCE(snow_alerts, true),
  storm_alerts = COALESCE(storm_alerts, true),
  wind_alerts = COALESCE(wind_alerts, true),
  min_snowfall_cm = COALESCE(min_snowfall_cm, 10),
  require_high_confidence = COALESCE(require_high_confidence, false),
  min_wind_speed_kmh = COALESCE(min_wind_speed_kmh, 70),
  favorite_resorts = COALESCE(favorite_resorts, '{}'),
  all_resorts = COALESCE(all_resorts, true),
  advance_notice_days = COALESCE(advance_notice_days, 3),
  quiet_hours_enabled = COALESCE(quiet_hours_enabled, false),
  quiet_hours_start = COALESCE(quiet_hours_start, '22:00'::TIME),
  quiet_hours_end = COALESCE(quiet_hours_end, '08:00'::TIME),
  updated_at = COALESCE(updated_at, created_at)
WHERE id IS NOT NULL;

-- ============================================
-- PART 6: Add comments
-- ============================================

COMMENT ON TABLE push_tokens IS 'Stores Expo push notification tokens for users';
COMMENT ON TABLE user_preferences IS 'Stores notification preferences for each user';
COMMENT ON COLUMN user_preferences.min_snowfall_cm IS 'Minimum snowfall in cm to trigger alert';
COMMENT ON COLUMN user_preferences.min_wind_speed_kmh IS 'Minimum wind speed in km/h to trigger alert';
COMMENT ON COLUMN user_preferences.advance_notice_days IS 'How many days in advance to send alerts (1-7)';

-- ============================================
-- Success message
-- ============================================

SELECT 
  'Migration completed successfully!' as status,
  (SELECT COUNT(*) FROM push_tokens) as push_tokens_count,
  (SELECT COUNT(*) FROM user_preferences) as user_preferences_count,
  (SELECT COUNT(*) FROM users) as users_count;
