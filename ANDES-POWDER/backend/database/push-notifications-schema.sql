-- Push Notifications Schema for Andes Powder
-- Tables for managing push tokens and user notification preferences

-- Table: push_tokens
-- Stores Expo push tokens for each user/device
CREATE TABLE IF NOT EXISTS push_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(active);
CREATE INDEX IF NOT EXISTS idx_push_tokens_updated_at ON push_tokens(updated_at);

-- Table: user_preferences
-- Stores notification preferences for each user
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- Alert toggles
  snow_alerts BOOLEAN DEFAULT true,
  storm_alerts BOOLEAN DEFAULT true,
  wind_alerts BOOLEAN DEFAULT true,
  
  -- Snow alert settings
  min_snowfall_cm INTEGER DEFAULT 10,
  require_high_confidence BOOLEAN DEFAULT false,
  
  -- Wind alert settings
  min_wind_speed_kmh INTEGER DEFAULT 70,
  
  -- Resort filters
  favorite_resorts TEXT[] DEFAULT '{}',
  all_resorts BOOLEAN DEFAULT true,
  
  -- Timing
  advance_notice_days INTEGER DEFAULT 3,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Table: users (if not exists)
-- Basic user table for authentication
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing
-- INSERT INTO users (id, email, display_name) VALUES 
--   ('test-user-1', 'test@andespowder.com', 'Test User')
-- ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE push_tokens IS 'Stores Expo push notification tokens for users';
COMMENT ON TABLE user_preferences IS 'Stores notification preferences for each user';
COMMENT ON COLUMN user_preferences.min_snowfall_cm IS 'Minimum snowfall in cm to trigger alert';
COMMENT ON COLUMN user_preferences.min_wind_speed_kmh IS 'Minimum wind speed in km/h to trigger alert';
COMMENT ON COLUMN user_preferences.advance_notice_days IS 'How many days in advance to send alerts (1-7)';
