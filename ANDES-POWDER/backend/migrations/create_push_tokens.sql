-- Create push_tokens table to store user push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  token TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- Create user_preferences table for notification settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  favorite_resort_id UUID REFERENCES resorts(id),
  notifications_enabled BOOLEAN DEFAULT true,
  powder_alerts_enabled BOOLEAN DEFAULT true,
  wind_alerts_enabled BOOLEAN DEFAULT true,
  best_time_alerts_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on user_id and favorite_resort_id
CREATE INDEX IF NOT EXISTS idx_user_prefs_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prefs_resort_id ON user_preferences(favorite_resort_id);
